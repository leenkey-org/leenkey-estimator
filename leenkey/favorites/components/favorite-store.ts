import { useSyncExternalStore } from "react";

// Favourites changed in this tab (L1-18), by listing: the two hearts of a
// listing page (gallery under 1024 px, price column above) and a page shown
// again from the router cache (back button) then agree with the last change,
// without a new server render.

const saved = new Map<string, boolean>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function rememberFavorite(listingId: string, favorite: boolean) {
  saved.set(listingId, favorite);
  for (const listener of listeners) listener();
}

/** The last change made in this tab, otherwise what the server rendered. */
export function useFavorite(listingId: string, rendered: boolean): boolean {
  return useSyncExternalStore(
    subscribe,
    () => saved.get(listingId) ?? rendered,
    () => rendered,
  );
}
