"use client";

import { useEffect } from "react";
import { recordListingView } from "../actions";
import { VIEW_COOKIE, VIEW_COOKIE_MAX_AGE } from "../view-cookie";

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
      const secure = window.location.protocol === "https:" ? "; secure" : "";
      document.cookie = `${VIEW_COOKIE}=${result.data.cookie}; path=/; max-age=${VIEW_COOKIE_MAX_AGE}; samesite=lax${secure}`;
    });
  }, [listingId]);
  return null;
}
