"use client";

import {
  Building2,
  Car,
  House,
  LandPlot,
  LayoutGrid,
  TreeDeciduous,
  type LucideIcon,
} from "lucide-react";
import { categoryOn, toggleCategory, type Category } from "../categories";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { SearchFilters } from "@/lib/validations/search";

const t = fr.search.categories;

const CATEGORIES: ReadonlyArray<{ key: Category; icon: LucideIcon }> = [
  { key: "all", icon: LayoutGrid },
  { key: "maison", icon: House },
  { key: "appartement", icon: Building2 },
  { key: "jardin", icon: TreeDeciduous },
  { key: "parking", icon: Car },
  { key: "terrain", icon: LandPlot },
];

/**
 * The row of categories under the search bar (L1-61, the categories of
 * Airbnb), at every width: a pictogram over its name, the one on in ink with
 * its pictogram in the gradient and the indigo line under it. Each is a
 * filter pressed or not (aria-pressed), kept with the others (« Maisons » and
 * « Avec jardin » together). « Tous les biens » is not a switch: it clears
 * the type, the garden and the parking, and is the current one when none of
 * them is on (aria-current). Scrolled sideways on a phone. Controlled: the
 * search gives its filters, /design a state of its own.
 */
export function SearchCategories({
  filters,
  onChange,
  className,
}: {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={t.label}
      className={cn(
        // Scrolls under the gutters of the page, whatever their width (L1-56).
        "mx-[calc(-1*var(--lk-gutter))] flex gap-6 overflow-x-auto px-(--lk-gutter) [scrollbar-width:none] md:gap-9 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {CATEGORIES.map(({ key, icon: Icon }) => {
        const on = categoryOn(key, filters);
        const all = key === "all";
        return (
          <button
            key={key}
            type="button"
            aria-pressed={all ? undefined : on}
            aria-current={all && on ? "true" : undefined}
            onClick={() => {
              const next = toggleCategory(key, filters);
              if (next !== filters) onChange(next);
            }}
            className={cn(
              "flex min-w-14 shrink-0 flex-col items-center gap-1.5 border-b-2 px-0.5 pt-2 pb-2.5 text-lk-caption font-medium whitespace-nowrap md:text-lk-label",
              "transition-colors duration-140 ease-out-lk",
              on
                ? "border-lk-indigo-mark text-lk-ink"
                : "border-transparent text-lk-ink-3 hover:border-lk-line-strong hover:text-lk-ink",
              "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
            )}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={1.6}
              className={cn("size-6", on && "lk-icon-gradient")}
            />
            {t[key]}
          </button>
        );
      })}
    </div>
  );
}
