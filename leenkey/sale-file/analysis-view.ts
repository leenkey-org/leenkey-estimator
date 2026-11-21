import { z } from "zod";
import type { DocumentType } from "@/lib/config/documents";
import {
  ANALYSIS_LIMITS,
  PUBLIC_FACT_KEYS,
  PUBLIC_FACTS_BY_TYPE,
  storedDocumentAnalysis,
  type DocumentAnalysis,
  type PublicFactKey,
} from "@/lib/validations/document-analysis";

// What the screens show of an analysis (L3-05), pure and unit-tested: where
// the analysis of a document stands for its seller, the summary a buyer
// reads, the public facts as lines. Whatever the database returns is checked
// again: a field of another kind shows nothing.

export type AnalysisStatus = "pending" | "done" | "failed";

export const ANALYSIS_ERRORS = [
  "unavailable",
  "invalid",
  "refused",
  "unreadable",
  "too_long",
  "too_heavy",
  "limit",
] as const;
export type AnalysisError = (typeof ANALYSIS_ERRORS)[number];

export type SellerAnalysis = {
  status: AnalysisStatus;
  /** Why there is no analysis, when it failed. */
  error: AnalysisError | null;
  analysis: DocumentAnalysis | null;
  /** The seller shows its public facts on the listing. */
  publicFactsShown: boolean;
  /** « Relancer l'analyse » left today for this document. */
  retriesLeft: number;
};

type AnalysisRow = {
  status: string;
  error: string | null;
  analysis: unknown;
  public_facts_approved_at: string | null;
  retries_left: number | null;
};

/** A row of document_analyses as the tab of the seller shows it. */
export function sellerAnalysis(row: AnalysisRow): SellerAnalysis {
  const analysis = row.status === "done" ? storedDocumentAnalysis(row.analysis) : null;
  const error = ANALYSIS_ERRORS.find((candidate) => candidate === row.error) ?? "unavailable";
  // Done, but not an analysis we can show: said as a failure, never half shown.
  const status: AnalysisStatus =
    row.status === "done"
      ? analysis
        ? "done"
        : "failed"
      : row.status === "failed"
        ? "failed"
        : "pending";
  return {
    status,
    error: status === "failed" ? (row.status === "done" ? "invalid" : error) : null,
    analysis,
    publicFactsShown: analysis !== null && row.public_facts_approved_at !== null,
    retriesLeft: row.status === "failed" ? Math.max(0, row.retries_left ?? 0) : 0,
  };
}

export type PublicFactLine = { key: PublicFactKey; value: string };

/**
 * The public facts of a document as lines, in the order of the list: only
 * the keys its type may give, only short texts.
 */
export function publicFactLines(type: DocumentType, facts: unknown): PublicFactLine[] {
  if (typeof facts !== "object" || facts === null || Array.isArray(facts)) return [];
  const allowed = PUBLIC_FACTS_BY_TYPE[type] ?? [];
  const values = facts as Record<string, unknown>;
  return PUBLIC_FACT_KEYS.filter((key) => allowed.includes(key)).flatMap((key) => {
    const value = values[key];
    return typeof value === "string" &&
      value.trim() !== "" &&
      value.length <= ANALYSIS_LIMITS.publicValue
      ? [{ key, value: value.trim() }]
      : [];
  });
}

const buyerSummarySchema = z.object({
  summary_buyer: z.string().trim().min(1).max(ANALYSIS_LIMITS.summary),
  document_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .catch(null),
  key_facts: z
    .array(
      z.object({
        label: z.string().max(ANALYSIS_LIMITS.label),
        value: z.string().max(ANALYSIS_LIMITS.value),
      }),
    )
    .max(ANALYSIS_LIMITS.facts)
    .catch([]),
  points_of_attention: z
    .array(
      z.object({
        level: z.enum(["info", "attention"]),
        text: z.string().max(ANALYSIS_LIMITS.point),
      }),
    )
    .max(ANALYSIS_LIMITS.points)
    .catch([]),
});

export type BuyerSummary = {
  summary: string;
  date: string | null;
  keyFacts: { label: string; value: string }[];
  points: { level: "info" | "attention"; text: string }[];
};

/** A row of shared_document_summaries as a buyer reads it; null when it holds no summary. */
export function buyerSummary(row: unknown): BuyerSummary | null {
  const parsed = buyerSummarySchema.safeParse(row);
  if (!parsed.success) return null;
  return {
    summary: parsed.data.summary_buyer,
    date: parsed.data.document_date,
    keyFacts: parsed.data.key_facts,
    points: parsed.data.points_of_attention,
  };
}
