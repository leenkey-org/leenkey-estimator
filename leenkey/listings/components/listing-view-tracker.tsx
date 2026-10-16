"use client";

import { useEffect } from "react";
import { recordListingView } from "../actions";
import { readViewCookie, VIEW_COOKIE, VIEW_COOKIE_MAX_AGE, writeViewCookie } from "../view-cookie";

// Listings already sent during this visit of the page (React runs effects
// twice in development).
const sent = new Set<string>();

/**
 * Counts the view once the listing is displayed (SPEC-V2 8.5): not on a
 * prefetch, not without JavaScript. The server dedupes per day with the
 * cookie returned, stored here (functional, no personal data).
 */
export function ListingViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    if (sent.has(listingId)) return;
    sent.add(listingId);
    void recordListingView(listingId).then((result) => {
      if (!result.ok) return;
      // Another tab may have written the cookie meanwhile: keep its listings.
      const today = result.data.cookie.split("_")[0];
      const current = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${VIEW_COOKIE}=`))
        ?.slice(VIEW_COOKIE.length + 1);
      const value = writeViewCookie(today, [
        ...readViewCookie(current, today),
        ...readViewCookie(result.data.cookie, today),
      ]);
      const secure = window.location.protocol === "https:" ? "; secure" : "";
      document.cookie = `${VIEW_COOKIE}=${value}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}; samesite=lax${secure}`;
    });
  }, [listingId]);
  return null;
}
