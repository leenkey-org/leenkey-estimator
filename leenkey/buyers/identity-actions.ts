"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { readProofFile } from "@/core/documents/proof-file";
import { createClient } from "@/lib/supabase/server";
import {
  IDENTITY_FILE_MAX_BYTES,
  IDENTITY_UPLOAD_MAX_BYTES,
  identityDocumentSchema,
  type IdentityDocumentField,
} from "@/lib/validations/identity";
import type { IdentityDocumentView } from "./identity-status";

// The identity document asked before a visit (DECISIONS.md 2026-11-23): the
// buyer sends a PDF or an image with its type. The file is read from its
// content, an image converted (core/documents/proof-file.ts), put in the
// private bucket `documents` with the session of the buyer (storage
// policies), then declared by identity_document_add: « Pièce d'identité
// déposée ». Nothing is read from the document. The file of a document
// withdrawn or replaced is removed at once; before each deposit, every file
// of the folder of the buyer that is not the one of the document that waits
// goes (an upload never declared, a removal that failed): none stays behind,
// none fills the folder. What a failure leaves is taken by the scheduled task
// (leenkey/buyers/identity-sweep.ts). No service role; never sent to the
// assistant.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "documents";

export type IdentityDocumentError =
  | "auth"
  | "invalid"
  | "unsupported"
  | "too_heavy"
  | "checked"
  | "unavailable";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * The documents of the buyer that reached their end and are not said without
 * a file yet say so, when their file is gone (identity_document_file_removed
 * refuses while it is still stored). A failure is logged, never shown.
 */
async function markFilesRemoved(supabase: Client, userId: string) {
  const ended = await supabase
    .from("identity_documents")
    .select("id")
    .eq("buyer_id", userId)
    .is("file_deleted_at", null)
    .or("checked_at.not.is.null,refused_at.not.is.null,withdrawn_at.not.is.null");
  for (const document of ended.data ?? []) {
    const marked = await supabase.rpc("identity_document_file_removed", {
      p_document_id: document.id,
    });
    if (marked.error) {
      console.error("[buyers] identity file not marked removed", {
        user_id: userId,
        entity_id: document.id,
        code: marked.error.code,
      });
    }
  }
}

/**
 * Removes every file of the identity folder of the buyer but `keep` (the file
 * of the document that waits for its check, which the storage policy protects
 * anyway), then marks the documents whose file is gone. A failure is logged,
 * never shown: the scheduled task removes what is left.
 */
async function clearFiles(supabase: Client, userId: string, keep: string | null) {
  const folder = `${userId}/identity`;
  const listed = await supabase.storage.from(BUCKET).list(folder, { limit: 100 });
  if (listed.error) {
    console.error("[buyers] identity folder not listed", {
      user_id: userId,
      error: listed.error.name,
    });
    return;
  }
  const stray = listed.data.map((file) => `${folder}/${file.name}`).filter((path) => path !== keep);
  if (stray.length > 0) {
    const removed = await supabase.storage.from(BUCKET).remove(stray);
    if (removed.error) {
      console.error("[buyers] identity files not removed", {
        user_id: userId,
        error: removed.error.name,
      });
    }
  }
  await markFilesRemoved(supabase, userId);
}

function revalidateIdentity() {
  revalidatePath("/acquereur", "layout");
  // The booking of a visit asks for a document deposited.
  revalidatePath("/visites", "layout");
}

export type AddIdentityDocumentResult =
  | { ok: true; data: { document: IdentityDocumentView } }
  | { ok: false; error: IdentityDocumentError; fields?: IdentityDocumentField[] };

export async function addIdentityDocument(form: FormData): Promise<AddIdentityDocumentResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = identityDocumentSchema.safeParse({ type: form.get("type") });
  const file = form.get("file");
  const missing: IdentityDocumentField[] = parsed.success ? [] : ["type"];
  if (!(file instanceof File) || file.size === 0) missing.push("file");
  if (!parsed.success || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "invalid", fields: missing };
  }
  if (file.size > IDENTITY_UPLOAD_MAX_BYTES) return { ok: false, error: "too_heavy" };
  const read = await readProofFile(Buffer.from(await file.arrayBuffer()), IDENTITY_FILE_MAX_BYTES);
  if (!read.ok) return { ok: false, error: read.error };

  const supabase = await createClient();
  // The document that waits for its check, which the new one replaces.
  const waiting = await supabase
    .from("identity_documents")
    .select("storage_path")
    .eq("buyer_id", profile.id)
    .is("checked_at", null)
    .is("refused_at", null)
    .is("withdrawn_at", null)
    .maybeSingle();
  if (waiting.error) {
    console.error("[buyers] identity document read failed", {
      user_id: profile.id,
      code: waiting.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // Nothing else stays in the folder: a file never declared, a file whose
  // removal failed. Five files at most are accepted there (identity_files_room).
  await clearFiles(supabase, profile.id, waiting.data?.storage_path ?? null);

  // Never the name of the file chosen: a new one (CLAUDE.md section 11).
  const path = `${profile.id}/identity/${randomUUID()}.${read.data.extension}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, read.data.data, { contentType: read.data.mimeType, upsert: false });
  if (upload.error) {
    console.error("[buyers] identity file upload failed", {
      user_id: profile.id,
      error: upload.error.name,
    });
    return { ok: false, error: "unavailable" };
  }
  const added = await supabase.rpc("identity_document_add", {
    p_type: parsed.data.type,
    p_storage_path: path,
    p_mime_type: read.data.mimeType,
    p_size_bytes: read.data.data.length,
  });
  if (added.error) {
    console.error("[buyers] identity document failed", {
      user_id: profile.id,
      code: added.error.code,
    });
    // The file is not declared: taken back (the storage policy allows it).
    await clearFiles(supabase, profile.id, waiting.data?.storage_path ?? null);
    return {
      ok: false,
      error: added.error.message.includes("already checked") ? "checked" : "unavailable",
    };
  }
  // The document replaced is withdrawn: its file goes, the new one stays.
  await clearFiles(supabase, profile.id, path);
  revalidateIdentity();
  return {
    ok: true,
    data: {
      document: {
        id: added.data,
        type: parsed.data.type,
        isPdf: read.data.kind === "pdf",
        createdAt: new Date().toISOString(),
        checkedAt: null,
        fileDeleted: false,
      },
    },
  };
}

export type RemoveIdentityDocumentResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "invalid" | "unavailable" };

/** The buyer withdraws the document that waits for its check: its file is removed. */
export async function removeIdentityDocument(
  documentId: unknown,
): Promise<RemoveIdentityDocumentResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (typeof documentId !== "string" || !UUID.test(documentId)) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const removed = await supabase.rpc("identity_document_remove", { p_document_id: documentId });
  if (removed.error) {
    console.error("[buyers] identity document removal failed", {
      user_id: profile.id,
      entity_id: documentId,
      code: removed.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // No document waits any more: the whole folder goes.
  await clearFiles(supabase, profile.id, null);
  revalidateIdentity();
  return { ok: true, data: null };
}
