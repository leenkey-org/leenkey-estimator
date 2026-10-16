"use client";

import { SlidersHorizontal } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { LocationField } from "./location-field";
import { QuickFilters } from "./quick-filters";
import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { countActiveFilters } from "@/lib/validations/search";

const t = fr.search;

/**
 * Search controls. Mobile (docs/DESIGN.md 10.3, 12.5): field and filters
 * button (48 × 48, count of active filters), then the row of chips. From
 * 1024 px (12.6): field of 300 px followed by the filter bar.
 */
export function SearchHeader() {
  const { query, openFilters } = useSearch();
  const active = countActiveFilters(query.filters);
  return (
    <div role="search" aria-label={t.bar.label} className="border-b border-lk-line bg-lk-surface">
      {/* Aligned with the results (same container and gutters). */}
      <div className="mx-auto max-w-lk-page px-5 pb-3 pt-4.5 md:px-10 lg:py-4">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <LocationField className="min-w-0 flex-1 lg:w-75 lg:flex-none" />
          <Button
            aria-haspopup="dialog"
            onClick={() => openFilters()}
            className="size-12 shrink-0 px-0 lg:hidden [&_svg]:size-5"
          >
            <SlidersHorizontal aria-hidden="true" />
            <span className="sr-only">
              {active ? `${t.filtersButton}, ${t.activeFilters(active)}` : t.filtersButton}
            </span>
            {active ? (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-lk-surface bg-lk-navy px-1 text-lk-micro font-semibold tabular text-white"
              >
                {active}
              </span>
            ) : null}
          </Button>
          <FilterBar className="hidden lg:flex" />
        </div>
        <QuickFilters className="mt-2 lg:hidden" />
      </div>
    </div>
  );
}
