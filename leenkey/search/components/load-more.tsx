"use client";

import { useEffect, useRef } from "react";
import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { Skeleton } from "@/components/shared/skeleton";
import { fr } from "@/lib/i18n/fr";

/**
 * « Voir plus » (SPEC 8.4, pages of 20): the next page is added under the
 * results, the URL keeps it (page=2) and the keyboard focus moves to the
 * first new result. While it loads, stone blocks stand where the next cards
 * will be (docs/DESIGN.md 10.8). Always rendered, so that it can move the
 * focus once the last page has arrived.
 */
export function LoadMore({ shown, hasMore }: { shown: number; hasMore: boolean }) {
  const { showMore, isPending } = useSearch();
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = focusIndex.current;
    if (index === null || shown <= index) return;
    focusIndex.current = null;
    // The link of the card (its title), the first of its item.
    const links = document.querySelectorAll<HTMLAnchorElement>(`[data-result-index="${index}"] a`);
    [...links].find((link) => link.offsetParent !== null)?.focus();
  }, [shown]);

  if (!hasMore) return null;
  const loading = isPending && focusIndex.current !== null;
  return (
    <>
      {loading ? (
        // The size of the cards (L1-55): the next ones take their place without a jump.
        <div className="mt-5 grid gap-x-4 gap-y-5 md:grid-cols-2 lg:mt-6 lg:gap-x-5 lg:gap-y-6 2xl:grid-cols-3">
          <Skeleton className="aspect-[1/1.25] rounded-lk-2xl" />
          <Skeleton className="hidden aspect-[1/1.25] rounded-lk-2xl md:block" />
          <Skeleton className="hidden aspect-[1/1.25] rounded-lk-2xl 2xl:block" />
        </div>
      ) : null}
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline-ink"
          loading={loading}
          onClick={() => {
            focusIndex.current = shown;
            showMore();
          }}
        >
          {fr.search.results.loadMore}
        </Button>
      </div>
    </>
  );
}
