"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/core/realtime/subscribe";
import { messagesSince } from "./actions";
import { toThreadMessage, type MessageRow, type ThreadMessage } from "./types";

// Live messaging (L1-21, SPEC-V2 8.6): Supabase Realtime on messages and
// conversations, under the RLS of the viewer (postgres_changes checks the
// select policies for each subscriber), through core/realtime/subscribe.ts.

/** Before any message: the whole thread. */
const EPOCH = "1970-01-01T00:00:00.000Z";

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
      try {
        const result = await messagesSince(conversationId, afterRef.current() ?? EPOCH);
        if (active && result.ok && result.data.length > 0) onMessagesRef.current(result.data);
      } catch {
        // Network lost: the next subscription or showing of the page catches up.
      }
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
 * A conversation of the account changed (new, new message, read, closed):
 * `onChange` is called; also each time the subscription is ready (the page
 * may come from the cache of the router, on a back navigation, or a change
 * may have come before the subscription) and when the page is shown again.
 * New and changed rows only: Realtime does not check the RLS of a deletion.
 * `kind`: every conversation of that kind instead of the account's own (the
 * team, who reads them all and is not a column of the conversation).
 */
export function useConversationChanges(
  profileId: string,
  onChange: () => void,
  { kind }: { kind?: string } = {},
) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const changed = () => onChangeRef.current();
    const changes = (event: "INSERT" | "UPDATE", filter: string) =>
      ({ event, schema: "public", table: "conversations", filter }) as const;
    const filters = kind
      ? [`kind=eq.${kind}`]
      : [`seller_id=eq.${profileId}`, `buyer_id=eq.${profileId}`];
    const end = subscribe(
      kind ? `conversations:${kind}:${profileId}` : `conversations:${profileId}`,
      (channel) => {
        for (const filter of filters) {
          channel
            .on("postgres_changes", changes("INSERT", filter), changed)
            .on("postgres_changes", changes("UPDATE", filter), changed);
        }
        return channel;
      },
      changed,
    );
    const onVisible = () => {
      if (document.visibilityState === "visible") changed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      end();
    };
  }, [profileId, kind]);
}
