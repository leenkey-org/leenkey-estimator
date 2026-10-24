"use server";

import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notificationIdSchema } from "@/lib/validations/notifications";
import { notificationsSnapshot } from "./queries";
import type { NotificationsSnapshot } from "./types";

// Notification actions (L1-22), with the session of the recipient: RLS lets
// them read their notifications and set read_at only (column privilege). No
// revalidatePath for the bell (CLAUDE.md section 9, exception): it keeps its
// list in the browser and follows the table through Realtime.

type Failure = { ok: false; error: "invalid" | "auth" | "unavailable" };

/** The bell of the session: its unread count and last notifications; null when signed out. */
export async function loadNotifications(): Promise<
  { ok: true; data: NotificationsSnapshot | null } | Failure
> {
  const profile = await getProfile();
  if (!profile) return { ok: true, data: null };
  const snapshot = await notificationsSnapshot(await createClient(), profile.id);
  return snapshot ? { ok: true, data: snapshot } : { ok: false, error: "unavailable" };
}

export async function markNotificationRead(
  id: unknown,
): Promise<{ ok: true; data: null } | Failure> {
  const parsed = notificationIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("profile_id", profile.id)
    .is("read_at", null);
  if (error) {
    console.error("[notifications] not marked read", {
      user_id: profile.id,
      entity_id: parsed.data,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: null };
}

/** « Tout marquer comme lu ». */
export async function markAllNotificationsRead(): Promise<{ ok: true; data: null } | Failure> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", profile.id)
    .is("read_at", null);
  if (error) {
    console.error("[notifications] not all marked read", { user_id: profile.id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: null };
}
