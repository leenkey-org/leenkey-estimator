"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  notificationPreferencesUpdateSchema,
  type NotificationPreferences,
} from "@/lib/validations/notifications";
import { notificationPreferences } from "./queries";

// The email preferences of the account (L1-22, /compte/notifications), with
// its session: profiles.notification_prefs is one of the columns its owner
// may change (column privilege, L1-03). The cron reads them before each
// email (leenkey/notifications/send-emails.ts).

export async function updateNotificationPreferences(
  input: unknown,
): Promise<
  | { ok: true; data: NotificationPreferences }
  | { ok: false; error: "invalid" | "auth" | "unavailable" }
> {
  const parsed = notificationPreferencesUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  // The preferences the form does not show (offers, alerts) stay as they are.
  const current = await notificationPreferences(supabase, profile.id);
  if (!current) return { ok: false, error: "unavailable" };
  const next = { ...current, ...parsed.data };
  const { error } = await supabase
    .from("profiles")
    .update({ notification_prefs: next })
    .eq("id", profile.id);
  if (error) {
    console.error("[notifications] preferences not saved", {
      user_id: profile.id,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/compte/notifications");
  return { ok: true, data: next };
}
