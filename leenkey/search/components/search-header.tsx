"use client";

import { SlidersHorizontal } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { LocationField } from "./location-field";
import { QuickFilters } from "./quick-filters";
import { useSearch } from "./search-context";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { countActiveFilters } from "@/lib/validations/search";

const t = fr.search;

/** Count of the active filters over the « Filtres » button. */
function Count({ value }: { value: number }) {
  return value ? (
    <span
      aria-hidden="true"
      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-lk-surface bg-lk-navy px-1 text-lk-micro font-semibold tabular text-white"
    >
      {value}
    </span>
  ) : null;
}

/**
 * Search controls in the rounded shapes of direction C (Younes, « des formes
 * arrondies pour les champs comme sur Airbnb », DECISIONS 2026-10-26).
 * Mobile (docs/DESIGN.md 10.3, 12.5): the place in a pill and a round
 * « Filtres » button (48 × 48, count of active filters), then the row of
 * chips. From 1024 px (12.6): one rounded bar, « Où ? » then type, budget,
 * rooms (surface and DPE from 1280 px), each opening its menu, and
 * « Filtres » for the rest.
 */
export function SearchHeader() {
  const { query, openFilters } = useSearch();
  const active = countActiveFilters(query.filters);
  return (
    <div role="search" aria-label={t.bar.label} className="border-b border-lk-line bg-lk-surface">
      {/* Aligned with the results (same container and gutters), from 1024 px
          over the list and the map, the whole width of the page. */}
      <div className="w-full lk-gutter pb-3 pt-4.5 lg:py-4 2xl:[--lk-gutter:2rem]">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <div className="flex min-w-0 flex-1 items-center lg:flex-initial lg:rounded-full lg:border lg:border-lk-line-strong lg:bg-lk-surface lg:p-1.5 lg:shadow-lk-field">
            {/* Room for « Sainte-Geneviève-des-Bois · 20 km ». */}
            <LocationField className="min-w-0 flex-1 lg:w-72 lg:flex-none xl:w-80" />
            <FilterBar className="hidden lg:flex" />
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            // One name: « Filtres », and the count when filters are on.
            aria-label={active ? `${t.filtersButton}, ${t.activeFilters(active)}` : t.filtersButton}
            onClick={() => openFilters()}
            className={cn(
              "relative flex shrink-0 items-center justify-center gap-2 rounded-full transition-colors duration-140 ease-out-lk",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
              // Mobile: the round blue button; from 1024 px, a white pill after the bar.
              "size-12 bg-lk-blue text-white hover:bg-lk-blue-hover",
              "lg:h-14 lg:w-auto lg:border lg:border-lk-line-strong lg:bg-lk-surface lg:px-5 lg:text-lk-button-md lg:font-bold lg:text-lk-ink lg:shadow-lk-field lg:hover:bg-lk-sand",
              "[&_svg]:size-5 lg:[&_svg]:size-4.5",
            )}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span aria-hidden="true" className="hidden lg:inline">
              {t.filtersButton}
            </span>
            <Count value={active} />
          </button>
        </div>
        <QuickFilters className="mt-2 lg:hidden" />
      </div>
    </div>
  );
}
