"use server";

import { z } from "zod";
import { searchSummary } from "./filter-labels";
import { resolveLocation } from "./location";
import { countListings, searchListings } from "./queries";
import { parseSearchParams, SEARCH_PAGE_SIZE, SearchFilters } from "@/lib/validations/search";

// Server actions of the search. A read, not a mutation: the filters panel
// shows « Voir N biens » for the filters being chosen, before they are
// applied (no Supabase query from a client component, CLAUDE.md section 9).
// Public data: no session required, the visitor's session (or none) is used.

export async function countSearchResults(
  input: unknown,
): Promise<{ ok: true; data: number } | { ok: false; error: "invalid" | "unavailable" }> {
  const parsed = SearchFilters.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return countListings(parsed.data);
}

const lastSearchInput = z.object({
  href: z
    .string()
    .max(2_000)
    .refine((href) => href.startsWith("/acheter?")),
  since: z.string().datetime(),
});

/**
 * The search a buyer may resume (L1-25, buyer home): its criteria on one
 * line and its listings published since it was last seen, counted on its
 * first page, the most recent first (« 20 nouveaux biens et plus » beyond).
 */
export async function lastSearchDigest(
  input: unknown,
): Promise<
  | { ok: true; data: { criteria: string[]; fresh: number } }
  | { ok: false; error: "invalid" | "unavailable" }
> {
  const parsed = lastSearchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { href, since } = parsed.data;
  const query = parseSearchParams(new URL(href, "https://leenkey.fr").searchParams);
  const place = query.filters.location ? resolveLocation(query.filters.location).label : null;
  const result = await searchListings({ ...query, sort: "recent", page: 1 });
  if (!result.ok) return { ok: false, error: "unavailable" };
  const seen = Date.parse(since);
  const fresh = result.data.items.filter(
    (listing) => listing.publishedAt !== null && Date.parse(listing.publishedAt) > seen,
  ).length;
  return {
    ok: true,
    data: {
      criteria: searchSummary(query.filters, place),
      fresh: Math.min(fresh, SEARCH_PAGE_SIZE),
    },
  };
}
