import { toPropertyCard } from "../cards";
import type { SearchListing } from "../queries";
import { ResultItem } from "./map-sync";
import { PropertyCard } from "@/components/shared/property-card";
import { fr } from "@/lib/i18n/fr";

/**
 * Results (docs/DESIGN.md 10.3, 12.5, 12.6): compact cards up to 1023 px (two
 * columns from 768 px), then wide cards in one column beside the map (L1-16).
 * Each card lights its pill on the map (map-sync.tsx).
 */
export function ResultsList({ items, now }: { items: SearchListing[]; now: Date }) {
  return (
    <ul
      aria-label={fr.search.results.list}
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 lg:gap-3.5"
    >
      {items.map((item, index) => {
        const card = toPropertyCard(item, now);
        return (
          <ResultItem key={item.id} id={item.id} index={index}>
            <PropertyCard variant="compact" {...card} className="lg:hidden" />
            <PropertyCard variant="wide" {...card} className="hidden lg:block" />
          </ResultItem>
        );
      })}
    </ul>
  );
}
