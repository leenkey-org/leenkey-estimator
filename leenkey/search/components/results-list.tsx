import { toPropertyCard } from "../cards";
import type { SearchListing } from "../queries";
import { PropertyCard } from "@/components/shared/property-card";
import { fr } from "@/lib/i18n/fr";

/**
 * Results (docs/DESIGN.md 10.3, 12.5, 12.6): compact cards up to 1023 px (two
 * columns from 768 px), wide cards from 1024 px. Until the map (L1-16) takes
 * the right half of the page, the wide cards use two columns.
 */
export function ResultsList({ items, now }: { items: SearchListing[]; now: Date }) {
  return (
    <ul aria-label={fr.search.results.list} className="grid gap-3 md:grid-cols-2 lg:gap-3.5">
      {items.map((item, index) => {
        const card = toPropertyCard(item, now);
        return (
          <li key={item.id} data-result-index={index}>
            <PropertyCard variant="compact" {...card} className="lg:hidden" />
            <PropertyCard variant="wide" {...card} className="hidden lg:block" />
          </li>
        );
      })}
    </ul>
  );
}
