import { z } from "zod";
import { Constants, type Database } from "@/types/database";

// L3-05 (SPEC-V2 15, « Analyse IA »): the analysis of a document of the sale
// file as the model must write it, checked before it is stored: the shape of
// the SPEC, plus what the document is worth as a file (`quality`). Sizes are
// bounded. The public facts are a closed list of keys per type of document:
// what may appear on a listing is never a label the model made up, never a
// date nor a number that would give the address away (the number and the
// date of a DPE are not public, CLAUDE.md section 2).

type DocumentType = Database["public"]["Enums"]["document_type"];

export const ANALYSIS_LIMITS = {
  facts: 12,
  points: 8,
  summary: 900,
  label: 80,
  value: 300,
  point: 400,
  note: 200,
  publicValue: 160,
} as const;

export const DOCUMENT_QUALITIES = ["ok", "illegible", "incomplete", "wrong_type"] as const;
export type DocumentQuality = (typeof DOCUMENT_QUALITIES)[number];

export const PUBLIC_FACT_KEYS = [
  "classe_energie",
  "classe_ges",
  "amiante",
  "plomb",
  "termites",
  "electricite",
  "gaz",
  "assainissement",
  "risques",
  "surface_carrez",
  "travaux_votes",
  "procedures",
  "charges",
  "fonds_travaux",
  "taxe_fonciere",
  "destination",
  "restrictions_usage",
  "servitudes",
  "travaux_realises",
] as const;
export type PublicFactKey = (typeof PUBLIC_FACT_KEYS)[number];

/** The public facts a type of document may give; none for a type not listed. */
export const PUBLIC_FACTS_BY_TYPE: Partial<Record<DocumentType, readonly PublicFactKey[]>> = {
  dpe: ["classe_energie", "classe_ges"],
  amiante: ["amiante"],
  plomb: ["plomb"],
  termites: ["termites"],
  electricite: ["electricite"],
  gaz: ["gaz"],
  assainissement: ["assainissement"],
  erp: ["risques"],
  carrez: ["surface_carrez"],
  pv_ag: ["travaux_votes", "procedures"],
  reglement_copro: ["destination", "restrictions_usage"],
  appel_charges: ["charges", "fonds_travaux"],
  taxe_fonciere: ["taxe_fonciere"],
  titre_propriete: ["servitudes"],
  facture_travaux: ["travaux_realises"],
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

const line = (max: number) => z.string().trim().min(1).max(max);

export const documentAnalysisSchema = z.object({
  type_detected: z.enum(Constants.public.Enums.document_type),
  date: isoDate.nullable(),
  key_facts: z
    .array(z.object({ label: line(ANALYSIS_LIMITS.label), value: line(ANALYSIS_LIMITS.value) }))
    .max(ANALYSIS_LIMITS.facts),
  points_of_attention: z
    .array(z.object({ level: z.enum(["info", "attention"]), text: line(ANALYSIS_LIMITS.point) }))
    .max(ANALYSIS_LIMITS.points),
  summary_seller: line(ANALYSIS_LIMITS.summary),
  summary_buyer: line(ANALYSIS_LIMITS.summary),
  public_facts: z.record(z.enum(PUBLIC_FACT_KEYS), line(ANALYSIS_LIMITS.publicValue)),
  quality: z.enum(DOCUMENT_QUALITIES),
  quality_note: line(ANALYSIS_LIMITS.note).nullable(),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

/**
 * What a public fact never holds, whatever the document says: a link, an
 * email, a phone number, a long number (the 13 digits of a DPE, a cadastral
 * or lot reference), a date written in full (the date of a DPE gives its
 * address through the register).
 */
const NOT_PUBLIC: readonly RegExp[] = [
  /(?:https?:\/\/|www\.)\S+/i,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/,
  /(?:\+33\s*|\b0)[1-9](?:[\s.-]*\d{2}){4}\b/,
  /\d{7,}/,
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/,
  /\b\d{4}-\d{2}-\d{2}\b/,
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cut = (value: unknown, max: number): unknown =>
  typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") : value;

/**
 * The object of an answer of the model: the first « { » to the last « } »
 * (a model may wrap its JSON in a code fence, or say a word before it).
 */
function jsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/**
 * The analysis written by the model, as it is stored; null when it is not one
 * (not JSON, a field missing or of another kind). What is only too long is
 * shortened, never refused: lists to their first entries, texts to their
 * length. A type of document the list does not know reads « autre », an
 * empty date none. Of the public facts, only the keys of the declared type
 * are kept, and only values that may be public.
 */
export function parseDocumentAnalysis(
  text: string,
  declared: DocumentType,
): DocumentAnalysis | null {
  const raw = jsonObject(text);
  if (!isRecord(raw)) return null;
  const known: readonly string[] = Constants.public.Enums.document_type;
  const allowed: readonly string[] = PUBLIC_FACTS_BY_TYPE[declared] ?? [];
  const items = (value: unknown, max: number, shape: (item: Record<string, unknown>) => unknown) =>
    Array.isArray(value)
      ? value.slice(0, max).map((item) => (isRecord(item) ? shape(item) : item))
      : value;
  const facts = isRecord(raw.public_facts)
    ? Object.fromEntries(
        Object.entries(raw.public_facts)
          .map(([key, value]) => [key, cut(value, ANALYSIS_LIMITS.publicValue)] as const)
          .filter(
            ([key, value]) =>
              allowed.includes(key) &&
              typeof value === "string" &&
              value !== "" &&
              !NOT_PUBLIC.some((pattern) => pattern.test(value)),
          ),
      )
    : raw.public_facts;
  const candidate = {
    type_detected:
      typeof raw.type_detected === "string" && !known.includes(raw.type_detected)
        ? "autre"
        : raw.type_detected,
    date: raw.date === "" || raw.date === undefined ? null : raw.date,
    key_facts: items(raw.key_facts, ANALYSIS_LIMITS.facts, (item) => ({
      label: cut(item.label, ANALYSIS_LIMITS.label),
      value: cut(item.value, ANALYSIS_LIMITS.value),
    })),
    points_of_attention: items(raw.points_of_attention, ANALYSIS_LIMITS.points, (item) => ({
      level: item.level,
      text: cut(item.text, ANALYSIS_LIMITS.point),
    })),
    summary_seller: cut(raw.summary_seller, ANALYSIS_LIMITS.summary),
    summary_buyer: cut(raw.summary_buyer, ANALYSIS_LIMITS.summary),
    public_facts: facts,
    quality: raw.quality,
    quality_note:
      raw.quality_note === "" || raw.quality_note === undefined
        ? null
        : cut(raw.quality_note, ANALYSIS_LIMITS.note),
  };
  const parsed = documentAnalysisSchema.safeParse(candidate);
  if (!parsed.success) return null;
  // A document that is not read as what it should be shows nothing on a listing.
  return parsed.data.quality === "ok" ? parsed.data : { ...parsed.data, public_facts: {} };
}

/** An analysis read back from the database (written by the server): null when it is not one. */
export function storedDocumentAnalysis(value: unknown): DocumentAnalysis | null {
  const parsed = documentAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
