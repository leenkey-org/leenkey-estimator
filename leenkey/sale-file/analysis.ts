import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  attachmentRequest,
  attachmentTooHeavy,
  generateFromAttachment,
  type AttachmentMediaType,
} from "@/core/ai/attachment";
import {
  createModelMessage,
  describeError,
  isAiConfigured,
  isAiMock,
  type ModelRequest,
} from "@/core/ai/client";
import { toStoredBlocks } from "@/core/ai/conversation";
import type { TextCall } from "@/core/ai/generate";
import { answerRow } from "@/core/ai/log";
import { ATTACHMENT_SETTINGS, MODELS } from "@/core/ai/models";
import { promptFile } from "@/core/ai/prompts";
import { asData } from "@/leenkey/ai/suggestions";
import type { DocumentType } from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import { parseDocumentAnalysis, type DocumentAnalysis } from "@/lib/validations/document-analysis";
import { SALE_FILE_PATH } from "@/lib/validations/sale-file";
import type { Database } from "@/types/database";
import { mockDocumentAnalysis } from "./analysis-mock";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

// The analysis of the documents of a sale file by the assistant (L3-05,
// SPEC-V2 15): a reading aid for the seller and for the buyers a document is
// shared with. A document filed waits in the queue of the database; the
// scheduled task claims it here (two runs never read the same one), reads its
// file in the private bucket and gives it to the model as it is (a PDF or an
// image, read natively: no text is extracted on our side), then records the
// analysis, or why there is none. With the service role: never the seller,
// who could otherwise type an « analysis » that buyers read. One call of
// MODELS.smart per document (a second one when the answer is not the JSON
// asked for), logged with its tokens under the kind 'document_analysis', in
// the name of the owner of the property; it counts for no quota.
//
// Only the sale file is read (public.documents, files under
// {property}/sale/): never a financing document, never an identity document.

/** The service client of the scheduled task (given by its route, never imported here). */
type Admin = SupabaseClient<Database>;
type Claimed = Database["public"]["Functions"]["document_analysis_claim"]["Returns"][number];

const BUCKET = "documents";
/** Documents read together: each one is a file of up to 20 MB held in memory. */
export const ANALYSIS_PARALLEL = 3;
/** Documents analysed by one run at most. */
export const ANALYSIS_RUN_MAX = 12;
/**
 * No new documents after this long in a run: a call lasts 2 minutes at most
 * and may be made twice, so the last ones end before the 5 minutes of the
 * route.
 */
const RUN_BUDGET_MS = 50_000;
const CALL = {
  timeout: ATTACHMENT_SETTINGS.timeoutMs,
  maxRetries: ATTACHMENT_SETTINGS.maxRetries,
} as const;

/** Why a document has no analysis (documents.analysis_error). */
export type AnalysisFailure =
  | "unavailable"
  | "invalid"
  | "refused"
  | "unreadable"
  | "too_long"
  | "too_heavy";

/** The prompt of each type of document (core/ai/prompts/document-analysis/). */
const PROMPTS: Partial<Record<DocumentType, string>> = {
  dpe: "dpe",
  amiante: "diagnostic",
  plomb: "diagnostic",
  termites: "diagnostic",
  electricite: "diagnostic",
  gaz: "diagnostic",
  assainissement: "diagnostic",
  erp: "erp",
  carrez: "carrez",
  pv_ag: "pv_ag",
  reglement_copro: "reglement_copropriete",
  appel_charges: "appel_charges",
  taxe_fonciere: "taxe_fonciere",
  titre_propriete: "titre_propriete",
};

/** The file of the rules of a type of document; `generic` for a type without its own. */
export function analysisPromptName(type: DocumentType): string {
  return PROMPTS[type] ?? "generic";
}

/** The rules of an analysis: those of every document, then those of its type. */
export function analysisSystemPrompt(type: DocumentType): string {
  return [
    promptFile("document-analysis/_common"),
    promptFile(`document-analysis/${analysisPromptName(type)}`),
  ].join("\n\n");
}

const number = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

/**
 * What goes with the file: the type and the title its seller gave, as data;
 * for a Carrez measurement, the surface declared on the listing (SPEC 15: a
 * gap of more than 5 % is pointed out). Never an address, never a name.
 */
export function analysisPrompt(document: {
  type: DocumentType;
  title: string;
  // Generated types declare the columns of a function result as never null.
  surface_m2: number | null;
  carrez_m2: number | null;
}): string {
  const lines = [
    `Type annoncé par le vendeur : ${fr.saleFile.types[document.type]} (${document.type})`,
    `<titre>${asData(document.title, 120)}</titre>`,
  ];
  if (document.type === "carrez") {
    const declared = document.carrez_m2 ?? document.surface_m2;
    if (declared !== null) {
      lines.push(`Surface déclarée dans l'annonce : ${number(Number(declared))} m²`);
    }
  }
  lines.push("Analyse le document joint et rends uniquement l'objet JSON demandé.");
  return lines.join("\n");
}

/** Said to the model when its first answer was not the JSON asked for. */
const AGAIN =
  "Ta réponse précédente n'était pas l'objet JSON demandé. Rends uniquement cet objet JSON, complet, sans texte avant ni après.";

export type AnalysisRun = {
  /** Analyses recorded. */
  analysed: number;
  /** Documents closed without an analysis (a file the model cannot read, an answer not usable). */
  failed: number;
  /** Documents left for a next run (the storage or the model could not be reached). */
  left: number;
  skipped?: "not_configured";
};

export type AnalysisOptions = {
  /** The model (the scripted one of the tests). */
  call?: TextCall;
  now?: () => number;
};

/**
 * Analyses the documents that wait, the new ones first, a few at a time,
 * each claimed just before it is read.
 */
export async function analyzeDocuments(
  admin: Admin,
  options: AnalysisOptions = {},
): Promise<AnalysisRun> {
  const run: AnalysisRun = { analysed: 0, failed: 0, left: 0 };
  if (!options.call && !isAiConfigured()) return { ...run, skipped: "not_configured" };
  const now = options.now ?? Date.now;
  const started = now();

  let taken = 0;
  while (taken < ANALYSIS_RUN_MAX && now() - started <= RUN_BUDGET_MS) {
    const claim = await admin.rpc("document_analysis_claim", {
      p_limit: Math.min(ANALYSIS_PARALLEL, ANALYSIS_RUN_MAX - taken),
    });
    if (claim.error) throw new Error(`document_analysis_claim: ${claim.error.code}`);
    if (claim.data.length === 0) break;
    taken += claim.data.length;
    const outcomes = await Promise.all(
      claim.data.map(async (document) => ({
        document,
        // A document that throws does not take the others of its run with it:
        // its claim ends by itself, a next run takes it again.
        outcome: await analyzeOne(admin, document, options.call).catch((error: unknown) => {
          console.error("[sale-file] analysis failed", {
            entity_id: document.document_id,
            error: describeError(error),
          });
          return null;
        }),
      })),
    );
    for (const { document, outcome } of outcomes) {
      if (outcome === null) run.left += 1;
      else if (await close(admin, document.document_id, outcome)) {
        if (outcome.ok) run.analysed += 1;
        else if (outcome.error === "unavailable") run.left += 1;
        else run.failed += 1;
      } else {
        run.left += 1;
      }
    }
  }
  return run;
}

/** Records the analysis of a document, or why it has none; false when the record failed. */
async function close(admin: Admin, documentId: string, outcome: Outcome): Promise<boolean> {
  // The storage or the model did not answer: tried again by a next run,
  // three times in all. Anything else is not sent again by itself.
  const { error } = outcome.ok
    ? await admin.rpc("document_analysis_record", {
        p_document: documentId,
        p_analysis: outcome.analysis,
      })
    : await admin.rpc("document_analysis_fail", {
        p_document: documentId,
        p_error: outcome.error,
        p_final: outcome.error !== "unavailable",
      });
  if (error) {
    console.error("[sale-file] analysis not recorded", { entity_id: documentId, code: error.code });
    return false;
  }
  return true;
}

type Outcome = { ok: true; analysis: DocumentAnalysis } | { ok: false; error: AnalysisFailure };

const MEDIA_TYPES: readonly AttachmentMediaType[] = ["application/pdf", "image/jpeg", "image/png"];

async function analyzeOne(
  admin: Admin,
  document: Claimed,
  scripted: TextCall | undefined,
): Promise<Outcome> {
  const mediaType = MEDIA_TYPES.find((candidate) => candidate === document.mime_type);
  // A file of the sale file of this property, and nothing else, whatever the row says.
  if (
    !mediaType ||
    !SALE_FILE_PATH.test(document.storage_path) ||
    !document.storage_path.startsWith(`${document.property_id}/sale/`)
  ) {
    return { ok: false, error: "unreadable" };
  }
  if (attachmentTooHeavy(mediaType, document.size_bytes)) return { ok: false, error: "too_heavy" };

  const file = await admin.storage.from(BUCKET).download(document.storage_path);
  if (file.error || !file.data) {
    console.error("[sale-file] document not read for its analysis", {
      entity_id: document.document_id,
      error: file.error?.name,
    });
    return { ok: false, error: "unavailable" };
  }
  const data = new Uint8Array(await file.data.arrayBuffer());
  if (data.byteLength === 0) return { ok: false, error: "unreadable" };
  if (attachmentTooHeavy(mediaType, data.byteLength)) return { ok: false, error: "too_heavy" };

  const call: TextCall =
    scripted ??
    (isAiMock() ? mockDocumentAnalysis(document) : (request) => createModelMessage(request, CALL));
  const prompt = analysisPrompt(document);
  const system = analysisSystemPrompt(document.type);
  const log = {
    userId: document.owner_id,
    entityId: document.document_id,
    kind: "document_analysis",
  };

  // The JSON asked for, or one more call; then no analysis.
  for (const attempt of [0, 1]) {
    const request: ModelRequest = attachmentRequest(
      MODELS.smart,
      system,
      { mediaType, data },
      attempt === 0 ? prompt : `${prompt}\n\n${AGAIN}`,
    );
    const generation = await generateFromAttachment(call, request, log);
    // Its tokens are billed whatever came of it: logged, in the name of the owner.
    if (generation.message) {
      await logAnalysis(admin, document, prompt, generation.message);
    }
    if (!generation.ok) {
      if (generation.error === "empty") continue;
      return {
        ok: false,
        error: generation.error === "rejected" ? "unreadable" : generation.error,
      };
    }
    const analysis = parseDocumentAnalysis(generation.text, document.type);
    if (analysis) return { ok: true, analysis };
    console.error("[sale-file] analysis not usable", {
      entity_id: document.document_id,
      attempt,
    });
  }
  return { ok: false, error: "invalid" };
}

/** The call in the log of the assistant: what went with the file, what was written, its tokens. */
async function logAnalysis(
  admin: Admin,
  document: Claimed,
  prompt: string,
  message: Anthropic.Message,
): Promise<void> {
  const conversation = await admin
    .from("ai_conversations")
    .insert({
      profile_id: document.owner_id,
      context: "seller",
      kind: "document_analysis",
      property_id: document.property_id,
    })
    .select("id")
    .single();
  if (conversation.error) {
    console.error("[sale-file] analysis not logged", {
      entity_id: document.document_id,
      code: conversation.error.code,
    });
    return;
  }
  // One after the other: the log is read in the order of its dates. The file
  // itself is not kept in the log, only what it is.
  const rows: Database["public"]["Tables"]["ai_messages"]["Insert"][] = [
    {
      conversation_id: conversation.data.id,
      role: "user",
      content: {
        type: "request",
        text: `document ${document.document_id} (${document.mime_type}, ${document.size_bytes} octets)\n\n${prompt}`,
      },
    },
    {
      conversation_id: conversation.data.id,
      role: "assistant",
      ...answerRow({
        blocks: toStoredBlocks(message.content),
        stopReason: message.stop_reason,
        model: message.model,
        usage: message.usage,
      }),
    },
  ];
  for (const row of rows) {
    const { error } = await admin.from("ai_messages").insert(row);
    if (error) {
      console.error("[sale-file] analysis not logged", {
        entity_id: document.document_id,
        code: error.code,
      });
      return;
    }
  }
}
