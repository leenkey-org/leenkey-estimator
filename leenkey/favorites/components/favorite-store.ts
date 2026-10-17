import { useSyncExternalStore } from "react";

// Favourites changed in this tab (L1-18), by listing, with the server time of
// the change. A render of the server made before it (a page shown again from
// the router cache, the other heart of a listing page) shows the change; a
// render made after it (a new visit, another account in this tab, a change
// from another tab or device) wins.

type Change = { favorite: boolean; at: number };

const changes = new Map<string, Change>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `at`: server time of the change (setFavorite). */
export function rememberFavorite(listingId: string, favorite: boolean, at: number) {
  changes.set(listingId, { favorite, at });
  for (const listener of listeners) listener();
}

/** The state to show: the server's, unless this tab changed it since `checkedAt`. */
export function useFavorite(listingId: string, rendered: boolean, checkedAt: number): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const change = changes.get(listingId);
      return change && change.at > checkedAt ? change.favorite : rendered;
    },
    () => rendered,
  );
}
