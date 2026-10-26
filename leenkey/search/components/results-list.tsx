import { toShowcaseCard } from "../cards";
import type { SearchListing } from "../queries";
import { ResultItem } from "./map-sync";
import { ShowcaseCard } from "@/components/shared/showcase-card";
import { fr } from "@/lib/i18n/fr";

/**
 * Results in the cards of direction C (L1-55, « inspire-toi d'Airbnb »,
 * DECISIONS 2026-10-26): the photo first, turned with a swipe on a phone and
 * with arrows on hover from 768 px, a frame that turns blue on hover and
 * press. One column on a phone, two from 768 px and beside the map from
 * 1024 px. Each card lights its pill on the map (map-sync.tsx).
 */
export function ResultsList({ items, now }: { items: SearchListing[]; now: Date }) {
  return (
    <ul
      aria-label={fr.search.results.list}
      className="grid gap-x-4 gap-y-5 md:grid-cols-2 lg:gap-x-5 lg:gap-y-6 2xl:grid-cols-3"
    >
      {items.map((item, index) => (
        <ResultItem key={item.id} id={item.id} index={index}>
          <ShowcaseCard
            {...toShowcaseCard(item, now)}
            swipe
            framed
            // The first photo of the page is its largest image (LCP).
            priority={index === 0}
            sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 280px, (min-width: 768px) 45vw, 92vw"
          />
        </ResultItem>
      ))}
    </ul>
  );
}
