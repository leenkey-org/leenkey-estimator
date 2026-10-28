"use client";

import { X } from "lucide-react";
import { activeChips } from "../filter-labels";
import { useSearch } from "./search-context";
import { chipClassName } from "@/components/shared/chip-toggle";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.search.chips;

/**
 * The active filters under the categories on a phone (L1-61): what a
 * category does not show (budget, surface, rooms, energy class…), each a
 * blue chip that one press removes. Nothing when no such filter is on; the
 * bar shows them from 1024 px, with « Filtres » and its count.
 */
export function ActiveFilters({ className }: { className?: string }) {
  const { query, applyFilters } = useSearch();
  const chips = activeChips(query.filters);
  if (chips.length === 0) return null;
  return (
    <ul
      aria-label={t.label}
      className={cn(
        // Scrolls under the gutters of the page, as the categories.
        "mx-[calc(-1*var(--lk-gutter))] flex gap-2 overflow-x-auto px-(--lk-gutter) py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button
            type="button"
            aria-label={t.remove(chip.label)}
            onClick={() => applyFilters(chip.without)}
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
