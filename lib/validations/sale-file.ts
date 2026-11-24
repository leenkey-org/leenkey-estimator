import { z } from "zod";
import { DIAGNOSTIC_TYPES } from "@/lib/config/documents";
import { Constants } from "@/types/database";

// L3-04 (SPEC-V2 15): what a seller and a buyer send about the sale file,
// checked again by the database (document_add, document_share…).

const documentType = z.enum(Constants.public.Enums.document_type);

export const DOCUMENT_TITLE_MAX = 120;
export const EXEMPTION_REASON_MIN = 3;
export const EXEMPTION_REASON_MAX = 300;

export const SALE_FILE_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/sale\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png)$/;

export const uploadStartSchema = z.object({
  propertyId: z.string().uuid(),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z.number().int().positive(),
});

export const fileDocumentSchema = z.object({
  propertyId: z.string().uuid(),
  path: z.string().regex(SALE_FILE_PATH),
  // A DDT is filed with the diagnostics it covers (fileDdtSchema).
  type: documentType.exclude(["ddt"]),
  title: z.string().trim().min(1).max(DOCUMENT_TITLE_MAX),
});

/** The diagnostics a DDT covers: one at least, each once, among the diagnostics. */
const ddtCovers = z
  .array(documentType.refine((type) => DIAGNOSTIC_TYPES.includes(type)))
  .min(1)
  .max(DIAGNOSTIC_TYPES.length)
  .refine((covers) => new Set(covers).size === covers.length);

/** « Déposer mon DDT »: the one file of the diagnostician, and the diagnostics it holds. */
export const fileDdtSchema = z.object({
  propertyId: z.string().uuid(),
  path: z.string().regex(SALE_FILE_PATH),
  covers: ddtCovers,
});

/** « Modifier les diagnostics couverts » of a DDT. */
export const ddtCoverageSchema = z.object({
  propertyId: z.string().uuid(),
  documentId: z.string().uuid(),
  covers: ddtCovers,
});

export const exemptionSchema = z.object({
  propertyId: z.string().uuid(),
  type: documentType,
  reason: z.string().trim().min(EXEMPTION_REASON_MIN).max(EXEMPTION_REASON_MAX),
});

export const shareSchema = z.object({
  propertyId: z.string().uuid(),
  documentIds: z.array(z.string().uuid()).min(1).max(200),
  buyerId: z.string().uuid(),
});

export const answerRequestSchema = z.object({
  propertyId: z.string().uuid(),
  requestId: z.string().uuid(),
  grant: z.boolean(),
});
