"use client";

import { useState } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { useSearch } from "./search-context";
import { BudgetRange } from "./budget-range";
import { TypeTiles } from "./type-tiles";
import { budgetLabel } from "../filter-labels";
import { budgetError, budgetPreset, wholeNumberInput, type BudgetDraft } from "../filters-form";
import { Button } from "@/components/shared/button";
import { FilterPopover } from "@/components/shared/filter-popover";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, type SearchFilters } from "@/lib/validations/search";

const t = fr.search.bar;
const d = fr.search.dialog;

/** Budgets of one tap in the panel of the budget: the usual steps of the launch zone. */
const BUDGET_PRESETS_EUROS = [200_000, 300_000, 400_000, 500_000, 700_000];
const ROOMS = [1, 2, 3, 4, 5];
/** « Tous » in a toggle group, where "" means none pressed. */
const ANY = "tous";

/** Between two parts of the bar. */
function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-8 w-px shrink-0 bg-lk-line", className)} />;
}

const text = (euros: number | undefined) => (euros === undefined ? "" : String(euros));

/** A pill of a panel: white, the chosen one in the gradient of an action (charte D). */
const pill = cn(
  "inline-flex h-11 min-w-0 items-center justify-center rounded-full border-[1.5px] px-3.5 text-lk-label font-semibold tabular",
  "transition-colors duration-140 ease-out-lk",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
  "border-lk-line-strong bg-lk-surface text-lk-ink hover:border-lk-ink-3",
);

/**
 * The parts of the rounded search bar after « Où ? », from 1024 px
 * (docs/DESIGN.md 10.3, 12.6), each opening a panel in the way of Airbnb
 * (L1-61): the type in tiles, the budget with its slider, its two fields and
 * the usual budgets (applied with « Appliquer »), the rooms in pills. A tile
 * or a pill applies the search at once and closes the panel; they are
 * toggle groups of one choice, where an arrow moves without choosing. The
 * surface, the outdoor space, the equipment and the energy class are in
 * « Filtres ».
 */
export function FilterBar({ className }: { className?: string }) {
  const { query, applyFilters } = useSearch();
  const filters = query.filters;
  const update = (patch: Partial<SearchFilters>) => applyFilters({ ...filters, ...patch });
  const [open, setOpen] = useState<"type" | "budget" | "rooms" | null>(null);
  const toggle = (name: "type" | "budget" | "rooms") => (next: boolean) =>
    setOpen(next ? name : null);

  // The draft of the budget, from the applied filters each time its panel opens.
  const [budget, setBudget] = useState<BudgetDraft>({ min: "", max: "" });
  const minEuros = wholeNumberInput(budget.min);
  const maxEuros = wholeNumberInput(budget.max);
  const error = budgetError(budget);

  return (
    <div className={cn("min-w-0 items-center", className)}>
      <Divider />
      <FilterPopover
        label={t.type}
        display={filters.type ? fr.search.types[filters.type] : t.typeAll}
        active={filters.type !== undefined}
        open={open === "type"}
        onOpenChange={toggle("type")}
        panelClassName="w-120"
      >
        <TypeTiles
          as="toggle"
          label={t.type}
          value={filters.type ?? ""}
          onValueChange={(value) => {
            setOpen(null);
            if (value !== (filters.type ?? "")) {
              update({ type: PROPERTY_TYPES.find((type) => type === value) });
            }
          }}
        />
      </FilterPopover>
      <Divider />
      <FilterPopover
        label={t.budgetTitle}
        display={budgetLabel(filters) ?? t.any}
        active={filters.priceMinCents !== undefined || filters.priceMaxCents !== undefined}
        open={open === "budget"}
        onOpenChange={(next) => {
          if (next) {
            setBudget({
              min: text(filters.priceMinCents && Math.round(filters.priceMinCents / 100)),
              max: text(filters.priceMaxCents && Math.round(filters.priceMaxCents / 100)),
            });
          }
          toggle("budget")(next);
        }}
        panelClassName="w-112"
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (error) return;
            setOpen(null);
            const priceMinCents = minEuros === undefined ? undefined : minEuros * 100;
            const priceMaxCents = maxEuros === undefined ? undefined : maxEuros * 100;
            // The same budget: the panel closes, the results stay as they are.
            if (
              priceMinCents !== filters.priceMinCents ||
              priceMaxCents !== filters.priceMaxCents
            ) {
              update({ priceMinCents, priceMaxCents });
            }
          }}
        >
          <BudgetRange
            idPrefix="barre-budget"
            min={budget.min}
            max={budget.max}
            error={error ? d[error] : undefined}
            onChange={(min, max) => setBudget({ min, max })}
          />
          <div role="group" aria-label={t.presets} className="flex flex-wrap gap-2">
            {BUDGET_PRESETS_EUROS.map((euros) => (
              <button
                key={euros}
                type="button"
                aria-pressed={maxEuros === euros}
                onClick={() => setBudget(budgetPreset(budget, euros))}
                className={cn(
                  pill,
                  "aria-pressed:lk-gradient aria-pressed:border-transparent aria-pressed:text-white",
                )}
              >
                {t.priceUpTo(formatPrice(euros * 100))}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-lk-line pt-4">
            <button
              type="button"
              onClick={() => setBudget({ min: "", max: "" })}
              className="inline-flex min-h-11 items-center rounded-lk-sm text-lk-compact font-semibold text-lk-ink underline underline-offset-2 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
            >
              {t.clear}
            </button>
            <Button type="submit" disabled={Boolean(error)}>
              {t.apply}
            </Button>
          </div>
        </form>
      </FilterPopover>
      <Divider />
      <FilterPopover
        label={t.rooms}
        display={filters.roomsMin ? t.roomsAtLeast(filters.roomsMin) : t.any}
        active={filters.roomsMin !== undefined}
        open={open === "rooms"}
        onOpenChange={toggle("rooms")}
        align="end"
        panelClassName="w-96"
      >
        <ToggleGroup.Root
          type="single"
          aria-label={d.rooms}
          value={filters.roomsMin === undefined ? ANY : String(filters.roomsMin)}
          onValueChange={(value) => {
            setOpen(null);
            // "": the chosen one pressed again, nothing changes.
            if (!value) return;
            const rooms = value === ANY ? undefined : wholeNumberInput(value);
            if (rooms !== filters.roomsMin) update({ roomsMin: rooms });
          }}
          className="grid grid-cols-6 gap-1.5"
        >
          {[undefined, ...ROOMS].map((count) => (
            <ToggleGroup.Item
              key={count ?? ANY}
              value={count === undefined ? ANY : String(count)}
              className={cn(
                pill,
                "px-1 aria-checked:lk-gradient aria-checked:border-transparent aria-checked:text-white aria-checked:hover:brightness-108",
              )}
            >
              {count === undefined ? d.anyShort : d.roomsShort(count)}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </FilterPopover>
    </div>
  );
}
