"use server";

import { getProfile } from "@/core/auth/session";
import { dailyBriefSchema } from "@/lib/validations/admin-assistant";
import { dailyBrief, type DailyBriefResult } from "./daily-brief";

/**
 * « Résumé du jour » of the dashboard (L1-30b): the brief of the last hour,
 * or a new one (« Régénérer »). The card keeps the brief it receives and
 * nothing else on the page changes: no revalidatePath, which would read the
 * whole dashboard again.
 */
export async function dailyBriefAction(input: unknown): Promise<DailyBriefResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "auth" };
  const parsed = dailyBriefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return dailyBrief(profile, parsed.data.regenerate);
}
