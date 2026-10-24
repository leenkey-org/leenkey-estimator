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
 */
export function useConversationChanges(profileId: string, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const changed = () => onChangeRef.current();
    const changes = (event: "INSERT" | "UPDATE", column: "seller_id" | "buyer_id") =>
      ({
        event,
        schema: "public",
        table: "conversations",
        filter: `${column}=eq.${profileId}`,
      }) as const;
    const end = subscribe(
      `conversations:${profileId}`,
      (channel) =>
        channel
          .on("postgres_changes", changes("INSERT", "seller_id"), changed)
          .on("postgres_changes", changes("UPDATE", "seller_id"), changed)
          .on("postgres_changes", changes("INSERT", "buyer_id"), changed)
          .on("postgres_changes", changes("UPDATE", "buyer_id"), changed),
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
  }, [profileId]);
}
