"use client";

import { subscribe } from "@/core/realtime/subscribe";
import type { NotificationChange } from "./state";
import type { NotificationRow } from "./types";

// The bell in real time (L1-22, SPEC-V2 section 10): Supabase Realtime on the
// notifications of the recipient, under the select policy of the table.
// Loaded by the store only once a bell shows for a signed-in account
// (core/notifications/store.ts): the pages of the visitors do without it.

/**
 * A notification of the account arrived or changed (read elsewhere: another
 * tab, the conversation opened): `onChange` with the row; `onReady` each time
 * the subscription is ready (the first time, after a lost connection) and
 * when the page is shown again, for the changes that came meanwhile. Returns
 * the end of the subscription.
 */
export function watchNotifications(
  profileId: string,
  onChange: (change: NotificationChange) => void,
  onReady: () => void,
): () => void {
  const filter = `profile_id=eq.${profileId}`;
  const end = subscribe(
    `notifications:${profileId}`,
    (channel) =>
      channel
        .on<NotificationRow>(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          (payload) => onChange({ event: "INSERT", row: payload.new }),
        )
        .on<NotificationRow>(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter },
          (payload) => onChange({ event: "UPDATE", row: payload.new }),
        ),
    onReady,
  );
  const onVisible = () => {
    if (document.visibilityState === "visible") onReady();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    end();
  };
}
