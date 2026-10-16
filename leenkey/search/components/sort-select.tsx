"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useSearch } from "./search-context";
import { fr } from "@/lib/i18n/fr";
import { SEARCH_SORTS } from "@/lib/validations/search";

const t = fr.search.results;

/** Sort of the results (SPEC 8.4), a ghost select: « Prix croissant ⌄ » (docs/DESIGN.md 10.3). */
export function SortSelect() {
  const { query, applySort } = useSearch();
  const id = useId();
  return (
    <div className="relative shrink-0">
      <label htmlFor={id} className="sr-only">
        {t.sort}
      </label>
      <select
        id={id}
        value={query.sort}
        onChange={(event) => {
          const sort = SEARCH_SORTS.find((value) => value === event.target.value);
          if (sort) applySort(sort);
        }}
        className="h-11 cursor-pointer appearance-none rounded-lk-sm bg-transparent pl-2.5 pr-7 text-lk-button-sm font-semibold text-lk-blue transition-colors duration-140 ease-out-lk hover:bg-lk-blue-tint"
      >
        {SEARCH_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t.sorts[sort]}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={2.5}
        className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-lk-blue"
      />
    </div>
  );
}
