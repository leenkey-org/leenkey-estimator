"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import {
  SALE_FILE_EXTENSIONS,
  SALE_FILE_MAX_BYTES,
  type DocumentType,
  type PropertyType,
} from "@/lib/config/documents";
import { createClient } from "@/lib/supabase/server";
import {
  answerRequestSchema,
  exemptionSchema,
  fileDocumentSchema,
  shareSchema,
  uploadStartSchema,
} from "@/lib/validations/sale-file";
import { buildChecklist, sniffSaleFile } from "./checklist";

// What a seller and a buyer do with the sale file (L3-04, SPEC-V2 15). A
// document weighs up to 20 MB, more than a server action carries: the
// browser sends the file to the private bucket through a signed upload URL
// made here with the session of the seller (the storage policy decides: its
// property, editable), then asks to file it. Before filing, the first bytes
// of the file are read: a file that is not what its name says is taken back.
// The database decides the rest (document_add, document_share…). No service
// role.

const BUCKET = "documents";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Client = Awaited<ReturnType<typeof createClient>>;

const revalidateFile = (propertyId: string) =>
  revalidatePath(`/vendeur/biens/${propertyId}/documents`);

export type UploadStartResult =
  | { ok: true; data: { path: string; uploadUrl: string } }
  | { ok: false; error: "auth" | "invalid" | "too_heavy" | "unavailable" };

/** A place in the bucket for one file, and the URL the browser sends it to (valid 2 hours, once). */
export async function startDocumentUpload(input: unknown): Promise<UploadStartResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = uploadStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (parsed.data.sizeBytes > SALE_FILE_MAX_BYTES) return { ok: false, error: "too_heavy" };
  // Never the name of the file chosen: a new one (CLAUDE.md section 11).
  const path = `${parsed.data.propertyId}/sale/${randomUUID()}.${SALE_FILE_EXTENSIONS[parsed.data.mimeType]}`;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[sale-file] upload not opened", {
      user_id: profile.id,
      entity_id: parsed.data.propertyId,
      error: error?.name,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: { path, uploadUrl: data.signedUrl } };
}

async function removeFile(supabase: Client, path: string, userId: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error("[sale-file] file not removed", { user_id: userId, error: error.name });
}

/** What the file really is, from its first bytes, read through a short signed URL. */
async function fileKind(supabase: Client, path: string) {
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (signed.error || !signed.data) return null;
  try {
    const response = await fetch(signed.data.signedUrl, {
      headers: { Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !response.body) return null;
    // A server that ignores the range sends the whole file: the first chunk is enough.
    const reader = response.body.getReader();
    const { value } = await reader.read();
    await reader.cancel().catch(() => {});
    return value ? sniffSaleFile(value) : null;
  } catch {
    return null;
  }
}

/** Declares the notary file complete once every mandatory document is filed or « Non concerné ». */
async function declareIfComplete(supabase: Client, propertyId: string, userId: string) {
  const [property, documents, exemptions] = await Promise.all([
    supabase.from("properties").select("type").eq("id", propertyId).maybeSingle(),
    supabase
      .from("documents")
      .select("id, type, title, created_at")
      .eq("property_id", propertyId)
      .is("deleted_at", null),
    supabase.from("document_exemptions").select("type, reason").eq("property_id", propertyId),
  ]);
  if (property.error || documents.error || exemptions.error) return;
  const checklist = buildChecklist(
    (property.data?.type ?? null) as PropertyType | null,
    (documents.data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      createdAt: row.created_at,
    })),
    exemptions.data ?? [],
  );
  if (!checklist.complete) return;
  const { error } = await supabase.rpc("sale_declare_event", {
    p_property_id: propertyId,
    p_event: "documents.notary_ready",
  });
  if (error) {
    console.error("[sale-file] notary file not declared", {
      user_id: userId,
      entity_id: propertyId,
      code: error.code,
    });
  }
}

export type FileDocumentResult =
  | { ok: true; data: { documentId: string } }
  | { ok: false; error: "auth" | "invalid" | "unsupported" | "too_heavy" | "unavailable" };

/** Files a document whose file the browser just sent. */
export async function fileDocument(input: unknown): Promise<FileDocumentResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = fileDocumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, path, type, title } = parsed.data;
  if (!path.startsWith(`${propertyId}/sale/`)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const kind = await fileKind(supabase, path);
  const expected = Object.entries(SALE_FILE_EXTENSIONS).find(([, extension]) =>
    path.endsWith(`.${extension}`),
  )?.[0];
  if (!kind || kind !== expected) {
    await removeFile(supabase, path, profile.id);
    return { ok: false, error: "unsupported" };
  }
  const { data, error } = await supabase.rpc("document_add", {
    p_property: propertyId,
    p_type: type,
    p_title: title,
    p_storage_path: path,
  });
  if (error) {
    // Not filed: the file is taken back (the storage policy allows it).
    await removeFile(supabase, path, profile.id);
    if (error.code === "23514") {
      return {
        ok: false,
        error: error.message.includes("size_bytes") ? "too_heavy" : "unsupported",
      };
    }
    if (error.code !== "42501" && error.code !== "22023") {
      console.error("[sale-file] document not filed", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  await declareIfComplete(supabase, propertyId, profile.id);
  revalidateFile(propertyId);
  return { ok: true, data: { documentId: data } };
}

export type SimpleResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "invalid" | "unavailable" };

/** Removes a document from the sale file (soft delete): buyers no longer read it. */
export async function removeDocument(
  propertyId: string,
  documentId: string,
): Promise<SimpleResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(propertyId) || !UUID.test(documentId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("property_id", propertyId)
    .select("id");
  if (error || data.length === 0) {
    if (error) {
      console.error("[sale-file] document not removed", {
        user_id: profile.id,
        entity_id: documentId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateFile(propertyId);
  return { ok: true, data: null };
}

/** « Non concerné », with its reason; said again, the reason changes. */
export async function setExemption(input: unknown): Promise<SimpleResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = exemptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, type, reason } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_exemptions")
    .upsert({ property_id: propertyId, type, reason }, { onConflict: "property_id,type" });
  if (error) {
    if (error.code !== "42501") {
      console.error("[sale-file] exemption not saved", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  await declareIfComplete(supabase, propertyId, profile.id);
  revalidateFile(propertyId);
  return { ok: true, data: null };
}

export async function clearExemption(
  propertyId: string,
  type: DocumentType,
): Promise<SimpleResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(propertyId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_exemptions")
    .delete()
    .eq("property_id", propertyId)
    .eq("type", type);
  if (error) {
    console.error("[sale-file] exemption not cleared", {
      user_id: profile.id,
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidateFile(propertyId);
  return { ok: true, data: null };
}

export type ShareResult =
  | { ok: true; data: { shared: number } }
  | { ok: false; error: "auth" | "invalid" | "noRelation" | "unavailable" };

/** Shares documents of a property with a buyer in relation with it (one, or several at once). */
export async function shareDocuments(input: unknown): Promise<ShareResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = shareSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("document_share", {
    p_documents: parsed.data.documentIds,
    p_buyer: parsed.data.buyerId,
  });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "noRelation" };
    if (error.code !== "42501") {
      console.error("[sale-file] documents not shared", {
        user_id: profile.id,
        entity_id: parsed.data.propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateFile(parsed.data.propertyId);
  return { ok: true, data: { shared: data } };
}

export async function unshareDocument(
  propertyId: string,
  documentId: string,
  buyerId: string,
): Promise<SimpleResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (![propertyId, documentId, buyerId].every((id) => UUID.test(id))) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("document_unshare", {
    p_document: documentId,
    p_buyer: buyerId,
  });
  if (error) {
    if (error.code !== "42501") {
      console.error("[sale-file] share not removed", {
        user_id: profile.id,
        entity_id: documentId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateFile(propertyId);
  return { ok: true, data: null };
}

export type AnswerRequestResult =
  | { ok: true; data: { shared: number } }
  | { ok: false; error: "auth" | "invalid" | "answered" | "unavailable" };

/** « Accorder » shares every document of the property with the buyer; « Refuser » shares nothing. */
export async function answerAccessRequest(input: unknown): Promise<AnswerRequestResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = answerRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("document_access_answer", {
    p_request: parsed.data.requestId,
    p_grant: parsed.data.grant,
  });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "answered" };
    if (error.code !== "42501") {
      console.error("[sale-file] request not answered", {
        user_id: profile.id,
        entity_id: parsed.data.requestId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateFile(parsed.data.propertyId);
  return { ok: true, data: { shared: data } };
}

export type RequestAccessResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "invalid" | "contactFirst" | "unavailable" };

/** A buyer in relation with a property asks its seller for the documents. */
export async function requestDocumentAccess(propertyId: string): Promise<RequestAccessResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(propertyId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("document_access_request", { p_property: propertyId });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "contactFirst" };
    if (error.code !== "42501") {
      console.error("[sale-file] access not requested", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/messages", "layout");
  revalidatePath("/acquereur/documents");
  return { ok: true, data: null };
}
