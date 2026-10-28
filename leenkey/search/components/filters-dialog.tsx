"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpDown, Car, Sun, TreeDeciduous, Wind, X, type LucideIcon } from "lucide-react";
import { BudgetRange } from "./budget-range";
import { useSearch } from "./search-context";
import { TypeTiles } from "./type-tiles";
import { countSearchResults } from "../actions";
import { filtersFromForm, formFromFilters, type FiltersForm } from "../filters-form";
import { Button } from "@/components/shared/button";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { facadeScope } from "@/components/shared/facade-root";
import { IconButton } from "@/components/shared/icon-button";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
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
const COUNTS = [1, 2, 3, 4, 5];

const OUTDOOR_ICONS: Record<(typeof OUTDOOR_SPACES)[number], LucideIcon> = {
  balcon: Wind,
  terrasse: Sun,
  jardin: TreeDeciduous,
};

/** A part of the panel, a line above it and its title (the sections of Airbnb). */
function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-lk-line py-6 first:border-t-0 first:pt-1">
      <div className="flex flex-col gap-1">
        <h3 className="text-lk-h3 font-semibold text-lk-ink lg:text-lk-h2">{title}</h3>
        {text ? <p className="text-lk-compact text-lk-ink-3">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * « Tous », « 1+ » to « 5+ », and a value of the address beyond them
 * (« ?pieces_min=8 ») so that it shows chosen. The visible text is the name
 * of each button (WCAG 2.5.3); the name of the row says what is counted.
 */
function countOptions(current: string) {
  const value = Number(current);
  const counts =
    current && Number.isInteger(value) && !COUNTS.includes(value) ? [...COUNTS, value] : COUNTS;
  return [
    { value: "", label: t.anyShort },
    ...counts.map((count) => ({ value: String(count), label: t.roomsShort(count) })),
  ];
}

/**
 * All the filters (SPEC 8.4), in the way of Airbnb since L1-61: bottom sheet
 * on mobile, centred dialog of 720 px on desktop (docs/DESIGN.md 5, 10.8,
 * 12.5), its title centred and its close button on the left; titled
 * sections with a line between them: the type in tiles, the budget with its
 * slider, the surface, rooms and bedrooms, the outdoor space and the
 * equipment in chips with their pictogram, the energy class. The choices are
 * a draft: « Voir N biens » applies them, « Tout effacer » empties them,
 * closing the panel drops them. N is counted on the server for the draft,
 * as it changes.
 */
export function FiltersDialog() {
  const { filtersOpen, setFiltersOpen } = useSearch();
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
          className={cn(
            facadeScope,
            // The rounded shapes of direction C (DECISIONS 2026-10-26).
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-lk-3xl bg-lk-surface shadow-sheet outline-none",
            "lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[85vh] lg:w-180 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lk-3xl lg:shadow-lk-d-search",
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
      let value: number | null = null;
      try {
        const result = await countSearchResults(filters);
        value = result.ok ? result.data : null;
      } catch {
        // Network or new deployment: « Voir les biens » without a number.
      }
      if (!cancelled) setCount({ key: draftKey, value });
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
      {/* The title in the middle, the close button on the left (Airbnb). */}
      <div className="relative flex items-center justify-center border-b border-lk-line px-14 py-3.5 lg:py-4.5">
        <DialogPrimitive.Close asChild>
          <IconButton
            icon={X}
            variant="transparent"
            size="sm"
            aria-label={t.close}
            className="absolute left-3 lg:left-4"
          />
        </DialogPrimitive.Close>
        <DialogPrimitive.Title className="text-lk-h3 font-bold text-lk-ink">
          {t.title}
        </DialogPrimitive.Title>
      </div>

      <form
        id="filtres"
        className="flex flex-1 flex-col overflow-y-auto px-5 py-4 lg:px-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (!invalid) apply(filters);
        }}
      >
        {query.filters.location && radiusAvailable && placeLabel ? (
          <Section title={t.radius(placeLabel)}>
            <SegmentedPicker
              shape="pill"
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
          </Section>
        ) : null}

        <Section title={t.sections.type}>
          <TypeTiles
            id="filtres-type"
            label={t.type}
            value={form.type}
            onValueChange={(type) => update({ type })}
          />
        </Section>

        <Section title={t.sections.budget} text={t.sections.budgetText}>
          <BudgetRange
            idPrefix="filtres-budget"
            min={form.priceMin}
            max={form.priceMax}
            error={errors.price ? t[errors.price] : undefined}
            onChange={(priceMin, priceMax) => update({ priceMin, priceMax })}
          />
        </Section>

        <Section title={t.sections.surface}>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <UnitInput
              pill
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
              pill
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
        </Section>

        <Section title={t.sections.rooms}>
          <SegmentedPicker
            id="filtres-pieces"
            shape="pill"
            label={t.rooms}
            value={form.roomsMin}
            onValueChange={(roomsMin) => update({ roomsMin })}
            options={countOptions(form.roomsMin)}
          />
          <SegmentedPicker
            id="filtres-chambres"
            shape="pill"
            label={t.bedrooms}
            value={form.bedroomsMin}
            onValueChange={(bedroomsMin) => update({ bedroomsMin })}
            options={countOptions(form.bedroomsMin)}
          />
        </Section>

        <Section title={t.sections.outdoor} text={t.outdoorHelp}>
          <div role="group" aria-label={t.outdoor} className="flex flex-wrap gap-2.5">
            {OUTDOOR_SPACES.map((space) => {
              const Icon = OUTDOOR_ICONS[space];
              return (
                <ChipToggle
                  key={space}
                  pressed={form.outdoor.includes(space)}
                  onPressedChange={(on) => update({ outdoor: toggle(form.outdoor, space, on) })}
                  className="h-11 px-4.5 text-lk-compact"
                >
                  <Icon aria-hidden="true" strokeWidth={1.7} className="size-4.5" />
                  {fr.search.outdoor[space]}
                </ChipToggle>
              );
            })}
          </div>
        </Section>

        <Section title={t.sections.equipment}>
          <div role="group" aria-label={t.equipment} className="flex flex-wrap gap-2.5">
            <ChipToggle
              pressed={form.parking}
              onPressedChange={(parking) => update({ parking })}
              className="h-11 px-4.5 text-lk-compact"
            >
              <Car aria-hidden="true" strokeWidth={1.7} className="size-4.5" />
              {t.parking}
            </ChipToggle>
            <ChipToggle
              pressed={form.elevator}
              onPressedChange={(elevator) => update({ elevator })}
              className="h-11 px-4.5 text-lk-compact"
            >
              <ArrowUpDown aria-hidden="true" strokeWidth={1.7} className="size-4.5" />
              {t.elevator}
            </ChipToggle>
          </div>
        </Section>

        <Section title={t.sections.dpe}>
          <SegmentedPicker
            id="filtres-dpe"
            shape="pill"
            label={t.dpeMax}
            value={form.dpeMax}
            onValueChange={(dpeMax) => update({ dpeMax })}
            options={[
              { value: "", label: t.anyShort },
              ...DPE_CLASSES.map((letter) => ({ value: letter, label: letter })),
            ]}
            // Two rows of four: 44 px wide at least on a phone.
            className="grid-flow-row grid-cols-4 sm:grid-cols-8"
          />
        </Section>
      </form>

      <div className="flex items-center justify-between gap-4 border-t border-lk-line px-5 pt-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:px-8 lg:pb-4.5">
        {/* « Tout effacer », underlined on the left (Airbnb). */}
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center rounded-lk-sm text-lk-compact font-semibold text-lk-ink underline underline-offset-2 hover:no-underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
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
        </button>
        <Button
          type="submit"
          form="filtres"
          variant="cta"
          size="lg"
          className="min-w-0 flex-1 sm:flex-none sm:px-8"
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
