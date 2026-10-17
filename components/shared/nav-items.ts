// Items of the navigation bars (docs/DESIGN.md 10.6): plain data, so that a
// Server Component can build them and hand them to the client bars. An icon
// is a name, turned into a Lucide icon by <NavIcon>: a component cannot cross
// the server/client boundary. No route of the site here: they come as props.

export const NAV_ICONS = [
  "dashboard",
  "listings",
  "file",
  "message",
  "user",
  "search",
  "heart",
  "folder",
  "users",
  "sparkles",
  "layout-grid",
  "flag",
] as const;

export type NavIconName = (typeof NAV_ICONS)[number];

export type NavItem = {
  href: string;
  label: string;
  icon?: NavIconName;
  /** Other paths that make this item the current one (« Acheter » on a listing). */
  match?: readonly string[];
  /** Current on its own path only, not on its sub-pages (a dashboard above its sections). */
  exact?: boolean;
  /** Count pill of the back office sidebar, hidden when absent or zero. */
  count?: number;
};

/** The path alone: no query, no hash, no trailing slash. */
export function pathnameOf(path: string): string {
  const end = path.search(/[?#]/);
  const pathname = end === -1 ? path : path.slice(0, end);
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.replace(/\/+$/, "") || "/";
  return pathname || "/";
}

/**
 * The path is `prefix` or one of its sub-pages, cut on segments: « /vendeur »
 * covers « /vendeur/dossier », not « /vendeurs ». « / » only covers itself.
 */
export function matchesPath(path: string, prefix: string): boolean {
  const pathname = pathnameOf(path);
  const base = pathnameOf(prefix);
  return pathname === base || (base !== "/" && pathname.startsWith(`${base}/`));
}

/**
 * Href of the current item: the one whose path (or one of its `match` paths)
 * is the longest prefix of the page path, so that « Dossier »
 * (/vendeur/dossier) wins over « Ma vente » (/vendeur). Null when none.
 */
export function currentHref(
  path: string | null | undefined,
  items: readonly NavItem[],
): string | null {
  if (!path) return null;
  let best: { href: string; length: number } | null = null;
  for (const item of items) {
    for (const prefix of [item.href, ...(item.match ?? [])]) {
      const exact = item.exact && prefix === item.href;
      if (exact ? pathnameOf(path) !== pathnameOf(prefix) : !matchesPath(path, prefix)) continue;
      const length = pathnameOf(prefix).length;
      if (!best || length > best.length) best = { href: item.href, length };
    }
  }
  return best?.href ?? null;
}

/**
 * Bottom padding of a page with a fixed BottomNav, so that the bar never hides
 * the end of the content: the bar's own height (top border, 10 px, icon 22,
 * gap 4, 11 px label, then 22 px or the iOS safe area). Nothing from 768 px.
 */
export const BOTTOM_NAV_OFFSET =
  "pb-[calc(3.25rem_+_max(1.375rem,env(safe-area-inset-bottom)))] md:pb-0";
