import { toShowcaseCard } from "../cards";
import type { SearchListing } from "../queries";
import { ResultItem } from "./map-sync";
import { RESULTS_GRID } from "./results-grid";
import { ShowcaseCard } from "@/components/shared/showcase-card";
import { frSearch } from "@/lib/i18n/sections/search";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { search: frSearch } as const;

/**
 * Results in the card of the home page (« Biens à vendre près de chez
 * vous », the reference since the design pass of 2026-11-26; framed cards
 * before, L1-55): the photo first, without a frame, turned with a swipe on a
 * phone and with arrows on hover from 768 px. No heart here: the search
 * never had one, and every link of the list is a listing (tests/e2e). One column on a phone, two
 * from 768 px and beside the map from 1024 px. Each card lights its pill on
 * the map, and its photo is ringed in return (map-sync.tsx).
 */
export function ResultsList({ items, now }: { items: SearchListing[]; now: Date }) {
  return (
    <ul aria-label={fr.search.results.list} className={RESULTS_GRID}>
      {items.map((item, index) => (
        <ResultItem key={item.id} id={item.id} index={index}>
          <ShowcaseCard
            {...toShowcaseCard(item, now)}
            swipe
            // The first photo of the page is its largest image (LCP).
            priority={index === 0}
            sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 280px, (min-width: 768px) 45vw, 92vw"
          />
        </ResultItem>
      ))}
    </ul>
  );
}
