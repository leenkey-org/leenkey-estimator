"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// A subscription to the changes of the database (Supabase Realtime,
// postgres_changes under the RLS of the viewer), shared by the messaging
// (L1-21) and the notifications (L1-22). The browser client is reserved for
// these subscriptions (lib/supabase/client.ts).

/** New tries of a refused subscription: 2, 4, 8, 16, 30 then 30 s, then none. */
const RETRIES = 6;
const RETRY_MS = 2_000;
const RETRY_MAX_MS = 30_000;

/** What the server says of the subscription to the changes: ready, or refused. */
type SystemPayload = { extension?: unknown; status?: unknown };

// Realtime gives back the channel of an existing topic: one topic per
// subscription, so that a channel being removed is never reused.
let channels = 0;

/**
 * A subscription to the changes of the database, joined with the session of
 * the viewer: the token is read first, otherwise the join goes out with the
 * anonymous key on the first load of a page, and the server refuses it for
 * good (RLS). A refused subscription is made again, a bit later. `onReady`
 * each time it is ready (the first time, after a lost connection). Returns
 * the end of the subscription.
 */
export function subscribe(
  topic: string,
  listen: (channel: RealtimeChannel) => RealtimeChannel,
  onReady: () => void,
): () => void {
  const supabase = createClient();
  let channel: RealtimeChannel | null = null;
  let retry: number | null = null;
  let attempts = 0;
  let ended = false;

  const open = async () => {
    // Without a token, the join is refused and made again later.
    await supabase.realtime.setAuth().catch(() => {});
    if (ended) return;
    const current = listen(supabase.channel(`${topic}:${++channels}`));
    channel = current;
    current
      .on("system", {}, (payload: SystemPayload) => {
        if (payload.extension !== "postgres_changes" || channel !== current) return;
        if (payload.status === "ok") {
          attempts = 0;
          onReady();
          return;
        }
        channel = null;
        void supabase.removeChannel(current);
        if (attempts >= RETRIES) return;
        const delay = Math.min(RETRY_MAX_MS, RETRY_MS * 2 ** attempts++);
        retry = window.setTimeout(() => void open(), delay);
      })
      .subscribe();
  };
  void open();

  return () => {
    ended = true;
    if (retry !== null) window.clearTimeout(retry);
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };
}
