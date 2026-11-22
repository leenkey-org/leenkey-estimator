import { z } from "zod";
import { Constants, type Database } from "@/types/database";

// L3-05 (SPEC-V2 15, « Analyse IA »): the analysis of a document of the sale
// file as the model must write it, checked before it is stored: the shape of
// the SPEC, plus what the document is worth as a file (`quality`). Sizes are
// bounded.
//
// The public facts may appear on a listing, read by anyone: none of them is
// a text of the model. Each is a value of a closed list (presence or
// absence, anomalies or none…) or a number with its unit, for a closed list
// of keys per type of document, and is checked again each time it is read.
// The DPE gives none: the listing already shows the classes its seller
// declared, and a second source could contradict them (its number and its
// date are never public anyway, CLAUDE.md section 2).
//
// The texts a buyer reads (summary, facts, points) are words of the model
// about a file of the seller: a link, an email or a phone number found in
// them is taken out, when stored and again when read.

type DocumentType = Database["public"]["Enums"]["document_type"];

export const ANALYSIS_LIMITS = {
  facts: 12,
  points: 8,
  summary: 900,
  label: 80,
  value: 300,
  point: 400,
  note: 200,
} as const;

export const DOCUMENT_QUALITIES = ["ok", "illegible", "incomplete", "wrong_type"] as const;
export type DocumentQuality = (typeof DOCUMENT_QUALITIES)[number];

const presence = z.enum(["presence", "absence"]);
const anomalies = z.enum(["anomalies", "sans_anomalie"]);
const euros = z.number().finite().positive().max(1_000_000);
const recurring = z
  .object({ montant: euros, periode: z.enum(["mois", "trimestre", "an"]) })
  .strict();

/** What each public fact is: a value of a closed list, or a number with its unit. Never a text. */
export const PUBLIC_FACT_SCHEMAS = {
  amiante: presence,
  plomb: presence,
  termites: presence,
  electricite: anomalies,
  gaz: anomalies,
  assainissement: anomalies,
  surface_carrez: z.number().finite().positive().max(10_000),
  travaux_votes: z.enum(["oui", "non"]),
  destination: z.enum(["habitation", "mixte", "professionnelle"]),
  charges: recurring,
  fonds_travaux: recurring,
  taxe_fonciere: z.object({ montant: euros, annee: z.number().int().min(1990).max(2100) }).strict(),
} as const;

export type PublicFactKey = keyof typeof PUBLIC_FACT_SCHEMAS;
export const PUBLIC_FACT_KEYS = Object.keys(PUBLIC_FACT_SCHEMAS) as PublicFactKey[];
export type PublicFacts = {
  [Key in PublicFactKey]?: z.infer<(typeof PUBLIC_FACT_SCHEMAS)[Key]>;
};

/** The public facts a type of document may give; none for a type not listed (the DPE among them). */
export const PUBLIC_FACTS_BY_TYPE: Partial<Record<DocumentType, readonly PublicFactKey[]>> = {
  amiante: ["amiante"],
  plomb: ["plomb"],
  termites: ["termites"],
  electricite: ["electricite"],
  gaz: ["gaz"],
  assainissement: ["assainissement"],
  carrez: ["surface_carrez"],
  pv_ag: ["travaux_votes"],
  reglement_copro: ["destination"],
  appel_charges: ["charges", "fonds_travaux"],
  taxe_fonciere: ["taxe_fonciere"],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The public facts of a document of this type, from whatever is given (the
 * answer of the model, a row of the database): the keys its type may give,
 * each with a value of its kind; anything else is left out. Run when an
 * analysis is stored and again each time its facts are shown.
 */
export function readPublicFacts(type: DocumentType, value: unknown): PublicFacts {
  if (!isRecord(value)) return {};
  const facts: Record<string, unknown> = {};
  for (const key of PUBLIC_FACTS_BY_TYPE[type] ?? []) {
    const parsed = PUBLIC_FACT_SCHEMAS[key].safeParse(value[key]);
    if (parsed.success) facts[key] = parsed.data;
  }
  return facts as PublicFacts;
}

const CONTACTS: readonly RegExp[] = [
  /(?:https?:\/\/|www\.)\S+/gi,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
  /(?:\+33\s*|\b0)[1-9](?:[\s.-]*\d{2}){4}\b/g,
  /\b[\p{L}\d-]+(?:\.[\p{L}\d-]+)*\.(?:fr|com|net|org|eu|io|info|immo|biz)\b(?:\/\S*)?/giu,
];
const REDACTED = "[coordonnées retirées]";

/** A text of the model without the links, the emails and the phone numbers it may carry. */
export function redactContacts(text: string): string {
  return CONTACTS.reduce((kept, pattern) => kept.replace(pattern, REDACTED), text);
}

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
  public_facts: z.object(PUBLIC_FACT_SCHEMAS).partial().strict(),
  quality: z.enum(DOCUMENT_QUALITIES),
  quality_note: line(ANALYSIS_LIMITS.note).nullable(),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

/** A text of the model as it is kept: no contact detail, its length bounded. */
const text = (value: unknown, max: number): unknown =>
  typeof value === "string"
    ? Array.from(redactContacts(value.trim())).slice(0, max).join("")
    : value;

/**
 * The object of an answer of the model: the first « { » to the last « } »
 * (a model may wrap its JSON in a code fence, or say a word before it).
 */
function jsonObject(answer: string): unknown {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(answer.slice(start, end + 1));
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
 * with a value of their kind are kept; none for a document « à vérifier ».
 */
export function parseDocumentAnalysis(
  answer: string,
  declared: DocumentType,
): DocumentAnalysis | null {
  const raw = jsonObject(answer);
  if (!isRecord(raw)) return null;
  const known: readonly string[] = Constants.public.Enums.document_type;
  const items = (value: unknown, max: number, shape: (item: Record<string, unknown>) => unknown) =>
    Array.isArray(value)
      ? value.slice(0, max).map((item) => (isRecord(item) ? shape(item) : item))
      : value;
  const candidate = {
    type_detected:
      typeof raw.type_detected === "string" && !known.includes(raw.type_detected)
        ? "autre"
        : raw.type_detected,
    date: raw.date === "" || raw.date === undefined ? null : raw.date,
    key_facts: items(raw.key_facts, ANALYSIS_LIMITS.facts, (item) => ({
      label: text(item.label, ANALYSIS_LIMITS.label),
      value: text(item.value, ANALYSIS_LIMITS.value),
    })),
    points_of_attention: items(raw.points_of_attention, ANALYSIS_LIMITS.points, (item) => ({
      level: item.level,
      text: text(item.text, ANALYSIS_LIMITS.point),
    })),
    summary_seller: text(raw.summary_seller, ANALYSIS_LIMITS.summary),
    summary_buyer: text(raw.summary_buyer, ANALYSIS_LIMITS.summary),
    public_facts:
      raw.public_facts === undefined || raw.public_facts === null || isRecord(raw.public_facts)
        ? raw.quality === "ok"
          ? readPublicFacts(declared, raw.public_facts)
          : {}
        : raw.public_facts,
    quality: raw.quality,
    quality_note:
      raw.quality_note === "" || raw.quality_note === undefined
        ? null
        : text(raw.quality_note, ANALYSIS_LIMITS.note),
  };
  const parsed = documentAnalysisSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/**
 * An analysis read back from the database (written by the server) for a
 * document of this type: null when it is not one; its public facts are
 * checked again against the type.
 */
export function storedDocumentAnalysis(
  value: unknown,
  type: DocumentType,
): DocumentAnalysis | null {
  if (!isRecord(value)) return null;
  const parsed = documentAnalysisSchema.safeParse({
    ...value,
    public_facts: value.quality === "ok" ? readPublicFacts(type, value.public_facts) : {},
  });
  return parsed.success ? parsed.data : null;
}
