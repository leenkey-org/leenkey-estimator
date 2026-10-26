// The page before this one during the visit (module state, in the browser
// only, written by RouteHistory on each new page; gone on reload). The back
// link of a listing goes back in the history only when that page is the
// search: from a conversation or the home page, it opens the search instead.

let current: string | null = null;
let previous: string | null = null;

/** A page shown, by its path. The same path again (a render, a refresh) changes nothing. */
export function recordRoute(path: string) {
  if (path === current) return;
  previous = current;
  current = path;
}

/** Path of the page shown before the current one, or null (first page of the visit). */
export function previousRoute(): string | null {
  return previous;
}
