import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  NOTIFICATION_COLUMNS,
  toNotificationView,
  type NotificationRow,
  type NotificationsSnapshot,
} from "./types";

// The bell of an account (L1-22), with its session: RLS gives a recipient
// their notifications; the team reads all of them (back office), hence the
// filter on the recipient, always.

/** How many notifications the panel lists, the latest first. */
export const PANEL_LIMIT = 50;

export async function notificationsSnapshot(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<NotificationsSnapshot | null> {
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PANEL_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .is("read_at", null),
  ]);
  if (list.error || unread.error) {
    console.error("[notifications] snapshot unavailable", {
      user_id: profileId,
      code: list.error?.code ?? unread.error?.code,
    });
    return null;
  }
  return {
    profileId,
    unread: unread.count ?? 0,
    items: (list.data as NotificationRow[]).map(toNotificationView),
  };
}
