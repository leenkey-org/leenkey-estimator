"use client";

import { useEffect, useRef } from "react";
import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";

/**
 * « Voir plus » (SPEC 8.4, pages of 20): the next page is added under the
 * results, the URL keeps it (page=2) and the keyboard focus moves to the
 * first new result. Always rendered, so that it can move the focus once the
 * last page has arrived.
 */
export function LoadMore({ shown, hasMore }: { shown: number; hasMore: boolean }) {
  const { showMore, isPending } = useSearch();
  const focusIndex = useRef<number | null>(null);

  useEffect(() => {
    const index = focusIndex.current;
    if (index === null || shown <= index) return;
    focusIndex.current = null;
    // Mobile and desktop cards are both in the list: focus the visible link.
    const links = document.querySelectorAll<HTMLAnchorElement>(`[data-result-index="${index}"] a`);
    [...links].find((link) => link.offsetParent !== null)?.focus();
  }, [shown]);

  if (!hasMore) return null;
  return (
    <div className="mt-6 flex justify-center">
      <Button
        variant="outline-ink"
        loading={isPending && focusIndex.current !== null}
        onClick={() => {
          focusIndex.current = shown;
          showMore();
        }}
      >
        {fr.search.results.loadMore}
      </Button>
    </div>
  );
}
