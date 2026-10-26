"use client";

import { useSearch } from "./search-context";
import { FilterMenu } from "@/components/shared/filter-menu";
import { fr } from "@/lib/i18n/fr";
import { SEARCH_SORTS } from "@/lib/validations/search";

const t = fr.search.results;

/**
 * Sort of the results (SPEC 8.4): « Prix croissant ⌄ » in blue
 * (docs/DESIGN.md 10.3), opening a rounded menu like the filters of the bar.
 */
export function SortSelect() {
  const { query, applySort } = useSearch();
  return (
    <FilterMenu
      variant="ghost"
      align="end"
      label={t.sort}
      value={query.sort}
      display={t.sorts[query.sort]}
      options={SEARCH_SORTS.map((sort) => ({ value: sort, label: t.sorts[sort] }))}
      onValueChange={(value) => {
        const sort = SEARCH_SORTS.find((candidate) => candidate === value);
        if (sort) applySort(sort);
      }}
    />
  );
}
