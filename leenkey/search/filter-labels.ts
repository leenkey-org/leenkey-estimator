import { formatPriceShort, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { OUTDOOR_SPACES, type SearchFilters } from "@/lib/validations/search";

// Short labels of the active filters, for the chips of the mobile bar:
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

export function roomsLabel(filters: SearchFilters): string | undefined {
  return filters.roomsMin ? t.roomsMin(filters.roomsMin) : undefined;
}

export function bedroomsLabel(filters: SearchFilters): string | undefined {
  return filters.bedroomsMin ? t.bedroomsMin(filters.bedroomsMin) : undefined;
}

/** « Extérieur » for any outdoor space, otherwise the spaces chosen: « Jardin ». */
export function outdoorLabel(filters: SearchFilters): string {
  const spaces = filters.outdoor ?? [];
  if (spaces.length === 0 || spaces.length === OUTDOOR_SPACES.length) return t.outdoor;
  const labels = spaces.map((space) => fr.search.outdoor[space]);
  return [labels[0], ...labels.slice(1).map((label) => label.toLowerCase())].join(", ");
}

export function dpeLabel(filters: SearchFilters): string | undefined {
  return filters.dpeMax ? t.dpeMax(filters.dpeMax) : undefined;
}
