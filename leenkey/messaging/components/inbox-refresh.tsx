"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConversationChanges } from "@/core/messaging/realtime";

/** Changes that come together (a message, then its read mark) make one refresh. */
const GROUP_MS = 1000;

/**
 * Keeps the list of the conversations up to date (SPEC-V2 8.6): when one of
 * them changes, the page is read again on the server (router.refresh), at
 * most once a second. `media`: only while the list is shown (from 1024 px
 * next to an open conversation).
 */
export function InboxRefresh({ profileId, media }: { profileId: string; media?: string }) {
  const router = useRouter();
  const timer = useRef<number | null>(null);

  useConversationChanges(profileId, () => {
    if (media && !window.matchMedia(media).matches) return;
    if (timer.current !== null) return;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      router.refresh();
    }, GROUP_MS);
  });

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  return null;
}
