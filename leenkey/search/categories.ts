import type { SearchFilters } from "@/lib/validations/search";

// The categories under the search bar (L1-61): each one is a filter pressed
// or not, kept with the others. The outdoor spaces are an OR in the search
// (any of those chosen): « Avec jardin » is the garden alone, never added to
// a balcony chosen in « Filtres », which would widen the results.

export type Category = "all" | "maison" | "appartement" | "jardin" | "parking" | "terrain";

const gardenOnly = (filters: SearchFilters) =>
  filters.outdoor?.length === 1 && filters.outdoor[0] === "jardin";

/** The category is on in these filters; « all »: none of the others is. */
export function categoryOn(key: Category, filters: SearchFilters): boolean {
  switch (key) {
    case "all":
      return filters.type === undefined && !gardenOnly(filters) && filters.parking === undefined;
    case "maison":
    case "appartement":
    case "terrain":
      return filters.type === key;
    case "jardin":
      return gardenOnly(filters);
    case "parking":
      return filters.parking === true;
  }
}

/**
 * The filters once the category is pressed: the other filters are kept.
 * « all » clears the type, the garden alone and the parking, nothing else;
 * pressed while on, it changes nothing.
 */
export function toggleCategory(key: Category, filters: SearchFilters): SearchFilters {
  const on = categoryOn(key, filters);
  switch (key) {
    case "all":
      return on
        ? filters
        : {
            ...filters,
            type: undefined,
            outdoor: gardenOnly(filters) ? undefined : filters.outdoor,
            parking: undefined,
          };
    case "maison":
    case "appartement":
    case "terrain":
      return { ...filters, type: on ? undefined : key };
    case "jardin":
      return { ...filters, outdoor: on ? undefined : ["jardin"] };
    case "parking":
      return { ...filters, parking: on ? undefined : true };
  }
}
