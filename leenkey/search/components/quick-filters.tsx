"use client";

import type { ReactNode } from "react";
import { useSearch, type FilterField } from "./search-context";
import {
  bedroomsLabel,
  budgetLabel,
  dpeLabel,
  outdoorLabel,
  roomsLabel,
  surfaceLabel,
} from "../filter-labels";
import { ChipButton, ChipToggle } from "@/components/shared/chip-toggle";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { OUTDOOR_SPACES, type SearchFilters } from "@/lib/validations/search";

const t = fr.search;

/**
 * Row of chips under the mobile search field (docs/DESIGN.md 10.3, 12.5),
 * scrolled sideways. An active filter is a pressed chip: pressing it removes
 * the filter. « Appartement » and « Extérieur » switch at once; « Budget »,
 * « Pièces » and « DPE » need a value and open the filters panel on it.
 */
export function QuickFilters({ className }: { className?: string }) {
  const { query, applyFilters, openFilters } = useSearch();
  const filters = query.filters;
  const update = (patch: Partial<SearchFilters>) => applyFilters({ ...filters, ...patch });

  const valueChip = (
    key: string,
    label: string | undefined,
    clear: Partial<SearchFilters>,
    field: FilterField,
    inactiveLabel: string,
  ): ReactNode =>
    label ? (
      <ChipToggle key={key} compact pressed onPressedChange={() => update(clear)}>
        {label}
      </ChipToggle>
    ) : (
      <ChipButton key={key} compact aria-haspopup="dialog" onClick={() => openFilters(field)}>
        {inactiveLabel}
      </ChipButton>
    );

  const activeChip = (key: string, label: string | undefined, clear: Partial<SearchFilters>) =>
    label ? (
      <ChipToggle key={key} compact pressed onPressedChange={() => update(clear)}>
        {label}
      </ChipToggle>
    ) : null;

  return (
    <div
      role="group"
      aria-label={t.quickFilters}
      className={cn(
        "-mx-5 flex gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <ChipToggle
        compact
        pressed={filters.type !== undefined}
        onPressedChange={(pressed) => update({ type: pressed ? "appartement" : undefined })}
      >
        {t.types[filters.type ?? "appartement"]}
      </ChipToggle>
      {valueChip(
        "budget",
        budgetLabel(filters),
        { priceMinCents: undefined, priceMaxCents: undefined },
        "budget",
        t.chips.budget,
      )}
      {valueChip("rooms", roomsLabel(filters), { roomsMin: undefined }, "rooms", t.chips.rooms)}
      <ChipToggle
        compact
        pressed={filters.outdoor !== undefined}
        onPressedChange={(pressed) =>
          update({ outdoor: pressed ? [...OUTDOOR_SPACES] : undefined })
        }
      >
        {outdoorLabel(filters)}
      </ChipToggle>
      {valueChip("dpe", dpeLabel(filters), { dpeMax: undefined }, "dpe", t.chips.dpe)}
      {activeChip("surface", surfaceLabel(filters), {
        surfaceMin: undefined,
        surfaceMax: undefined,
      })}
      {activeChip("bedrooms", bedroomsLabel(filters), { bedroomsMin: undefined })}
      {activeChip("parking", filters.parking ? t.dialog.parking : undefined, {
        parking: undefined,
      })}
      {activeChip("elevator", filters.elevator ? t.dialog.elevator : undefined, {
        elevator: undefined,
      })}
    </div>
  );
}
