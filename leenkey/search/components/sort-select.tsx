"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { useSearch } from "./search-context";
import { fr } from "@/lib/i18n/fr";
import { SEARCH_SORTS } from "@/lib/validations/search";

const t = fr.search.results;

/**
 * Sort of the results (SPEC 8.4), a ghost select: « Prix croissant ⌄ »
 * (docs/DESIGN.md 10.3). The native select lies transparent over its label,
 * which keeps the chevron next to the text.
 */
export function SortSelect() {
  const { query, applySort } = useSearch();
  const id = useId();
  return (
    <div className="relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lk-sm px-2.5 text-lk-button-sm font-semibold text-lk-blue transition-colors duration-140 ease-out-lk hover:bg-lk-blue-tint has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-lk-blue has-[select:focus-visible]:outline-solid">
      <label htmlFor={id} className="sr-only">
        {t.sort}
      </label>
      <span aria-hidden="true" className="whitespace-nowrap">
        {t.sorts[query.sort]}
      </span>
      <ChevronDown aria-hidden="true" strokeWidth={2.5} className="size-3.5 shrink-0" />
      <select
        id={id}
        value={query.sort}
        onChange={(event) => {
          const sort = SEARCH_SORTS.find((value) => value === event.target.value);
          if (sort) applySort(sort);
        }}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 outline-none"
      >
        {SEARCH_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t.sorts[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}
