import { searchSummary } from "@/leenkey/search/filter-labels";
import { resolveLocation } from "@/leenkey/search/location";
import { frSearch } from "@/lib/i18n/sections/search";
import type { SearchFilters } from "@/lib/validations/search";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { search: frSearch } as const;

/**
 * The criteria of an alert as the search shows them (L3-06): the commune and
 * its radius where the site knows its centre (« Savigny-sur-Orge · 5 km »),
 * the categories, then the other filters.
 */
export function alertSummary(filters: SearchFilters): string[] {
  const place = filters.location ? resolveLocation(filters.location) : null;
  const [first, ...rest] = searchSummary(filters, place?.label ?? null);
  if (!place || first === undefined) return first === undefined ? [] : [first, ...rest];
  return filters.radiusKm && place.centre
    ? [first, fr.search.location.radius(filters.radiusKm), ...rest]
    : [first, ...rest];
}
