"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// What just happened to the lists of favourites (DECISIONS.md 2026-11-26):
// one message for the page, outside the cards, since a card filed elsewhere
// leaves the list shown and a deleted list leaves the page it was on.

type Message = {
  text: string;
  /** The filter of the page it is for (lists.ts, listFilterKey). */
  scope: string;
  /** The control that had the focus goes away: the message takes it. */
  focus: boolean;
};

let current: Message | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(next: Message | null) {
  current = next;
  for (const listener of listeners) listener();
}

/** Says `text` on the favourites page shown under the filter `scope`. */
export function announceFavoriteLists(text: string, scope: string, focus = false) {
  set({ text, scope, focus });
}

/** Emptied before a new change: the same message twice in a row is read again. */
export function clearFavoriteListsStatus() {
  set(null);
}

/**
 * The message, read by screen readers when it changes. It goes away with the
 * filter it was for.
 */
export function FavoriteListsStatus({ scope, className }: { scope: string; className?: string }) {
  const message = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const ref = useRef<HTMLParagraphElement>(null);
  const shown = message && message.scope === scope ? message : null;

  useEffect(() => {
    if (shown?.focus) ref.current?.focus();
  }, [shown]);
  useEffect(() => {
    if (current && current.scope !== scope) set(null);
  }, [scope]);

  return (
    <p
      ref={ref}
      tabIndex={-1}
      role="status"
      className={cn(
        "text-lk-caption text-lk-ink-3 focus:outline-none",
        shown ? className : undefined,
      )}
    >
      {shown?.text ?? ""}
    </p>
  );
}
