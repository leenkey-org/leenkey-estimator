"use client";

import { useEffect, useRef } from "react";
import { RESULTS_GRID } from "./results-grid";
import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { Skeleton } from "@/components/shared/skeleton";
import { frSearch } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { search: frSearch } as const;

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
        // The shape of the cards (photo, title, town, price): the next ones
        // take their place without a jump.
        <div className={cn(RESULTS_GRID, "mt-7 lg:mt-8")}>
          <CardSkeleton />
          <CardSkeleton className="hidden md:flex" />
          <CardSkeleton className="hidden 2xl:flex" />
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

/** A ShowcaseCard to come: its photo (1 / 0.95, radius 18), then its three lines. */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-col gap-3", className)}>
      <Skeleton className="aspect-[1/0.95] rounded-lk-d-card" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4.5 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-1 h-5 w-1/3" />
      </div>
    </div>
  );
}
