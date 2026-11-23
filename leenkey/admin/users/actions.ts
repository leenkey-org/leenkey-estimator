"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import type { EmailDelivery } from "@/core/notifications/email";
import { createClient } from "@/lib/supabase/server";
import {
  accountDecisionSchema,
  financingCheckSchema,
  financingFileDeleteSchema,
  identityCheckSchema,
  identityFileDeleteSchema,
  identityRefuseSchema,
} from "@/lib/validations/admin";
import { moderationError, type ModerationError } from "../moderation";
import { emailAccountSuspended } from "./emails";

// Suspension of an account by the back office (L1-30a, SPEC-V2 section 17):
// the SQL functions of L1-05 (admin_suspend_user, admin_unsuspend_user)
// check is_admin(), refuse an admin suspending themselves and write
// audit_log. A suspended account may still sign in, but no longer writes
// (is_active_user() in the RLS). The motive goes to its owner by email. No
// service role.

export type AccountDecisionResult =
  | { ok: true; data: { suspended: boolean; email: EmailDelivery | null } }
  | { ok: false; error: ModerationError };

export async function decideAccount(input: unknown): Promise<AccountDecisionResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = accountDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const command = parsed.data;
  const supabase = await createClient();
  const { error } =
    command.action === "suspend"
      ? await supabase.rpc("admin_suspend_user", {
          p_profile_id: command.profileId,
          p_reason: command.reason,
        })
      : await supabase.rpc("admin_unsuspend_user", { p_profile_id: command.profileId });
  if (error) {
    console.error("[admin] account decision failed", {
      user_id: profile.id,
      entity_id: command.profileId,
      action: command.action,
      code: error.code,
    });
    // 22023: a motive too short (Zod refuses it before) or the admin themselves.
    return { ok: false, error: moderationError(error.code) };
  }

  const email =
    command.action === "suspend"
      ? await emailAccountSuspended({ profileId: command.profileId, reason: command.reason })
      : null;
  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${command.profileId}`);
  revalidatePath("/admin");
  return { ok: true, data: { suspended: command.action === "suspend", email } };
}

// The check of a proof of financing (L2-02, SPEC-V2 13): the team has looked
// at the document (its presence, its type, its date, its apparent consistency
// with what is declared) and marks it as checked. financing_document_check
// verifies is_admin(), sets « Justificatif vérifié » with its date and writes
// audit_log; the buyer is told by the database (financing.checked, bell and
// email). Never « validé ». The file is then deleted (answer of Cédric of
// 2026-11-19): its storage object with the session of the admin (the storage
// policy allows it for a checked document only), then the document says so
// (financing_document_file_removed); the status, the type and the date of
// the check stay. A deletion that fails is logged and said to the admin: the
// check itself is recorded. No service role.

export type FinancingCheckResult =
  | { ok: true; data: { checked: true; fileDeleted: boolean } }
  | { ok: false; error: ModerationError };

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Deletes the file of a checked proof; false when it could not be (logged).
 * May be called again: an object already gone is no error, and the document
 * is marked, and written in the audit log, once
 * (financing_document_file_removed). A proof not checked keeps its file: the
 * storage policy leaves the object, and the database then refuses the mark.
 */
async function deleteCheckedFile(
  supabase: Client,
  documentId: string,
  adminId: string,
): Promise<boolean> {
  const found = await supabase
    .from("financing_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  const path = found.data?.storage_path;
  if (found.error || !path) {
    console.error("[admin] checked financing file not found", {
      user_id: adminId,
      entity_id: documentId,
      code: found.error?.code,
    });
    return false;
  }
  const removed = await supabase.storage.from("documents").remove([path]);
  if (removed.error) {
    console.error("[admin] checked financing file not deleted", {
      user_id: adminId,
      entity_id: documentId,
      error: removed.error.name,
    });
    return false;
  }
  // Refused by the database while the object is still stored.
  const marked = await supabase.rpc("financing_document_file_removed", {
    p_document_id: documentId,
  });
  if (marked.error) {
    console.error("[admin] checked financing file not marked deleted", {
      user_id: adminId,
      entity_id: documentId,
      code: marked.error.code,
    });
    return false;
  }
  return true;
}

export async function checkFinancingDocument(input: unknown): Promise<FinancingCheckResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = financingCheckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("financing_document_check", {
    p_document_id: command.documentId,
    p_note: command.note,
  });
  if (error) {
    console.error("[admin] financing check failed", {
      user_id: profile.id,
      entity_id: command.documentId,
      code: error.code,
    });
    return { ok: false, error: moderationError(error.code) };
  }
  const fileDeleted = await deleteCheckedFile(supabase, command.documentId, profile.id);
  revalidatePath(`/admin/utilisateurs/${command.profileId}`);
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return { ok: true, data: { checked: true, fileDeleted } };
}

// « Supprimer le fichier » (2026-11-21): the file of a proof already checked
// that is still stored, because its deletion failed after the check or
// because it was checked before files were deleted. The same deletion as
// after a check, with the session of the admin; written in audit_log by the
// database (financing.file_deleted). No service role.

export type FinancingFileDeleteResult =
  | { ok: true; data: { fileDeleted: true } }
  | { ok: false; error: ModerationError };

export async function deleteCheckedFinancingFile(
  input: unknown,
): Promise<FinancingFileDeleteResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = financingFileDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const deleted = await deleteCheckedFile(supabase, command.documentId, profile.id);
  revalidatePath(`/admin/utilisateurs/${command.profileId}`);
  if (!deleted) return { ok: false, error: "unavailable" };
  return { ok: true, data: { fileDeleted: true } };
}

// The identity document of a buyer (DECISIONS.md 2026-11-23): the team has
// looked at it and marks it as checked (identity_document_check), or refuses
// it with a reason its buyer reads (identity_document_refuse). Both verify
// is_admin() and write audit_log; the buyer is told by the database
// (identity.checked, identity.refused: bell and email). Never « validé ».
// The file is then deleted, as the one of a proof of financing: its storage
// object with the session of the admin (the storage policy allows it for a
// document checked, refused or withdrawn only), then the document says so
// (identity_document_file_removed). A deletion that fails is logged and said
// to the admin: the decision itself is recorded. No service role; nothing is
// read from the document.

export type IdentityDecisionResult =
  | { ok: true; data: { fileDeleted: boolean } }
  | { ok: false; error: ModerationError };

/**
 * Deletes the file of an identity document that reached its end; false when
 * it could not be (logged). May be called again: an object already gone is no
 * error, and the document is marked, and written in the audit log, once.
 */
async function deleteIdentityFile(
  supabase: Client,
  documentId: string,
  adminId: string,
): Promise<boolean> {
  const found = await supabase
    .from("identity_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  const path = found.data?.storage_path;
  if (found.error || !path) {
    console.error("[admin] identity file not found", {
      user_id: adminId,
      entity_id: documentId,
      code: found.error?.code,
    });
    return false;
  }
  const removed = await supabase.storage.from("documents").remove([path]);
  if (removed.error) {
    console.error("[admin] identity file not deleted", {
      user_id: adminId,
      entity_id: documentId,
      error: removed.error.name,
    });
    return false;
  }
  // Refused by the database while the object is still stored.
  const marked = await supabase.rpc("identity_document_file_removed", {
    p_document_id: documentId,
  });
  if (marked.error) {
    console.error("[admin] identity file not marked deleted", {
      user_id: adminId,
      entity_id: documentId,
      code: marked.error.code,
    });
    return false;
  }
  return true;
}

function revalidateIdentity(profileId: string) {
  revalidatePath(`/admin/utilisateurs/${profileId}`);
  revalidatePath("/admin");
}

export async function checkIdentityDocument(input: unknown): Promise<IdentityDecisionResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = identityCheckSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("identity_document_check", {
    p_document_id: command.documentId,
    p_note: command.note,
  });
  if (error) {
    console.error("[admin] identity check failed", {
      user_id: profile.id,
      entity_id: command.documentId,
      code: error.code,
    });
    return { ok: false, error: moderationError(error.code) };
  }
  const fileDeleted = await deleteIdentityFile(supabase, command.documentId, profile.id);
  revalidateIdentity(command.profileId);
  return { ok: true, data: { fileDeleted } };
}

export async function refuseIdentityDocument(input: unknown): Promise<IdentityDecisionResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = identityRefuseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("identity_document_refuse", {
    p_document_id: command.documentId,
    p_reason: command.reason,
    p_note: command.note,
  });
  if (error) {
    console.error("[admin] identity refusal failed", {
      user_id: profile.id,
      entity_id: command.documentId,
      code: error.code,
    });
    return { ok: false, error: moderationError(error.code) };
  }
  const fileDeleted = await deleteIdentityFile(supabase, command.documentId, profile.id);
  revalidateIdentity(command.profileId);
  return { ok: true, data: { fileDeleted } };
}

export type IdentityFileDeleteResult =
  | { ok: true; data: { fileDeleted: true } }
  | { ok: false; error: ModerationError };

/** « Supprimer le fichier »: the deletion that follows a decision or a withdrawal, tried again. */
export async function deleteEndedIdentityFile(input: unknown): Promise<IdentityFileDeleteResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = identityFileDeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const command = parsed.data;
  const supabase = await createClient();
  const deleted = await deleteIdentityFile(supabase, command.documentId, profile.id);
  revalidatePath(`/admin/utilisateurs/${command.profileId}`);
  if (!deleted) return { ok: false, error: "unavailable" };
  return { ok: true, data: { fileDeleted: true } };
}
