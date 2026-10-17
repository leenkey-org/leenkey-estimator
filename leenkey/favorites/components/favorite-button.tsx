"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { setFavorite } from "../actions";

const t = fr.favorites;

export type FavoriteButtonProps = {
  listingId: string;
  /** Saved by the signed-in account; null without a session. */
  favorite: boolean | null;
  /** Without a session: the buyer sign-up, back to the listing (an account is needed). */
  signUpHref: string;
  /** white-float over a photo (gallery, card, DESIGN.md 7.1); stone in the price column. */
  variant?: "white-float" | "stone";
  className?: string;
};

/**
 * Heart of a listing (L1-18): a toggle button with a constant name and
 * aria-pressed, filled when saved. The change shows at once and is undone if
 * the server refuses it; a status message tells screen readers the outcome.
 */
export function FavoriteButton({
  listingId,
  favorite,
  signUpHref,
  variant = "white-float",
  className,
}: FavoriteButtonProps) {
  const [saved, setSaved] = useState(favorite === true);
  const [shown, setShown] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const classes = cn(
    iconButtonVariants({ variant }),
    "inline-flex items-center justify-center text-lk-blue",
    className,
  );

  if (favorite === null) {
    return (
      <Link href={signUpHref} prefetch={false} aria-label={t.add} className={classes}>
        <Heart aria-hidden="true" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={t.add}
        aria-pressed={shown}
        className={classes}
        onClick={() => {
          const next = !shown;
          startTransition(async () => {
            setShown(next);
            const result = await setFavorite({ listingId, favorite: next });
            if (result.ok) setSaved(next);
            setMessage(result.ok ? (next ? t.added : t.removed) : t.error);
          });
        }}
      >
        <Heart aria-hidden="true" className={cn(shown && "fill-current")} />
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
