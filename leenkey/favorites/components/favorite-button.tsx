"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { setFavorite, type FavoriteResult } from "../actions";
import { rememberFavorite, useFavorite } from "./favorite-store";

const t = fr.favorites;

export type FavoriteButtonProps = {
  listingId: string;
  /** Saved by the signed-in account; null without a session. */
  favorite: boolean | null;
  /** Server time of the render that read `favorite` (Date.now() in the page). */
  checkedAt: number;
  /** Without a session: the buyer sign-up, back to the listing (an account is needed). */
  signUpHref: string;
  /** The property, in the name of the button when several hearts share a page (favourites). */
  property?: string;
  /**
   * white-float over a photo (gallery, card, DESIGN.md 7.1); stone in the
   * price column; photo: the heart alone over the photo of a card of
   * direction C (SPECS.md 2), white outline on a shaded fill, blue once saved.
   */
  variant?: "white-float" | "stone" | "tint" | "photo";
  className?: string;
};

/**
 * Heart of a listing (L1-18): a toggle button with a constant name and
 * aria-pressed, filled when saved. The change shows at once and is undone if
 * it cannot be saved (refusal, network, new deployment); a status message
 * tells screen readers the outcome. Hearts of the same listing agree
 * (favorite-store.ts).
 */
export function FavoriteButton({
  listingId,
  favorite,
  checkedAt,
  signUpHref,
  property,
  variant = "white-float",
  className,
}: FavoriteButtonProps) {
  const saved = useFavorite(listingId, favorite === true, checkedAt);
  const [shown, setShown] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const label = property ? t.addProperty(property) : t.add;
  const onPhoto = variant === "photo";
  const classes = cn(
    onPhoto
      ? "relative inline-flex size-11 items-center justify-center rounded-full text-white focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
      : cn(iconButtonVariants({ variant }), "inline-flex items-center justify-center text-lk-blue"),
    className,
  );
  const heart = (filled: boolean) =>
    onPhoto ? (
      <Heart
        aria-hidden="true"
        strokeWidth={2}
        className={cn("size-6 md:size-6.5", filled ? "fill-lk-blue" : "fill-black/35")}
      />
    ) : (
      <Heart aria-hidden="true" className={cn(filled && "fill-current")} />
    );

  if (favorite === null) {
    return (
      <Link href={signUpHref} prefetch={false} aria-label={label} className={classes}>
        {heart(false)}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={shown}
        className={classes}
        onClick={() => {
          const next = !shown;
          // Emptied first: the same message twice in a row is read again.
          setMessage("");
          startTransition(async () => {
            setShown(next);
            let result: FavoriteResult | null = null;
            try {
              result = await setFavorite({ listingId, favorite: next });
            } catch (error) {
              // Network, server error or an action unknown since a deployment.
              console.error("[favorites] action failed", error);
            }
            if (result?.ok) rememberFavorite(listingId, next, result.data.at);
            setMessage(
              result?.ok
                ? next
                  ? t.added
                  : t.removed
                : result?.error === "auth"
                  ? t.signedOut
                  : t.error,
            );
          });
        }}
      >
        {heart(shown)}
      </button>
      <span role="status" className="sr-only">
        {message}
      </span>
    </>
  );
}
