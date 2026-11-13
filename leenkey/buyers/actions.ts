"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import { getProfile } from "@/core/auth/session";
import { readProofFile } from "@/core/documents/proof-file";
import { createClient } from "@/lib/supabase/server";
import {
  buyerProfileSchema,
  FINANCING_FILE_MAX_BYTES,
  FINANCING_UPLOAD_MAX_BYTES,
  financingDocumentSchema,
  type BuyerProfileField,
  type FinancingDocumentField,
} from "@/lib/validations/buyer";
import type { FinancingDocumentView } from "./queries";

// The buying project saved by the buyer (L1-25, SPEC-V2 8.9), with their
// session: they may change only the columns of their project (column grants
// of buyer_profiles), never the status, which the database derives
// (buyer_profiles_compute_status). An account that never bought gets the
// role and its row first (profile_add_role): filling a project is buying.

export type SaveBuyerProfileResult =
  | { ok: true; data: { financingStatus: FinancingStatus } }
  | {
      ok: false;
      error: "auth" | "invalid" | "unavailable";
      fields?: BuyerProfileField[];
    };

const cents = (euros: number | null) => (euros === null ? null : euros * 100);

export async function saveBuyerProfile(input: unknown): Promise<SaveBuyerProfileResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = buyerProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0] as BuyerProfileField)),
    ];
    return { ok: false, error: "invalid", fields };
  }
  const supabase = await createClient();
  if (!profile.roles.includes("buyer")) {
    const role = await supabase.rpc("profile_add_role", { p_role: "buyer" });
    if (role.error) {
      console.error("[buyers] buyer role failed", { user_id: profile.id, code: role.error.code });
      return { ok: false, error: "unavailable" };
    }
  }
  const value = parsed.data;
  const { data, error } = await supabase
    .from("buyer_profiles")
    .update({
      project: value.project,
      target_cities: value.targetCities,
      budget_max_cents: cents(value.budgetMaxEuros),
      down_payment_cents: cents(value.downPaymentEuros),
      loan_needed: value.loanNeeded,
      loan_amount_cents: cents(value.loanAmountEuros),
      situation_note: value.situationNote || null,
    })
    .eq("profile_id", profile.id)
    .select("financing_status")
    .maybeSingle();
  if (error || !data) {
    console.error("[buyers] profile save failed", { user_id: profile.id, code: error?.code });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/acquereur", "layout");
  return { ok: true, data: { financingStatus: data.financing_status } };
}

// The proof of financing (L2-02, SPEC-V2 8.9): the buyer sends a PDF or an
// image with its type and its date. The file is read from its content, an
// image converted (core/documents/proof-file.ts), then put in the private
// bucket `documents` with the session of the buyer (storage policies), and
// declared by financing_document_add, which makes it the document in force:
// « Justificatif fourni ». No service role.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "documents";

export type FinancingDocumentError =
  | "auth"
  | "invalid"
  | "unsupported"
  | "too_heavy"
  | "too_many"
  | "unavailable";

export type AddFinancingDocumentResult =
  | { ok: true; data: { document: FinancingDocumentView; financingStatus: FinancingStatus } }
  | { ok: false; error: FinancingDocumentError; fields?: FinancingDocumentField[] };

export async function addFinancingDocument(form: FormData): Promise<AddFinancingDocumentResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = financingDocumentSchema().safeParse({
    type: form.get("type"),
    documentDate: form.get("documentDate"),
  });
  const file = form.get("file");
  const missing: FinancingDocumentField[] = parsed.success
    ? []
    : [...new Set(parsed.error.issues.map((issue) => issue.path[0] as FinancingDocumentField))];
  if (!(file instanceof File) || file.size === 0) missing.push("file");
  if (!parsed.success || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "invalid", fields: missing };
  }
  if (file.size > FINANCING_UPLOAD_MAX_BYTES) return { ok: false, error: "too_heavy" };
  const read = await readProofFile(Buffer.from(await file.arrayBuffer()), FINANCING_FILE_MAX_BYTES);
  if (!read.ok) return { ok: false, error: read.error };

  const supabase = await createClient();
  // Filing a proof is buying: the role and its row first, as for the project.
  if (!profile.roles.includes("buyer")) {
    const role = await supabase.rpc("profile_add_role", { p_role: "buyer" });
    if (role.error) {
      console.error("[buyers] buyer role failed", { user_id: profile.id, code: role.error.code });
      return { ok: false, error: "unavailable" };
    }
  }
  // Never the name of the file chosen: a new one (CLAUDE.md section 11).
  const path = `${profile.id}/financing/${randomUUID()}.${read.data.extension}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, read.data.data, { contentType: read.data.mimeType, upsert: false });
  if (upload.error) {
    console.error("[buyers] financing file upload failed", {
      user_id: profile.id,
      error: upload.error.name,
    });
    return { ok: false, error: "unavailable" };
  }
  const added = await supabase.rpc("financing_document_add", {
    p_type: parsed.data.type,
    p_document_date: parsed.data.documentDate,
    p_storage_path: path,
    p_mime_type: read.data.mimeType,
    p_size_bytes: read.data.data.length,
  });
  if (added.error) {
    // The file is not declared: taken back (the storage policy allows it).
    await supabase.storage.from(BUCKET).remove([path]);
    console.error("[buyers] financing document failed", {
      user_id: profile.id,
      code: added.error.code,
    });
    return {
      ok: false,
      error: added.error.message.includes("too many documents") ? "too_many" : "unavailable",
    };
  }
  revalidatePath("/acquereur", "layout");
  return {
    ok: true,
    data: {
      document: {
        id: added.data,
        type: parsed.data.type,
        documentDate: parsed.data.documentDate,
        isPdf: read.data.kind === "pdf",
        createdAt: new Date().toISOString(),
      },
      financingStatus: "document_provided",
    },
  };
}

export type RemoveFinancingDocumentResult =
  | { ok: true; data: { financingStatus: FinancingStatus } }
  | { ok: false; error: "auth" | "invalid" | "unavailable" };

/** The buyer removes its document: the status goes back to what is declared. */
export async function removeFinancingDocument(
  documentId: unknown,
): Promise<RemoveFinancingDocumentResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (typeof documentId !== "string" || !UUID.test(documentId)) {
    return { ok: false, error: "invalid" };
  }
  const supabase = await createClient();
  const found = await supabase
    .from("financing_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("buyer_id", profile.id)
    .maybeSingle();
  const removed = await supabase.rpc("financing_document_remove", { p_document_id: documentId });
  if (found.error || removed.error) {
    console.error("[buyers] financing document removal failed", {
      user_id: profile.id,
      entity_id: documentId,
      code: removed.error?.code ?? found.error?.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // Its file too, unless an offer sent carries the document (the policy keeps it then).
  if (found.data) await supabase.storage.from(BUCKET).remove([found.data.storage_path]);
  const status = await supabase
    .from("buyer_profiles")
    .select("financing_status")
    .eq("profile_id", profile.id)
    .maybeSingle();
  revalidatePath("/acquereur", "layout");
  return { ok: true, data: { financingStatus: status.data?.financing_status ?? "declared" } };
}
