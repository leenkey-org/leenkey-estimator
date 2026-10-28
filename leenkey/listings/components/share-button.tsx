"use client";

import { useEffect, useRef, useState } from "react";
import { Share } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.listing.share;

/** How long the message stays on the screen. */
const MESSAGE_MS = 3000;

/**
 * « Partager » (L1-60, in the way of Airbnb; Younes, DECISIONS 2026-10-28):
 * the share sheet of the device where there is one (a phone), the link
 * copied otherwise, told by a message shown 3 s at the bottom of the screen
 * and read by screen readers. text: beside the title from 1024 px; float:
 * round and white over the mobile photo. Nothing is sent to a third party.
 */
export function ShareButton({
  url,
  title,
  variant = "text",
  className,
}: {
  url: string;
  title: string;
  variant?: "text" | "float";
  className?: string;
}) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function say(text: string) {
    window.clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(""), MESSAGE_MS);
  }

  async function share() {
    // Emptied first: the same message twice in a row is read again.
    setMessage("");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closed by the person: nothing to say.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say(t.copied);
    } catch {
      say(t.error);
    }
  }

  return (
    <>
      {variant === "float" ? (
        <button
          type="button"
          aria-label={t.label}
          onClick={share}
          className={cn(
            iconButtonVariants({ variant: "white-float" }),
            "inline-flex items-center justify-center",
            className,
          )}
        >
          <Share aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={share}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full px-3 text-lk-compact font-semibold text-lk-ink underline underline-offset-2",
            "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
            className,
          )}
        >
          <Share aria-hidden="true" className="size-4" />
          {t.label}
        </button>
      )}
      {/* Above the bar at the bottom of a phone, at the bottom of the screen from 1024 px. */}
      <span
        role="status"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-28 z-60 mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-full bg-lk-ink px-4 py-2.5 text-center text-lk-compact font-semibold text-white shadow-lk-fab lg:bottom-8",
          "transition-opacity duration-220 ease-out-lk motion-reduce:transition-none",
          message ? "opacity-100" : "opacity-0",
        )}
      >
        {message}
      </span>
    </>
  );
}
