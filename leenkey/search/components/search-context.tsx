"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { rememberSearch } from "../last-search";
import { cn } from "@/lib/utils";
import {
  searchHref,
  type SearchBbox,
  type SearchFilters,
  type SearchQuery,
} from "@/lib/validations/search";

// The URL is the state of the search (SPEC 8.4: shareable filters): every
// change navigates to the new URL and the Server Component renders the
// results. This context gives the controls the current query, a navigate()
// that keeps them responsive (transition) and the filters panel state.

type SearchContextValue = {
  query: SearchQuery;
  /** Total of the current results, null when the search failed. */
  total: number | null;
  /** Name of the searched place (« Savigny-sur-Orge »), for the field and the panel. */
  placeLabel: string | null;
  /** True when the place has a centre: the radius can be chosen. */
  radiusAvailable: boolean;
  isPending: boolean;
  /**
   * New filters: back to the first page. The area of the map (L1-16b) stays
   * while the place searched is the same; another place drops it.
   */
  applyFilters: (filters: SearchFilters) => void;
  /** « Rechercher dans cette zone » (L1-16b): the listings inside the area of the map. */
  applyBbox: (bbox: SearchBbox) => void;
  applySort: (sort: SearchQuery["sort"]) => void;
  /** « Voir plus »: next page, without scrolling to the top. */
  showMore: () => void;
  filtersOpen: boolean;
  openFilters: () => void;
  setFiltersOpen: (open: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext);
  if (!value) throw new Error("useSearch must be used inside <SearchProvider>");
  return value;
}

export function SearchProvider({
  query,
  total,
  placeLabel,
  radiusAvailable,
  children,
}: {
  query: SearchQuery;
  total: number | null;
  placeLabel: string | null;
  radiusAvailable: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => rememberSearch(searchHref(query)), [query]);

  const go = useCallback(
    (next: SearchQuery, scroll: boolean) => {
      startTransition(() => router.push(searchHref(next), { scroll }));
    },
    [router],
  );

  const value = useMemo<SearchContextValue>(
    () => ({
      query,
      total,
      placeLabel,
      radiusAvailable,
      isPending,
      applyFilters: (filters) =>
        go(
          {
            filters,
            sort: query.sort,
            page: 1,
            bbox: filters.location === query.filters.location ? query.bbox : undefined,
          },
          true,
        ),
      // The list from its top (the map beside it is held under the top bar).
      applyBbox: (bbox) => go({ filters: query.filters, sort: query.sort, page: 1, bbox }, true),
      applySort: (sort) => go({ filters: query.filters, sort, page: 1, bbox: query.bbox }, true),
      showMore: () => go({ ...query, page: query.page + 1 }, false),
      filtersOpen,
      openFilters: () => setFiltersOpen(true),
      setFiltersOpen,
    }),
    [query, total, placeLabel, radiusAvailable, isPending, go, filtersOpen],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

/** Results area: marked busy and dimmed while the next results load. */
export function ResultsRegion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { isPending } = useSearch();
  return (
    <div
      aria-busy={isPending || undefined}
      className={cn(
        "transition-opacity duration-140 ease-out-lk",
        isPending && "opacity-60",
        className,
      )}
    >
      {children}
    </div>
  );
}
