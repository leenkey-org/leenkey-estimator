"use client";

import * as Slider from "@radix-ui/react-slider";
import { UnitInput } from "@/components/shared/unit-input";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { wholeNumberInput } from "../filters-form";

const t = fr.search.dialog;

/** Top of the slider, in euros: a maximum there is « no maximum ». */
export const BUDGET_CAP_EUROS = 1_500_000;
const STEP_EUROS = 5_000;

const thumbClassName =
  "block size-7 rounded-full border border-lk-line-strong bg-lk-surface shadow-float outline-none transition-transform duration-140 ease-out-lk hover:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid motion-reduce:transition-none";

/**
 * The budget in the way of Airbnb (L1-61): a slider with two thumbs over
 * the two fields « Budget minimum » and « Budget maximum », which stay the
 * way to type an exact amount. The slider goes from 0 to 1 500 000 €: a
 * thumb at an end means no limit on that side. Values in euros, as typed.
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
  /** The ids of the two fields (the panel focuses the first one from a chip). */
  idPrefix: string;
}) {
  const low = Math.min(wholeNumberInput(min) ?? 0, BUDGET_CAP_EUROS);
  const high = Math.min(wholeNumberInput(max) ?? BUDGET_CAP_EUROS, BUDGET_CAP_EUROS);
  const text = (euros: number, top: boolean) =>
    top && euros >= BUDGET_CAP_EUROS ? fr.search.bar.any : formatPrice(euros * 100);

  return (
    <div className="flex flex-col gap-5">
      <Slider.Root
        min={0}
        max={BUDGET_CAP_EUROS}
        step={STEP_EUROS}
        minStepsBetweenThumbs={1}
        value={[low, Math.max(low, high)]}
        onValueChange={([from, to]) =>
          onChange(
            from && from > 0 ? String(from) : "",
            to !== undefined && to < BUDGET_CAP_EUROS ? String(to) : "",
          )
        }
        // A group named for its two thumbs (a label alone is not allowed on a span).
        role="group"
        aria-label={t.budgetRange}
        className="relative mx-3.5 flex h-7 touch-none items-center select-none"
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-lk-line-strong">
          <Slider.Range className="absolute h-full rounded-full bg-linear-90 from-lk-brand-blue to-lk-brand-violet" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={t.budgetMin}
          aria-valuetext={text(low, false)}
          className={thumbClassName}
        />
        <Slider.Thumb
          aria-label={t.budgetMax}
          aria-valuetext={text(high, true)}
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
          maxLength={11}
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
          maxLength={11}
          autoComplete="off"
          value={max}
          error={error}
          onChange={(event) => onChange(min, event.target.value)}
        />
      </div>
    </div>
  );
}
