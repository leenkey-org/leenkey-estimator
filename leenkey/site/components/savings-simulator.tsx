"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { DEFAULT_SAVINGS_PRICE_EUROS, SAVINGS_PRICES_EUROS, savings } from "../savings";

const t = fr.site.home.savings;

/**
 * The prices to choose from and the comparison (docs/design-handoff/SPECS.md
 * 3, item 6): native radio buttons drawn as pills (arrows move between them),
 * then the bars of the agency, of the Accompagné plan and of Autonomie (from
 * 768 px), and the amount saved, read again when it changes.
 */
export function SavingsSimulator({ accompaniedCents }: { accompaniedCents: number }) {
  const name = useId();
  const [priceEuros, setPriceEuros] = useState<number>(DEFAULT_SAVINGS_PRICE_EUROS);
  const result = savings(priceEuros * 100, accompaniedCents);
  return (
    <div className="flex flex-col gap-4 md:gap-6.5">
      <fieldset>
        <legend className="sr-only">{t.prices}</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0">
          {SAVINGS_PRICES_EUROS.map((value) => (
            <label key={value} className="shrink-0">
              <input
                type="radio"
                name={name}
                value={value}
                checked={priceEuros === value}
                onChange={() => setPriceEuros(value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "flex h-11 cursor-pointer items-center rounded-full border-[1.5px] px-4 text-lk-compact font-bold tabular md:h-12 md:px-5 md:text-lk-body",
                  "transition-colors duration-140 ease-out-lk",
                  "peer-checked:border-lk-blue peer-checked:bg-lk-blue-tint peer-checked:text-lk-blue-dark",
                  "border-lk-line-strong bg-lk-surface text-lk-ink hover:border-lk-blue-border",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lk-blue peer-focus-visible:outline-solid",
                )}
              >
                {formatPrice(value * 100)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-3.5 rounded-lk-2xl border border-lk-line bg-lk-surface p-4.5 shadow-lk-block md:gap-5 md:rounded-lk-3xl md:p-8">
        <Bar
          label={
            <>
              <span className="md:hidden">{t.agencyShort}</span>
              <span className="hidden md:inline">{t.agency}</span>
            </>
          }
          amount={t.approximately(formatPrice(result.agencyCents))}
          track="bg-lk-agency"
        />
        <Bar
          label={t.accompanied}
          amount={formatPrice(accompaniedCents)}
          blue
          track="bg-lk-sand"
          fill={result.planBarPercent}
        />
        <Bar
          label={t.autonomy}
          amount={formatPrice(0)}
          blue
          track="bg-lk-sand"
          className="hidden md:block"
        />
        <p
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lk-xl bg-lk-blue-tint px-4 py-3.5 md:px-5.5 md:py-4.5"
        >
          <span className="text-lk-compact font-bold text-lk-ink md:text-lk-body-lg">
            {t.saved}
          </span>
          <span className="text-[1.5rem] leading-none font-extrabold tabular text-lk-blue-dark text-heavy md:text-[2.25rem]">
            {formatPrice(result.savedCents)}
          </span>
        </p>
        <p className="text-lk-caption text-lk-ink-2 md:text-lk-secondary">{t.note}</p>
      </div>
    </div>
  );
}

function Bar({
  label,
  amount,
  blue = false,
  track,
  fill,
  className,
}: {
  label: React.ReactNode;
  amount: string;
  blue?: boolean;
  track: string;
  /** Width of the blue part, in %. */
  fill?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between gap-3 text-lk-compact font-bold text-lk-ink md:mb-2 md:text-lk-body-lg">
        <span>{label}</span>
        <span className={cn("tabular", blue && "text-lk-blue")}>{amount}</span>
      </div>
      <div aria-hidden="true" className={cn("h-3 overflow-hidden rounded-full md:h-3.5", track)}>
        {fill !== undefined ? (
          <div
            className="h-full rounded-full bg-lk-blue transition-[width] duration-220 ease-out-lk motion-reduce:transition-none"
            style={{ width: `${fill}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
