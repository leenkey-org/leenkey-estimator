import type { IdentityDocumentType, IdentityStatus } from "@/lib/validations/identity";

// Where the identity of a buyer stands, from the rows of identity_documents
// they read (DECISIONS.md 2026-11-23), as plain values (unit-tested). The
// database decides (identity_status_of, visit_book): this is what the screens
// of the buyer show.

/** A row of identity_documents as its buyer reads it. */
export type IdentityDocumentRow = {
  id: string;
  type: IdentityDocumentType;
  mime_type: string;
  created_at: string;
  checked_at: string | null;
  refused_at: string | null;
  refusal_reason: string | null;
  withdrawn_at: string | null;
  file_deleted_at: string | null;
};

/** The document of the buyer: never its file, read by its own route. */
export type IdentityDocumentView = {
  id: string;
  type: IdentityDocumentType;
  isPdf: boolean;
  createdAt: string;
  /** When Leenkey checked it, null while it waits. */
  checkedAt: string | null;
  /** Its file is deleted once the team has checked it. */
  fileDeleted: boolean;
};

export type BuyerIdentity = {
  status: IdentityStatus;
  /** The document that waits for its check or is checked; null without one. */
  document: IdentityDocumentView | null;
  /** The reason of the team when the last document deposited was refused. */
  refusalReason: string | null;
};

export const NO_IDENTITY: BuyerIdentity = {
  status: "not_provided",
  document: null,
  refusalReason: null,
};

/** From the documents of a buyer, the most recent first. */
export function identityOf(rows: readonly IdentityDocumentRow[]): BuyerIdentity {
  const current = rows.find((row) => !row.refused_at && !row.withdrawn_at);
  if (current) {
    return {
      status: current.checked_at ? "checked" : "provided",
      document: {
        id: current.id,
        type: current.type,
        isPdf: current.mime_type === "application/pdf",
        createdAt: current.created_at,
        checkedAt: current.checked_at,
        fileDeleted: current.file_deleted_at !== null,
      },
      refusalReason: null,
    };
  }
  // Said only while the refused document is the last one deposited: a
  // document withdrawn since then starts again from nothing.
  const last = rows[0];
  return {
    status: "not_provided",
    document: null,
    refusalReason: last?.refused_at ? last.refusal_reason : null,
  };
}

/** A document deposited, checked or not: what the booking of a visit asks for. */
export function identityDeposited(status: IdentityStatus): boolean {
  return status !== "not_provided";
}
