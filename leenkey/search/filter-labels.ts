import { formatPriceShort, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { OUTDOOR_SPACES, type SearchFilters } from "@/lib/validations/search";
import { categoryOn } from "./categories";

// Short labels of the active filters: the « Budget » part of the search bar,
// and the chips of the active filters under the categories on a phone:
// « ≤ 400 k€ », « 200 – 400 k€ », « 3 pièces + », « DPE A à D ».

const t = fr.search.chips;

export function budgetLabel(filters: SearchFilters): string | undefined {
  const { priceMinCents: min, priceMaxCents: max } = filters;
  if (min !== undefined && max !== undefined) {
    return t.priceRange(formatPriceShort(min), formatPriceShort(max));
  }
  if (max !== undefined) return t.priceMax(formatPriceShort(max));
  if (min !== undefined) return t.priceMin(formatPriceShort(min));
  return undefined;
}

export function surfaceLabel(filters: SearchFilters): string | undefined {
  const { surfaceMin: min, surfaceMax: max } = filters;
  if (min !== undefined && max !== undefined) {
    return t.surfaceRange(String(min), formatSurface(max));
  }
  if (max !== undefined) return t.surfaceMax(formatSurface(max));
  if (min !== undefined) return t.surfaceMin(formatSurface(min));
  return undefined;
}

/** « Extérieur » for any outdoor space, otherwise the spaces chosen: « Balcon, terrasse ». */
export function outdoorLabel(filters: SearchFilters): string {
  const spaces = filters.outdoor ?? [];
  if (spaces.length === 0 || spaces.length === OUTDOOR_SPACES.length) return t.outdoor;
  const labels = spaces.map((space) => fr.search.outdoor[space]);
  return [labels[0], ...labels.slice(1).map((label) => label.toLowerCase())].join(", ");
}

export type ActiveChip = {
  key: string;
  label: string;
  /** The filters without this one. */
  without: SearchFilters;
};

/**
 * The active filters a category does not show (L1-61), each with the
 * filters without it: the budget, the surface, the rooms, the bedrooms, the
 * outdoor spaces (but the garden alone, « Avec jardin »), the lift, the
 * energy class, and « Autre bien ». The commune is in its field; houses,
 * flats, plots and the parking are categories.
 */
export function activeChips(filters: SearchFilters): ActiveChip[] {
  const chips: Array<ActiveChip | null> = [
    filters.type === "autre"
      ? { key: "type", label: fr.search.types.autre, without: { ...filters, type: undefined } }
      : null,
    budgetLabel(filters)
      ? {
          key: "budget",
          label: budgetLabel(filters) ?? "",
          without: { ...filters, priceMinCents: undefined, priceMaxCents: undefined },
        }
      : null,
    surfaceLabel(filters)
      ? {
          key: "surface",
          label: surfaceLabel(filters) ?? "",
          without: { ...filters, surfaceMin: undefined, surfaceMax: undefined },
        }
      : null,
    filters.roomsMin
      ? {
          key: "rooms",
          label: t.roomsMin(filters.roomsMin),
          without: { ...filters, roomsMin: undefined },
        }
      : null,
    filters.bedroomsMin
      ? {
          key: "bedrooms",
          label: t.bedroomsMin(filters.bedroomsMin),
          without: { ...filters, bedroomsMin: undefined },
        }
      : null,
    filters.outdoor?.length && !(filters.outdoor.length === 1 && filters.outdoor[0] === "jardin")
      ? {
          key: "outdoor",
          label: outdoorLabel(filters),
          without: { ...filters, outdoor: undefined },
        }
      : null,
    filters.elevator
      ? { key: "elevator", label: t.elevator, without: { ...filters, elevator: undefined } }
      : null,
    filters.dpeMax
      ? { key: "dpe", label: t.dpeMax(filters.dpeMax), without: { ...filters, dpeMax: undefined } }
      : null,
  ];
  return chips.filter((chip): chip is ActiveChip => chip !== null);
}

/**
 * The criteria of a search on one line (L1-25, « Reprendre votre dernière
 * recherche ? »): the commune, the categories, then the active filters:
 * « Savigny-sur-Orge · Maisons · Avec jardin · ≤ 400 k€ ». Empty: no criterion.
 */
export function searchSummary(filters: SearchFilters, place: string | null): string[] {
  const categories = fr.search.categories;
  const type =
    filters.type === "maison" || filters.type === "appartement" || filters.type === "terrain"
      ? categories[filters.type]
      : null;
  const garden = categoryOn("jardin", filters) ? categories.jardin : null;
  const parking = filters.parking ? categories.parking : null;
  return [place, type, garden, parking, ...activeChips(filters).map((chip) => chip.label)].filter(
    (part): part is string => Boolean(part),
  );
}
