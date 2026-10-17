"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { clearOfflineFavorites } from "../actions";

const t = fr.favorites.page;

type Props = {
  /** Saved listings that are no longer online. */
  count: number;
  /** Shows the sentence that counts them (the empty state says it otherwise). */
  showCount: boolean;
  className?: string;
};

/**
 * The favourites that are no longer online, and « Les retirer de mes favoris ».
 * Rendered at the same place whatever the count: the message stays once the
 * page, refreshed by the action, has none left.
 */
export function ClearOfflineFavorites({ count, showCount, className }: Props) {
  const [working, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<"cleared" | "error" | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);

  // Once the action is over (the button is disabled until then). Cleared: the
  // button goes away with the favourites, the focus goes to the message.
  // Failed: back to the button, to try again.
  useEffect(() => {
    if (working) return;
    if (outcome === "cleared") status.current?.focus();
    if (outcome === "error") button.current?.focus();
  }, [outcome, working]);

  return (
    <div
      className={cn("flex flex-col items-start gap-1", (count > 0 || outcome) && "mt-5", className)}
    >
      {count > 0 && showCount ? (
        <p className="text-lk-secondary text-lk-ink-3">{t.offline(count)}</p>
      ) : null}
      {count > 0 ? (
        <Button
          ref={button}
          variant="ghost"
          size="sm"
          loading={working}
          onClick={() => {
            setOutcome(null);
            startTransition(async () => {
              let ok = false;
              try {
                ok = (await clearOfflineFavorites()).ok;
              } catch (error) {
                console.error("[favorites] clearing failed", error);
              }
              setOutcome(ok ? "cleared" : "error");
            });
          }}
        >
          {t.clearOffline}
        </Button>
      ) : null}
      <p
        ref={status}
        tabIndex={-1}
        role="status"
        className="text-lk-caption text-lk-ink-3 focus:outline-none"
      >
        {outcome === "cleared" ? t.clearedOffline : outcome === "error" ? t.clearError : ""}
      </p>
    </div>
  );
}
