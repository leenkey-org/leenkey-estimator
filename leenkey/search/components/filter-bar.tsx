"use client";

import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { FilterSelect } from "@/components/shared/filter-select";
import { formatPrice, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { DPE_CLASSES, PROPERTY_TYPES, type SearchFilters } from "@/lib/validations/search";

const t = fr.search.bar;

/** Steps of the budget and surface selects; a value set in the panel is added. */
const BUDGET_STEPS_EUROS = [
  150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 450_000, 500_000, 600_000, 700_000, 800_000,
  1_000_000,
];
const SURFACE_STEPS = [20, 30, 40, 50, 60, 70, 80, 100, 120, 150];
const ROOMS = [1, 2, 3, 4, 5];

function withValue(steps: number[], value: number | undefined) {
  return value === undefined || steps.includes(value)
    ? steps
    : [...steps, value].sort((a, b) => a - b);
}

/**
 * Desktop filter bar (docs/DESIGN.md 10.3, 12.6), after the search field:
 * type, budget, rooms, then surface and DPE from 1280 px; below that width
 * they stay in « Plus de filtres ». « Créer une alerte » comes with L3-06.
 */
export function FilterBar({ className }: { className?: string }) {
  const { query, applyFilters, openFilters } = useSearch();
  const filters = query.filters;
  const update = (patch: Partial<SearchFilters>) => applyFilters({ ...filters, ...patch });
  const number = (value: string) => (value ? Number(value) : undefined);

  const budgetMax =
    filters.priceMaxCents === undefined ? undefined : Math.round(filters.priceMaxCents / 100);

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <FilterSelect
        label={t.type}
        active={filters.type !== undefined}
        value={filters.type ?? ""}
        onChange={(event) =>
          update({ type: PROPERTY_TYPES.find((type) => type === event.target.value) })
        }
      >
        <option value="">{t.type}</option>
        {PROPERTY_TYPES.map((type) => (
          <option key={type} value={type}>
            {fr.search.types[type]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t.budgetLabel}
        active={budgetMax !== undefined}
        value={budgetMax ?? ""}
        onChange={(event) => {
          const euros = number(event.target.value);
          const max = euros === undefined ? undefined : euros * 100;
          const min = filters.priceMinCents;
          update({
            priceMaxCents: max,
            priceMinCents: min !== undefined && max !== undefined && min > max ? undefined : min,
          });
        }}
      >
        <option value="">{t.budget}</option>
        {withValue(BUDGET_STEPS_EUROS, budgetMax).map((euros) => (
          <option key={euros} value={euros}>
            {t.priceUpTo(formatPrice(euros * 100))}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t.roomsLabel}
        active={filters.roomsMin !== undefined}
        value={filters.roomsMin ?? ""}
        onChange={(event) => update({ roomsMin: number(event.target.value) })}
      >
        <option value="">{t.rooms}</option>
        {withValue(ROOMS, filters.roomsMin).map((rooms) => (
          <option key={rooms} value={rooms}>
            {t.roomsAtLeast(rooms)}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t.surfaceLabel}
        active={filters.surfaceMin !== undefined}
        value={filters.surfaceMin ?? ""}
        containerClassName="hidden xl:block"
        onChange={(event) => {
          const min = number(event.target.value);
          const max = filters.surfaceMax;
          update({
            surfaceMin: min,
            surfaceMax: min !== undefined && max !== undefined && max < min ? undefined : max,
          });
        }}
      >
        <option value="">{t.surface}</option>
        {withValue(SURFACE_STEPS, filters.surfaceMin).map((surface) => (
          <option key={surface} value={surface}>
            {t.surfaceAtLeast(formatSurface(surface))}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label={t.dpeLabel}
        active={filters.dpeMax !== undefined}
        value={filters.dpeMax ?? ""}
        containerClassName="hidden xl:block"
        onChange={(event) =>
          update({ dpeMax: DPE_CLASSES.find((letter) => letter === event.target.value) })
        }
      >
        <option value="">{t.dpe}</option>
        {DPE_CLASSES.map((letter) => (
          <option key={letter} value={letter}>
            {t.dpeUpTo(letter)}
          </option>
        ))}
      </FilterSelect>

      <Button
        variant="outline-ink"
        aria-haspopup="dialog"
        onClick={() => openFilters()}
        className="shrink-0 whitespace-nowrap px-3.5 text-lk-label"
      >
        {t.more}
      </Button>
    </div>
  );
}
