// Last search seen (written and read in the browser only, from effects and
// events). During the visit (module state, gone on reload), the back button
// of a listing returns to it, with its filters and scroll position, instead
// of a fresh /acheter. Across visits (localStorage, L1-25), the buyer home
// offers to resume a search with criteria, with its new listings since.

let lastSearchHref: string | null = null;

const STORED_KEY = "lk:search:last";

/** A search with criteria, and when it was last seen. */
export type StoredSearch = { href: string; at: string };

export function rememberSearch(href: string) {
  lastSearchHref = href;
  // Only a search with criteria: « /acheter » alone is no search to resume.
  if (!href.includes("?")) return;
  try {
    const stored: StoredSearch = { href, at: new Date().toISOString() };
    window.localStorage.setItem(STORED_KEY, JSON.stringify(stored));
  } catch {
    // Storage refused (private window): nothing to resume next time.
  }
}

export function lastSearch(): string | null {
  return lastSearchHref;
}

/** The search kept by this browser, if it is still one of /acheter. */
export function storedSearch(): StoredSearch | null {
  try {
    return parseStoredSearch(window.localStorage.getItem(STORED_KEY));
  } catch {
    return null;
  }
}

export function parseStoredSearch(raw: string | null): StoredSearch | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { href, at } = value as Record<string, unknown>;
    if (typeof href !== "string" || !href.startsWith("/acheter?")) return null;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at))) return null;
    return { href, at };
  } catch {
    return null;
  }
}
