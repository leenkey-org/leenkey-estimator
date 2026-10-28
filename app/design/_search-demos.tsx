"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { chipClassName } from "@/components/shared/chip-toggle";
import { FilterPopover } from "@/components/shared/filter-popover";
import { BudgetRange } from "@/leenkey/search/components/budget-range";
import { SearchCategories } from "@/leenkey/search/components/search-categories";
import { TypeTiles } from "@/leenkey/search/components/type-tiles";
import { activeChips } from "@/leenkey/search/filter-labels";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES, type SearchFilters } from "@/lib/validations/search";

const t = fr.search.bar;

/**
 * The panels of the search bar in the /design catalogue (L1-61): the type in
 * tiles (one choice, applied at once), the budget with its slider and fields.
 */
export function FilterPopoverDemo() {
  const [open, setOpen] = useState<"type" | "budget" | null>(null);
  const [type, setType] = useState("appartement");
  const [budget, setBudget] = useState({ min: "", max: "400000" });
  const chosen = PROPERTY_TYPES.find((item) => item === type);
  return (
    <div className="flex max-w-full items-center overflow-x-auto rounded-full border border-lk-line-strong bg-lk-surface p-1.5 shadow-lk-field">
      <FilterPopover
        label={t.type}
        display={chosen ? fr.search.types[chosen] : t.typeAll}
        active={chosen !== undefined}
        open={open === "type"}
        onOpenChange={(next) => setOpen(next ? "type" : null)}
        panelClassName="w-120"
      >
        <TypeTiles
          as="toggle"
          label={t.type}
          value={type}
          onValueChange={(value) => {
            setType(value);
            setOpen(null);
          }}
        />
      </FilterPopover>
      <span aria-hidden="true" className="h-8 w-px shrink-0 bg-lk-line" />
      <FilterPopover
        label={t.budgetTitle}
        display={budget.max || budget.min ? `${budget.min || "0"} – ${budget.max || "…"} €` : t.any}
        active={Boolean(budget.min || budget.max)}
        open={open === "budget"}
        onOpenChange={(next) => setOpen(next ? "budget" : null)}
        panelClassName="w-112"
      >
        <BudgetRange
          idPrefix="design-budget"
          min={budget.min}
          max={budget.max}
          onChange={(min, max) => setBudget({ min, max })}
        />
      </FilterPopover>
    </div>
  );
}

/** The categories under the bar, pressed here on a state of their own. */
export function CategoriesDemo() {
  const [filters, setFilters] = useState<SearchFilters>({ type: "maison" });
  return <SearchCategories filters={filters} onChange={setFilters} />;
}

/** The active filters of a phone: one press removes one. */
export function ActiveFiltersDemo() {
  const [filters, setFilters] = useState<SearchFilters>({
    priceMaxCents: 40_000_000,
    roomsMin: 3,
    dpeMax: "D",
  });
  const chips = activeChips(filters);
  return (
    <ul aria-label={fr.search.chips.label} className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            aria-label={fr.search.chips.remove(chip.label)}
            onClick={() => setFilters(chip.without)}
            data-state="on"
            className={cn(chipClassName(true), "gap-1.5 pr-3 tabular")}
          >
            {chip.label}
            <X aria-hidden="true" strokeWidth={2.2} className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
