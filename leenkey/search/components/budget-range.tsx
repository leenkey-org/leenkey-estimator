"use client";

import * as Slider from "@radix-ui/react-slider";
import { UnitInput } from "@/components/shared/unit-input";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import {
  BUDGET_CAP_EUROS,
  BUDGET_STEP_EUROS,
  budgetFromThumbs,
  budgetThumbs,
  wholeNumberInput,
} from "../filters-form";

const t = fr.search.dialog;

// The border in --lk-field (3:1 on white, WCAG 1.4.11), a target of 44 px.
const thumbClassName =
  "relative block size-7 rounded-full border-[1.5px] border-lk-field bg-lk-surface shadow-float outline-none transition-transform duration-140 ease-out-lk after:absolute after:-inset-2 hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid motion-reduce:transition-none";

/**
 * The budget in the way of Airbnb (L1-61): a slider with two thumbs over
 * the fields « Budget minimum » and « Budget maximum », which stay the way to
 * type an exact amount. The slider goes from 0 to 1 500 000 €: a thumb at an
 * end means no limit on its side; an amount typed beyond holds its thumb at
 * the top and is kept (filters-form.ts). Values in euros, as typed.
 */
export function BudgetRange({
  min,
  max,
  onChange,
  error,
  idPrefix,
}: {
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  error?: string;
  /** The ids of the two fields. */
  idPrefix: string;
}) {
  const draft = { min, max };
  // What each thumb says: the amount typed, « Indifférent » without one.
  const spoken = (value: string) => {
    const euros = wholeNumberInput(value);
    return euros === undefined ? fr.search.bar.any : formatPrice(euros * 100);
  };

  return (
    <div className="flex flex-col gap-5">
      <Slider.Root
        min={0}
        max={BUDGET_CAP_EUROS}
        step={BUDGET_STEP_EUROS}
        minStepsBetweenThumbs={1}
        value={budgetThumbs(draft)}
        onValueChange={(thumbs) => {
          const next = budgetFromThumbs(draft, thumbs);
          onChange(next.min, next.max);
        }}
        // A group named for its two thumbs (a label alone is not allowed on a span).
        role="group"
        aria-label={t.sections.budget}
        className="relative mx-3.5 flex h-7 touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-lk-line-strong">
          <Slider.Range className="absolute h-full rounded-full bg-linear-90 from-lk-brand-blue to-lk-brand-violet" />
        </Slider.Track>
        {/* « Minimum », « Maximum »: the group says what they bound, the fields keep the full names. */}
        <Slider.Thumb
          aria-label={t.thumbMin}
          aria-valuetext={spoken(min)}
          className={thumbClassName}
        />
        <Slider.Thumb
          aria-label={t.thumbMax}
          aria-valuetext={spoken(max)}
          className={thumbClassName}
        />
      </Slider.Root>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <UnitInput
          pill
          id={`${idPrefix}-min`}
          label={t.budgetMin}
          unit="€"
          inputMode="numeric"
          maxLength={13}
          autoComplete="off"
          value={min}
          onChange={(event) => onChange(event.target.value, max)}
        />
        <UnitInput
          pill
          id={`${idPrefix}-max`}
          label={t.budgetMax}
          unit="€"
          inputMode="numeric"
          maxLength={13}
          autoComplete="off"
          value={max}
          error={error}
          onChange={(event) => onChange(min, event.target.value)}
        />
      </div>
    </div>
  );
}
