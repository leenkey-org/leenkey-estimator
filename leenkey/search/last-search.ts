// Last search seen during this visit of the site (module state, written and
// read in the browser only, from effects and events; gone on reload): the
// back button of a listing returns to it, with its filters and scroll
// position, instead of a fresh /acheter.

let lastSearchHref: string | null = null;

export function rememberSearch(href: string) {
  lastSearchHref = href;
}

export function lastSearch(): string | null {
  return lastSearchHref;
}
