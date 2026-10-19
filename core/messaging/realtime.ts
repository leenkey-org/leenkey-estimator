"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { messagesSince } from "./actions";
import { toThreadMessage, type MessageRow, type ThreadMessage } from "./types";

// Live messaging (L1-21, SPEC-V2 8.6): Supabase Realtime on messages and
// conversations, under the RLS of the viewer (postgres_changes checks the
// select policies for each subscriber). The browser client is reserved for
// these subscriptions (lib/supabase/client.ts).

/** Before any message: the whole thread. */
const EPOCH = "1970-01-01T00:00:00.000Z";

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
function subscribe(
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

/**
 * The new messages of a conversation, as they are sent. Each time the
 * subscription is ready and each time the page is shown again, the messages
 * sent meanwhile are read again, after the last one known (`after`). The
 * same message can come twice: mergeMessages keeps it once.
 */
export function useThreadMessages(
  conversationId: string,
  after: () => string | null,
  onMessages: (messages: ThreadMessage[]) => void,
) {
  const afterRef = useRef(after);
  const onMessagesRef = useRef(onMessages);
  useEffect(() => {
    afterRef.current = after;
    onMessagesRef.current = onMessages;
  });

  useEffect(() => {
    let active = true;
    const catchUp = async () => {
      const result = await messagesSince(conversationId, afterRef.current() ?? EPOCH);
      if (active && result.ok && result.data.length > 0) onMessagesRef.current(result.data);
    };
    const end = subscribe(
      `messages:${conversationId}`,
      (channel) =>
        channel.on<MessageRow>(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => onMessagesRef.current([toThreadMessage(payload.new)]),
        ),
      () => void catchUp(),
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") void catchUp();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
      end();
    };
  }, [conversationId]);
}

/**
 * A conversation of the account changed (new message, read by the other
 * party, closed): `onChange` is called, also when the subscription comes back
 * after a lost connection and when the page is shown again.
 */
export function useConversationChanges(profileId: string, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let ready = 0;
    const changed = () => onChangeRef.current();
    const changes = (column: "seller_id" | "buyer_id") =>
      ({
        event: "*",
        schema: "public",
        table: "conversations",
        filter: `${column}=eq.${profileId}`,
      }) as const;
    const end = subscribe(
      `conversations:${profileId}`,
      (channel) =>
        channel
          .on("postgres_changes", changes("seller_id"), changed)
          .on("postgres_changes", changes("buyer_id"), changed),
      () => {
        // The page was read just before the first subscription.
        if (++ready > 1) changed();
      },
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") changed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      end();
    };
  }, [profileId]);
}
