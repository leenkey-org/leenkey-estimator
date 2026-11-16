"use server";

import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { upgradePromptEventSchema } from "@/lib/validations/billing";
import { UPGRADE_TARGET } from "./upgrade-prompts";

// What the seller did with an upgrade prompt (L2-09, SPEC-V2 11 bis): seen,
// opened, hidden; the measure of the back office reads it. With the session
// of the seller: upgrade_prompt_record writes on their property only, and a
// prompt hidden stays hidden (the table keeps the first date). The plan
// aimed at is the one of the code, never what the browser says. No
// revalidatePath: the prompt is hidden at once on the page that shows it,
// and the next reading of a page leaves it out.

export type UpgradePromptResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "invalid" | "unavailable" };

export async function recordUpgradePrompt(input: unknown): Promise<UpgradePromptResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = upgradePromptEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, trigger, subjectId, event } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("upgrade_prompt_record", {
    p_property: propertyId,
    p_trigger: trigger,
    p_target: UPGRADE_TARGET[trigger],
    // An argument with a default reads as optional in the generated types.
    p_subject: subjectId ?? undefined,
    p_event: event,
  });
  if (error) {
    console.error("[billing] upgrade prompt not recorded", {
      user_id: profile.id,
      entity_id: propertyId,
      trigger,
      event,
      code: error.code,
    });
    return { ok: false, error: error.code === "23514" ? "invalid" : "unavailable" };
  }
  return { ok: true, data: null };
}
