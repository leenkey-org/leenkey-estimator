import { formatPriceShort } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { SearchFilters } from "@/lib/validations/search";

// Short label of the budget, in the « Budget » part of the search bar:
// « ≤ 400 k€ », « ≥ 200 k€ », « 200 – 400 k€ ».

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
