import { z } from "zod";
import { FINANCING_FILE_MAX_BYTES, FINANCING_UPLOAD_MAX_BYTES } from "./buyer";

// The identity document of a buyer, asked before a visit (DECISIONS.md
// 2026-11-23): its type among a closed list, a PDF or an image. Nothing is
// read from the document: no number, no date, no name.

export const IDENTITY_DOCUMENT_TYPES = ["carte_identite", "passeport", "titre_sejour"] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

/** Where the identity of a buyer stands (enum identity_status): never « validé ». */
export const IDENTITY_STATUSES = ["not_provided", "provided", "checked"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

/** Kept at most, as the database checks it: the limit of a proof of financing. */
export const IDENTITY_FILE_MAX_BYTES = FINANCING_FILE_MAX_BYTES;
/** Sent at most in one request (the limit of a server action, as a proof of financing). */
export const IDENTITY_UPLOAD_MAX_BYTES = FINANCING_UPLOAD_MAX_BYTES;

export const identityDocumentSchema = z.object({
  type: z.enum(IDENTITY_DOCUMENT_TYPES),
});

export type IdentityDocumentField = "type" | "file";
