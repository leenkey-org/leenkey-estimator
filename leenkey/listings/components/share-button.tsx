"use client";

import { useState } from "react";
import { Share } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.listing.share;

/**
 * « Partager » (L1-60, in the way of Airbnb): the share sheet of the device
 * where there is one (a phone), the link copied otherwise, told by a status
 * message. text: beside the title from 1024 px; float: round and white over
 * the mobile photo.
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
      setMessage(t.copied);
    } catch {
      setMessage(t.error);
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
            "inline-flex h-10 items-center gap-2 rounded-full px-3 text-lk-compact font-semibold text-lk-ink underline underline-offset-2",
            "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
            className,
          )}
        >
          <Share aria-hidden="true" className="size-4" />
          {t.label}
        </button>
      )}
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
