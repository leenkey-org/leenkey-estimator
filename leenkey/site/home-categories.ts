import type { SearchListing } from "@/leenkey/search/queries";
import { parisDaysAgo } from "@/lib/format";
import type { SearchFilters } from "@/lib/validations/search";

// The categories of « Biens à vendre près de chez vous » (docs/design-handoff/
// SPECS.md 3, item 7), each a filter of the search. « Plain-pied » and « Proche
// gare » of the mock-up wait for their data (DECISIONS 2026-10-26, BACKLOG-V3).

export const HOME_CATEGORIES = [
  "all",
  "maison",
  "appartement",
  "jardin",
  "parking",
  "terrain",
] as const;

export type HomeCategory = (typeof HOME_CATEGORIES)[number];

/** The filters of the search a category stands for. */
export function categoryFilters(category: HomeCategory): Partial<SearchFilters> {
  switch (category) {
    case "all":
      return {};
    case "maison":
    case "appartement":
    case "terrain":
      return { type: category };
    case "jardin":
      return { outdoor: ["jardin"] };
    case "parking":
      return { parking: true };
  }
}

/** The categories a listing belongs to, « Tous les biens » left out. */
export function listingCategories(
  listing: Pick<SearchListing, "type" | "hasGarden" | "hasParking">,
): HomeCategory[] {
  const categories: HomeCategory[] = [];
  if (listing.type === "maison" || listing.type === "appartement" || listing.type === "terrain") {
    categories.push(listing.type);
  }
  if (listing.hasGarden) categories.push("jardin");
  if (listing.hasParking) categories.push("parking");
  return categories;
}

/** « Nouveau »: online for less than seven days, in days of Paris (docs/design-handoff/SPECS.md 4.4). */
export const NEW_LISTING_DAYS = 7;

export function isNewListing(publishedAt: string | null, now: Date): boolean {
  return publishedAt !== null && parisDaysAgo(publishedAt, now) < NEW_LISTING_DAYS;
}
