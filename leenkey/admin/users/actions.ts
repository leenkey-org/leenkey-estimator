"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import type { EmailDelivery } from "@/core/notifications/email";
import { createClient } from "@/lib/supabase/server";
import { accountDecisionSchema } from "@/lib/validations/admin";
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
