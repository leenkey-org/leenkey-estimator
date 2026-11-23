"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { interventionCommandSchema } from "@/lib/validations/advisor-intervention";
import { moderationError, type ModerationError } from "../moderation";

// The actions of the team on an intervention of the adviser (DECISIONS.md
// 2026-11-23): « Planifiée », « Faite », « Annulée », with an optional note;
// the initial appointment of a property, scheduled or done. The SQL functions
// check is_admin(), refuse a change that already happened (a stale tab) and
// write audit_log. No service role.

export type InterventionCommandResult = { ok: true } | { ok: false; error: ModerationError };

export async function changeIntervention(input: unknown): Promise<InterventionCommandResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = interventionCommandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const command = parsed.data;
  const note = command.note || undefined;
  const supabase = await createClient();
  const { error } =
    command.action === "status"
      ? await supabase.rpc("admin_advisor_intervention_set", {
          p_intervention: command.interventionId,
          p_status: command.status,
          p_note: note,
        })
      : await supabase.rpc("admin_advisor_initial_meeting", {
          p_property: command.propertyId,
          p_status: command.status,
          p_note: note,
        });
  if (error) {
    console.error("[admin] advisor intervention change failed", {
      user_id: profile.id,
      entity_id: command.action === "status" ? command.interventionId : command.propertyId,
      action: command.action,
      code: error.code,
    });
    return { ok: false, error: moderationError(error.code) };
  }
  revalidatePath("/admin/messages", "layout");
  // The counter of the seller: « Ma vente », the request page, the conversation.
  revalidatePath("/vendeur", "layout");
  revalidatePath("/messages", "layout");
  return { ok: true };
}
