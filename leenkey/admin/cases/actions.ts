"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { caseCommandSchema } from "@/lib/validations/admin";
import { moderationError, type ModerationError } from "../moderation";

// The changes of a case from its sheet (L1-30c, SPEC-V2 section 17): its
// status, who follows it, an internal note, a task of Leenkey of the sale.
// The SQL functions check is_admin(), refuse a change that already happened
// (a stale tab) and write audit_log. No service role.

export type CaseCommandResult = { ok: true } | { ok: false; error: ModerationError };

export async function changeCase(input: unknown): Promise<CaseCommandResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = caseCommandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const command = parsed.data;
  const supabase = await createClient();
  const { error } =
    command.action === "status"
      ? await supabase.rpc("admin_case_set_status", {
          p_case: command.caseId,
          p_status: command.status,
        })
      : command.action === "follow"
        ? await supabase.rpc("admin_case_assign", {
            p_case: command.caseId,
            // Only one's own name, or nobody: the team has one admin today.
            p_assignee: command.follow ? profile.id : undefined,
          })
        : command.action === "note"
          ? await supabase.rpc("admin_case_add_note", {
              p_case: command.caseId,
              p_body: command.body,
            })
          : await supabase.rpc("admin_case_task_set", {
              p_case: command.caseId,
              p_task: command.taskId,
              p_done: command.done,
            });
  if (error) {
    console.error("[admin] case change failed", {
      user_id: profile.id,
      entity_id: command.caseId,
      action: command.action,
      code: error.code,
    });
    return { ok: false, error: moderationError(error.code) };
  }
  revalidatePath("/admin/dossiers");
  revalidatePath(`/admin/dossiers/${command.caseId}`);
  revalidatePath("/admin");
  return { ok: true };
}
