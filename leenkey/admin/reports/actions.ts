"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import type { EmailDelivery } from "@/core/notifications/email";
import { createClient } from "@/lib/supabase/server";
import { reportCommandSchema } from "@/lib/validations/admin";
import { moderationError, type ModerationError } from "../moderation";
import { emailUserWarned } from "./emails";

// The decisions on a report (L1-30c, SPEC-V2 section 17): close it with what
// was done, or warn the other party of the conversation (the reason sent by
// email). The suspension of the account goes through decideAccount (L1-30a).
// The SQL functions check is_admin(), refuse a report already closed and
// write audit_log. No service role.

export type ReportCommandResult =
  | { ok: true; data: { email: EmailDelivery | null } }
  | { ok: false; error: ModerationError };

export async function decideReport(input: unknown): Promise<ReportCommandResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = reportCommandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const command = parsed.data;
  const supabase = await createClient();
  let email: EmailDelivery | null = null;
  if (command.action === "resolve") {
    const { error } = await supabase.rpc("admin_report_resolve", {
      p_report: command.reportId,
      p_note: command.note,
    });
    if (error) return failed(profile.id, command.reportId, command.action, error.code);
  } else {
    const { data: warned, error } = await supabase.rpc("admin_report_warn", {
      p_report: command.reportId,
      p_reason: command.reason,
    });
    if (error) return failed(profile.id, command.reportId, command.action, error.code);
    email = await emailUserWarned({ profileId: warned, reason: command.reason });
  }
  revalidatePath("/admin/signalements");
  revalidatePath(`/admin/signalements/${command.reportId}`);
  revalidatePath("/admin");
  return { ok: true, data: { email } };
}

function failed(
  userId: string,
  reportId: string,
  action: string,
  code: string | undefined,
): ReportCommandResult {
  console.error("[admin] report decision failed", {
    user_id: userId,
    entity_id: reportId,
    action,
    code,
  });
  return { ok: false, error: moderationError(code) };
}
