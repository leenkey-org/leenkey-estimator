"use client";

import { Building2, House, LandPlot, LayoutGrid, Warehouse } from "lucide-react";
import { useSearch } from "./search-context";
import { DpeBadge } from "@/components/shared/dpe-badge";
import { FilterMenu, type FilterMenuOption } from "@/components/shared/filter-menu";
import { formatPrice, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { DPE_CLASSES, PROPERTY_TYPES, type SearchFilters } from "@/lib/validations/search";

const t = fr.search.bar;

/** Steps of the budget and surface menus; a value set in the panel is added. */
const BUDGET_STEPS_EUROS = [
  150_000, 200_000, 250_000, 300_000, 350_000, 400_000, 450_000, 500_000, 600_000, 700_000, 800_000,
  1_000_000,
];
const SURFACE_STEPS = [20, 30, 40, 50, 60, 70, 80, 100, 120, 150];
const ROOMS = [1, 2, 3, 4, 5];

const TYPE_ICONS = {
  appartement: Building2,
  maison: House,
  terrain: LandPlot,
  autre: Warehouse,
} as const;

function withValue(steps: number[], value: number | undefined) {
  return value === undefined || steps.includes(value)
    ? steps
    : [...steps, value].sort((a, b) => a - b);
}

const number = (value: string) => (value ? Number(value) : undefined);

/** Between two parts of the bar. */
function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-8 w-px shrink-0 bg-lk-line", className)} />;
}

/**
 * The parts of the rounded search bar after « Où ? », from 1024 px
 * (docs/DESIGN.md 10.3, 12.6, direction C): type, budget, rooms, then
 * surface and DPE from 1280 px; below that width they stay in « Filtres ».
 * Each opens a rounded menu (FilterMenu); a choice applies the search at
 * once. « Créer une alerte » comes with L3-06.
 */
export function FilterBar({ className }: { className?: string }) {
  const { query, applyFilters } = useSearch();
  const filters = query.filters;
  const update = (patch: Partial<SearchFilters>) => applyFilters({ ...filters, ...patch });
  const budgetMax =
    filters.priceMaxCents === undefined ? undefined : Math.round(filters.priceMaxCents / 100);

  const types: FilterMenuOption[] = [
    { value: "", label: t.typeAll, icon: LayoutGrid },
    ...PROPERTY_TYPES.map((type) => ({
      value: type,
      label: fr.search.types[type],
      icon: TYPE_ICONS[type],
    })),
  ];
  const budgets: FilterMenuOption[] = [
    { value: "", label: t.any },
    ...withValue(BUDGET_STEPS_EUROS, budgetMax).map((euros) => ({
      value: String(euros),
      label: t.priceUpTo(formatPrice(euros * 100)),
    })),
  ];
  const rooms: FilterMenuOption[] = [
    { value: "", label: t.any },
    ...withValue(ROOMS, filters.roomsMin).map((count) => ({
      value: String(count),
      label: t.roomsAtLeast(count),
    })),
  ];
  const surfaces: FilterMenuOption[] = [
    { value: "", label: t.any },
    ...withValue(SURFACE_STEPS, filters.surfaceMin).map((surface) => ({
      value: String(surface),
      label: t.surfaceAtLeast(formatSurface(surface)),
    })),
  ];
  const dpe: FilterMenuOption[] = [
    { value: "", label: t.dpeAll },
    ...DPE_CLASSES.map((letter) => ({
      value: letter,
      label: t.dpeClass(letter),
      // The label says the classes: the letter is drawn, not read twice.
      adornment: (
        <span aria-hidden="true" className="flex shrink-0">
          <DpeBadge value={letter} compact />
        </span>
      ),
    })),
  ];

  return (
    <div className={cn("min-w-0 items-center", className)}>
      <Divider />
      <FilterMenu
        label={t.type}
        value={filters.type ?? ""}
        display={filters.type ? fr.search.types[filters.type] : t.typeAll}
        options={types}
        onValueChange={(value) => update({ type: PROPERTY_TYPES.find((type) => type === value) })}
      />
      <Divider />
      <FilterMenu
        label={t.budgetTitle}
        value={budgetMax === undefined ? "" : String(budgetMax)}
        display={budgetMax === undefined ? t.any : t.priceUpTo(formatPrice(budgetMax * 100))}
        options={budgets}
        onValueChange={(value) => {
          const euros = number(value);
          const max = euros === undefined ? undefined : euros * 100;
          const min = filters.priceMinCents;
          update({
            priceMaxCents: max,
            priceMinCents: min !== undefined && max !== undefined && min > max ? undefined : min,
          });
        }}
      />
      <Divider />
      <FilterMenu
        label={t.rooms}
        value={filters.roomsMin === undefined ? "" : String(filters.roomsMin)}
        display={filters.roomsMin ? t.roomsAtLeast(filters.roomsMin) : t.any}
        options={rooms}
        onValueChange={(value) => update({ roomsMin: number(value) })}
      />
      <Divider className="hidden xl:block" />
      <FilterMenu
        label={t.surface}
        value={filters.surfaceMin === undefined ? "" : String(filters.surfaceMin)}
        display={filters.surfaceMin ? t.surfaceAtLeast(formatSurface(filters.surfaceMin)) : t.any}
        options={surfaces}
        className="hidden xl:flex"
        onValueChange={(value) => {
          const min = number(value);
          const max = filters.surfaceMax;
          update({
            surfaceMin: min,
            surfaceMax: min !== undefined && max !== undefined && max < min ? undefined : max,
          });
        }}
      />
      <Divider className="hidden xl:block" />
      <FilterMenu
        label={t.dpe}
        value={filters.dpeMax ?? ""}
        display={filters.dpeMax ? t.dpeClass(filters.dpeMax) : t.dpeAll}
        options={dpe}
        className="hidden xl:flex"
        onValueChange={(value) =>
          update({ dpeMax: DPE_CLASSES.find((letter) => letter === value) })
        }
      />
    </div>
  );
}
