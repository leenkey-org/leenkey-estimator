"use client";

import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useSearch, type FilterField } from "./search-context";
import { countSearchResults } from "../actions";
import { filtersFromForm, formFromFilters, type FiltersForm } from "../filters-form";
import { Button } from "@/components/shared/button";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { Select } from "@/components/shared/select";
import { UnitInput } from "@/components/shared/unit-input";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  DPE_CLASSES,
  OUTDOOR_SPACES,
  PROPERTY_TYPES,
  SEARCH_RADII_KM,
  type SearchFilters,
} from "@/lib/validations/search";

const t = fr.search.dialog;
const COUNTS = [1, 2, 3, 4, 5] as const;

/** Field focused when a chip opens the panel on it. */
const FOCUS_TARGET: Record<FilterField, string> = {
  budget: "filtres-budget-min",
  rooms: "filtres-pieces",
  dpe: "filtres-dpe",
};

/**
 * All the filters (SPEC 8.4): bottom sheet on mobile, centred dialog of
 * 520 px on desktop (docs/DESIGN.md 5, 10.8, 12.5). The choices are a draft:
 * « Voir N biens » applies them, closing the panel drops them. N is counted
 * on the server for the draft, as it changes.
 */
export function FiltersDialog() {
  const { filtersOpen, setFiltersOpen, filtersFocus } = useSearch();
  return (
    <DialogPrimitive.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-lk-ink/40 duration-220",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            if (!filtersFocus) return;
            const target = document.getElementById(FOCUS_TARGET[filtersFocus]);
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            facadeScope,
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lk-md bg-lk-surface shadow-sheet outline-none",
            "lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[85vh] lg:w-130 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lk-md lg:shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            "lg:data-[state=open]:slide-in-from-bottom-4 lg:data-[state=closed]:slide-out-to-bottom-4",
          )}
        >
          <FiltersPanel />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FiltersPanel() {
  const { query, total, placeLabel, radiusAvailable, applyFilters, setFiltersOpen } = useSearch();
  const [form, setForm] = useState<FiltersForm>(() => formFromFilters(query.filters));
  const { filters, errors } = useMemo(
    () => filtersFromForm(form, query.filters),
    [form, query.filters],
  );
  const draftKey = JSON.stringify(filters);
  // Count of the applied filters, known from the page: no request at opening.
  const [count, setCount] = useState<{ key: string; value: number | null }>(() => ({
    key: JSON.stringify(filtersFromForm(formFromFilters(query.filters), query.filters).filters),
    value: total,
  }));
  const invalid = Boolean(errors.price || errors.surface);

  // « Voir N biens »: counted for the draft, 300 ms after the last change.
  useEffect(() => {
    if (invalid || count.key === draftKey) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await countSearchResults(filters);
      if (!cancelled) setCount({ key: draftKey, value: result.ok ? result.data : null });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [draftKey, filters, invalid, count.key]);

  const counting = !invalid && count.key !== draftKey;
  const update = (patch: Partial<FiltersForm>) => setForm((current) => ({ ...current, ...patch }));
  const toggle = <T,>(list: readonly T[], value: T, on: boolean) =>
    on ? [...list, value] : list.filter((item) => item !== value);

  function apply(next: SearchFilters) {
    setFiltersOpen(false);
    applyFilters(next);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-lk-line px-5 py-3.5 lg:px-6">
        <DialogPrimitive.Title className="text-lk-h2 font-bold text-wide text-lk-ink">
          {t.title}
        </DialogPrimitive.Title>
        <DialogPrimitive.Close asChild>
          <IconButton icon={X} variant="outline" size="sm" aria-label={t.close} />
        </DialogPrimitive.Close>
      </div>

      <form
        id="filtres"
        className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 lg:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) apply(filters);
        }}
      >
        {query.filters.location && radiusAvailable && placeLabel ? (
          <SegmentedPicker
            label={t.radius(placeLabel)}
            value={form.radius}
            onValueChange={(radius) => update({ radius })}
            options={[
              { value: "0", label: t.radiusTown },
              ...SEARCH_RADII_KM.map((km) => ({
                value: String(km),
                label: fr.search.location.radius(km),
              })),
            ]}
            className="grid-cols-[1.6fr_repeat(4,1fr)] grid-flow-row"
          />
        ) : null}

        <Select
          id="filtres-type"
          label={t.type}
          value={form.type}
          onChange={(event) => update({ type: event.target.value })}
        >
          <option value="">{t.typeAll}</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {fr.search.types[type]}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <UnitInput
            id={FOCUS_TARGET.budget}
            label={t.budgetMin}
            unit="€"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            value={form.priceMin}
            onChange={(event) => update({ priceMin: event.target.value })}
          />
          <UnitInput
            id="filtres-budget-max"
            label={t.budgetMax}
            unit="€"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            value={form.priceMax}
            error={errors.price ? t.minAboveMax : undefined}
            onChange={(event) => update({ priceMax: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <UnitInput
            id="filtres-surface-min"
            label={t.surfaceMin}
            unit="m²"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            value={form.surfaceMin}
            onChange={(event) => update({ surfaceMin: event.target.value })}
          />
          <UnitInput
            id="filtres-surface-max"
            label={t.surfaceMax}
            unit="m²"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            value={form.surfaceMax}
            error={errors.surface ? t.minAboveMax : undefined}
            onChange={(event) => update({ surfaceMax: event.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            id={FOCUS_TARGET.rooms}
            label={t.rooms}
            value={form.roomsMin}
            onChange={(event) => update({ roomsMin: event.target.value })}
          >
            <option value="">{t.any}</option>
            {COUNTS.map((rooms) => (
              <option key={rooms} value={rooms}>
                {t.roomsAtLeast(rooms)}
              </option>
            ))}
          </Select>
          <Select
            id="filtres-chambres"
            label={t.bedrooms}
            value={form.bedroomsMin}
            onChange={(event) => update({ bedroomsMin: event.target.value })}
          >
            <option value="">{t.any}</option>
            {COUNTS.map((bedrooms) => (
              <option key={bedrooms} value={bedrooms}>
                {t.bedroomsAtLeast(bedrooms)}
              </option>
            ))}
          </Select>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-lk-label font-medium text-lk-ink">{t.outdoor}</legend>
          <div className="flex flex-wrap gap-2">
            {OUTDOOR_SPACES.map((space) => (
              <ChipToggle
                key={space}
                pressed={form.outdoor.includes(space)}
                onPressedChange={(on) => update({ outdoor: toggle(form.outdoor, space, on) })}
              >
                {fr.search.outdoor[space]}
              </ChipToggle>
            ))}
          </div>
          <p className="text-lk-caption text-lk-ink-3">{t.outdoorHelp}</p>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-lk-label font-medium text-lk-ink">{t.equipment}</legend>
          <div className="flex flex-wrap gap-2">
            <ChipToggle pressed={form.parking} onPressedChange={(parking) => update({ parking })}>
              {t.parking}
            </ChipToggle>
            <ChipToggle
              pressed={form.elevator}
              onPressedChange={(elevator) => update({ elevator })}
            >
              {t.elevator}
            </ChipToggle>
          </div>
        </fieldset>

        <Select
          id={FOCUS_TARGET.dpe}
          label={t.dpe}
          value={form.dpeMax}
          onChange={(event) => update({ dpeMax: event.target.value })}
        >
          <option value="">{t.dpeAll}</option>
          {DPE_CLASSES.map((letter) => (
            <option key={letter} value={letter}>
              {t.dpeUpTo(letter)}
            </option>
          ))}
        </Select>
      </form>

      <div className="flex items-center gap-2.5 border-t border-lk-line px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3.5 lg:px-6 lg:pb-5">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() =>
            setForm(
              formFromFilters({
                location: query.filters.location,
                radiusKm: query.filters.radiusKm,
              }),
            )
          }
        >
          {t.clear}
        </Button>
        <Button
          type="submit"
          form="filtres"
          size="lg"
          className="flex-1"
          disabled={invalid}
          loading={counting}
          aria-live="polite"
        >
          {count.value === null ? t.showUnknown : t.show(count.value)}
        </Button>
      </div>
    </>
  );
}
