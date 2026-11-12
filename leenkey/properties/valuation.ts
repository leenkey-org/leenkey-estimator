import { formatDate, formatPrice } from "@/lib/format";
import { frProperties } from "@/lib/i18n/sections/properties";
import type { Valuation } from "./components/price-step";
import type { SellerEstimation } from "./queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties } as const;

const t = fr.properties.price;

/**
 * The reminder of the analysis of value of the property, by its price (step
 * 3, and its change once the listing is sent: L1-13, L1-14b); null without
 * an analysis.
 */
export function valuationOf(estimation: SellerEstimation | null): Valuation | null {
  if (!estimation) return null;
  const range = (cents: number | null) => (cents === null ? null : formatPrice(cents));
  return {
    title: t.valuation(estimation.madeAt ? formatDate(estimation.madeAt) : null),
    text: t.valuationValue(
      formatPrice(estimation.valueCents),
      range(estimation.lowCents),
      range(estimation.highCents),
    ),
    valueCents: estimation.valueCents,
  };
}
