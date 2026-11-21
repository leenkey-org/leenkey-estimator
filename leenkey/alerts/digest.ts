import { slugify } from "@/lib/slug";
import type { SqlSearchFilters } from "@/leenkey/search/sql-filters";

// What the daily digest of the alerts says (L3-06, SPEC-V2 16), as pure
// functions: the listings of an alert published since its last digest, the
// one email of a buyer for all their alerts (6 listings at most, the most
// recent first, each once), and the listings similar to one sold (same
// commune, price within 20 %, rooms within 1). The reads and the sending
// are in send-digest.ts.

export const DIGEST_LISTINGS_MAX = 6;
/** Similar listings: the price of the listing sold, 20 % below to 20 % above. */
export const SIMILAR_PRICE_MARGIN = 0.2;
export const SIMILAR_ROOMS_MARGIN = 1;

export type DigestListing = {
  id: string;
  slug: string;
  title: string;
  city: string;
  priceCents: number;
  surfaceM2: number | null;
  rooms: number | null;
  publishedAt: string | null;
};

/**
 * The listings of an alert to tell of: published after `since` (its last
 * digest, or its creation) and not after `now`, the moment written as its
 * new last digest, so that a listing published while a run reads is told by
 * the next run, once; never a listing of the buyer's own.
 */
export function freshListings<T extends Pick<DigestListing, "id" | "publishedAt">>(
  listings: readonly T[],
  since: string,
  now: Date,
  own: ReadonlySet<string> = new Set(),
): T[] {
  const from = Date.parse(since);
  const until = now.getTime();
  return listings.filter((listing) => {
    if (own.has(listing.id) || listing.publishedAt === null) return false;
    const published = Date.parse(listing.publishedAt);
    return published > from && published <= until;
  });
}

const byRecent = (a: DigestListing, b: DigestListing) =>
  Date.parse(b.publishedAt ?? "") - Date.parse(a.publishedAt ?? "") || a.id.localeCompare(b.id);

export type AlertMatch = {
  alertId: string;
  name: string;
  /** The search of the alert, as a path of the site. */
  href: string;
  listings: DigestListing[];
};

export type Digest = {
  /** 6 at most, the most recent first, each once. */
  listings: DigestListing[];
  /** Every new listing of the alerts, each counted once. */
  total: number;
  /** The alerts that matched, in the order given, with the number of their new listings. */
  alerts: Array<{ alertId: string; name: string; href: string; count: number }>;
};

/** The one email of a buyer for all their alerts; null when none matched. */
export function composeDigest(matches: readonly AlertMatch[]): Digest | null {
  const unique = new Map<string, DigestListing>();
  for (const match of matches) {
    for (const listing of match.listings) {
      if (!unique.has(listing.id)) unique.set(listing.id, listing);
    }
  }
  if (unique.size === 0) return null;
  return {
    listings: [...unique.values()].sort(byRecent).slice(0, DIGEST_LISTINGS_MAX),
    total: unique.size,
    alerts: matches
      .filter((match) => match.listings.length > 0)
      .map(({ alertId, name, href, listings }) => ({
        alertId,
        name,
        href,
        count: listings.length,
      })),
  };
}

/** The alerts of a queue, grouped by buyer, in the order of the queue. */
export function groupByBuyer<T extends { buyerId: string }>(rows: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const group = groups.get(row.buyerId);
    if (group) group.push(row);
    else groups.set(row.buyerId, [row]);
  }
  return [...groups.values()];
}

export type SoldListing = { city: string; priceCents: number; rooms: number | null };

/** Same commune, price within 20 %, rooms within 1 (a plot has no room: not compared). */
export function isSimilar(
  sold: SoldListing,
  candidate: Pick<DigestListing, "city" | "priceCents" | "rooms">,
): boolean {
  if (slugify(candidate.city) !== slugify(sold.city)) return false;
  if (
    candidate.priceCents < sold.priceCents * (1 - SIMILAR_PRICE_MARGIN) ||
    candidate.priceCents > sold.priceCents * (1 + SIMILAR_PRICE_MARGIN)
  ) {
    return false;
  }
  if (sold.rooms === null) return true;
  return candidate.rooms !== null && Math.abs(candidate.rooms - sold.rooms) <= SIMILAR_ROOMS_MARGIN;
}

/** What search_listings is asked for the listings similar to one sold; isSimilar then decides. */
export function similarSqlFilters(sold: SoldListing): SqlSearchFilters {
  return {
    city: slugify(sold.city),
    price_min_cents: Math.floor(sold.priceCents * (1 - SIMILAR_PRICE_MARGIN)),
    price_max_cents: Math.ceil(sold.priceCents * (1 + SIMILAR_PRICE_MARGIN)),
    ...(sold.rooms !== null && sold.rooms - SIMILAR_ROOMS_MARGIN >= 1
      ? { rooms_min: sold.rooms - SIMILAR_ROOMS_MARGIN }
      : {}),
  };
}

/** The listings similar to one sold: 6 at most, the most recent first, never the buyer's own. */
export function similarListings(
  sold: SoldListing,
  candidates: readonly DigestListing[],
  own: ReadonlySet<string> = new Set(),
): DigestListing[] {
  return candidates
    .filter((candidate) => !own.has(candidate.id) && isSimilar(sold, candidate))
    .sort(byRecent)
    .slice(0, DIGEST_LISTINGS_MAX);
}
