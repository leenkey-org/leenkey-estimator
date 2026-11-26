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
  /** danger: the change was not saved. */
  tone: "neutral" | "danger";
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
export function announceFavoriteLists(
  text: string,
  scope: string,
  focus = false,
  tone: Message["tone"] = "neutral",
) {
  set({ text, scope, focus, tone });
}

/** Emptied before a new change: the same message twice in a row is read again. */
export function clearFavoriteListsStatus() {
  set(null);
}

/**
 * The message, read by screen readers when it changes: a line of 12 px, or
 * the tinted box of an InlineAlert danger (docs/DESIGN.md 10.8) when the
 * change was not saved. It goes away with the filter it was for.
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
        "focus:outline-none",
        shown?.tone === "danger"
          ? "rounded-lk-md bg-lk-danger-bg px-3 py-2.5 text-lk-secondary text-lk-danger-fg"
          : "text-lk-caption text-lk-ink-3",
        shown ? className : undefined,
      )}
    >
      {shown?.text ?? ""}
    </p>
  );
}
