import { z } from "zod";
import type { DocumentType } from "@/lib/config/documents";
import { frSaleFile } from "@/lib/i18n/sections/saleFile";
import {
  ANALYSIS_LIMITS,
  PUBLIC_FACT_KEYS,
  readPublicFacts,
  redactContacts,
  storedDocumentAnalysis,
  type DocumentAnalysis,
  type PublicFactKey,
  type PublicFacts,
} from "@/lib/validations/document-analysis";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { saleFile: frSaleFile } as const;

const t = fr.saleFile.analysis.publicFacts;

// What the screens show of an analysis (L3-05), pure and unit-tested: where
// the analysis of a document stands for its seller, the summary a buyer
// reads, the public facts as lines. Whatever the database returns is checked
// again: a field of another kind shows nothing, a public fact is a value of
// its closed list or a number, written here in our own words.

export type AnalysisStatus = "pending" | "done" | "failed";

export const ANALYSIS_ERRORS = [
  "not_started",
  "unavailable",
  "invalid",
  "refused",
  "unreadable",
  "too_long",
  "too_heavy",
  "limit",
] as const;
export type AnalysisError = (typeof ANALYSIS_ERRORS)[number];

/** Sending the same file again would change nothing: no « Relancer l'analyse ». */
const NO_RETRY: readonly AnalysisError[] = ["too_long", "too_heavy", "limit"];

/** After this long without an analysis, the tab says it is not available for now. */
export const PENDING_DELAY_MS = 30 * 60_000;

export type SellerAnalysis = {
  status: AnalysisStatus;
  /** Why there is no analysis, when it failed (or was never started). */
  error: AnalysisError | null;
  analysis: DocumentAnalysis | null;
  /** The seller shows its public facts on the listing. */
  publicFactsShown: boolean;
  /** « Relancer l'analyse » left today for this document. */
  retriesLeft: number;
  /** Waiting for longer than an analysis takes: « indisponible pour le moment ». */
  delayed: boolean;
};

type AnalysisRow = {
  status: string;
  error: string | null;
  analysis: unknown;
  public_facts_approved_at: string | null;
  retries_left: number | null;
  waiting_since?: string | null;
};

/** A row of document_analyses as the tab of the seller shows it. */
export function sellerAnalysis(
  row: AnalysisRow,
  type: DocumentType,
  now: Date = new Date(),
): SellerAnalysis {
  const analysis = row.status === "done" ? storedDocumentAnalysis(row.analysis, type) : null;
  // Done, but not an analysis we can show: said as a failure, never half shown.
  const status: AnalysisStatus =
    row.status === "done"
      ? analysis
        ? "done"
        : "failed"
      : row.status === "failed"
        ? "failed"
        : "pending";
  const error: AnalysisError | null =
    status !== "failed"
      ? null
      : row.status === "done"
        ? "invalid"
        : (ANALYSIS_ERRORS.find((candidate) => candidate === row.error) ?? "unavailable");
  const since = row.waiting_since ? Date.parse(row.waiting_since) : Number.NaN;
  return {
    status,
    error,
    analysis,
    publicFactsShown: analysis !== null && row.public_facts_approved_at !== null,
    retriesLeft:
      row.status === "failed" && error !== null && !NO_RETRY.includes(error)
        ? Math.max(0, row.retries_left ?? 0)
        : 0,
    delayed:
      status === "pending" && !Number.isNaN(since) && now.getTime() - since > PENDING_DELAY_MS,
  };
}

export type PublicFactLine = { key: PublicFactKey; label: string; value: string };

const number = (value: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

/** A public fact in our words: its value is one of a closed list, or a number with its unit. */
function factText(facts: PublicFacts, key: PublicFactKey): string | null {
  switch (key) {
    case "amiante":
    case "plomb":
    case "termites": {
      const value = facts[key];
      return value ? t.values.presence[value] : null;
    }
    case "electricite":
    case "gaz":
    case "assainissement": {
      const value = facts[key];
      return value ? t.values.anomalies[value] : null;
    }
    case "surface_carrez":
      return facts.surface_carrez === undefined
        ? null
        : t.values.surface(number(facts.surface_carrez));
    case "travaux_votes":
      return facts.travaux_votes ? t.values.yesNo[facts.travaux_votes] : null;
    case "destination":
      return facts.destination ? t.values.destination[facts.destination] : null;
    case "charges":
    case "fonds_travaux": {
      const value = facts[key];
      return value
        ? t.values.recurring(number(value.montant), t.values.periods[value.periode])
        : null;
    }
    case "taxe_fonciere":
      return facts.taxe_fonciere
        ? t.values.yearly(number(facts.taxe_fonciere.montant), facts.taxe_fonciere.annee)
        : null;
  }
}

/**
 * The public facts of a document as lines, in the order of the list. The
 * facts are checked again here, whatever was stored: the keys its type may
 * give, each a value of its kind; never a text of the model.
 */
export function publicFactLines(type: DocumentType, facts: unknown): PublicFactLine[] {
  const read = readPublicFacts(type, facts);
  return PUBLIC_FACT_KEYS.flatMap((key) => {
    const value = factText(read, key);
    return value === null ? [] : [{ key, label: t.labels[key], value }];
  });
}

const words = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => redactContacts(value));

const buyerSummarySchema = z.object({
  summary_buyer: z.string().trim().min(1).max(ANALYSIS_LIMITS.summary),
  document_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
  key_facts: z
    .array(z.object({ label: words(ANALYSIS_LIMITS.label), value: words(ANALYSIS_LIMITS.value) }))
    .max(ANALYSIS_LIMITS.facts)
    .catch([]),
  points_of_attention: z
    .array(z.object({ level: z.enum(["info", "attention"]), text: words(ANALYSIS_LIMITS.point) }))
    .max(ANALYSIS_LIMITS.points)
    .catch([]),
});

export type BuyerSummary = {
  summary: string;
  date: string | null;
  keyFacts: { label: string; value: string }[];
  points: { level: "info" | "attention"; text: string }[];
};

/**
 * A row of shared_document_summaries as a buyer reads it; null when it holds
 * no summary. Its texts are words of the model: a link, an email or a phone
 * number is taken out again here.
 */
export function buyerSummary(row: unknown): BuyerSummary | null {
  const parsed = buyerSummarySchema.safeParse(row);
  if (!parsed.success) return null;
  return {
    summary: redactContacts(parsed.data.summary_buyer),
    date: parsed.data.document_date,
    keyFacts: parsed.data.key_facts,
    points: parsed.data.points_of_attention,
  };
}
