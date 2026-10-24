import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  readNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/validations/notifications";
import type { Database } from "@/types/database";

// The email preferences of an account (SPEC-V2 section 4, L1-22), with its
// session: profiles.notification_prefs, readable by its owner.

export async function notificationPreferences(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", profileId)
    .maybeSingle();
  if (error || !data) {
    console.error("[notifications] preferences unavailable", {
      user_id: profileId,
      code: error?.code ?? "not_found",
    });
    return null;
  }
  return readNotificationPreferences(data.notification_prefs);
}
