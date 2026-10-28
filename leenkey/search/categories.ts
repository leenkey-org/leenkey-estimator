import type { SearchFilters } from "@/lib/validations/search";

// The categories under the search bar (L1-61): each one is a filter pressed
// or not, kept with the others.

export type Category = "all" | "maison" | "appartement" | "jardin" | "parking" | "terrain";

/** The category is on in these filters. */
export function categoryOn(key: Category, filters: SearchFilters): boolean {
  switch (key) {
    case "all":
      return (
        filters.type === undefined &&
        !filters.outdoor?.includes("jardin") &&
        filters.parking === undefined
      );
    case "maison":
    case "appartement":
    case "terrain":
      return filters.type === key;
    case "jardin":
      return filters.outdoor?.includes("jardin") ?? false;
    case "parking":
      return filters.parking === true;
  }
}

/** The filters once the category is pressed: the other filters are kept. */
export function toggleCategory(key: Category, filters: SearchFilters): SearchFilters {
  const on = categoryOn(key, filters);
  switch (key) {
    case "all": {
      const outdoor = filters.outdoor?.filter((space) => space !== "jardin");
      return {
        ...filters,
        type: undefined,
        outdoor: outdoor?.length ? outdoor : undefined,
        parking: undefined,
      };
    }
    case "maison":
    case "appartement":
    case "terrain":
      return { ...filters, type: on ? undefined : key };
    case "jardin": {
      const others = (filters.outdoor ?? []).filter((space) => space !== "jardin");
      const outdoor = on ? others : [...others, "jardin" as const];
      return { ...filters, outdoor: outdoor.length ? outdoor : undefined };
    }
    case "parking":
      return { ...filters, parking: on ? undefined : true };
  }
}
