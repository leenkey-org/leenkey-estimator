"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import { Building2, House, LandPlot, LayoutGrid, Warehouse, type LucideIcon } from "lucide-react";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { PROPERTY_TYPES } from "@/lib/validations/search";

const ICONS: Record<(typeof PROPERTY_TYPES)[number], LucideIcon> = {
  appartement: Building2,
  maison: House,
  terrain: LandPlot,
  autre: Warehouse,
};

const tileClassName = cn(
  "group flex min-h-21 flex-col items-start justify-between gap-3 rounded-lk-xl border p-3.5 text-left",
  "transition-[border-color,background-color,box-shadow] duration-140 ease-out-lk",
  "border-lk-line-strong bg-lk-surface hover:border-lk-ink-3",
  "data-[state=checked]:border-2 data-[state=checked]:border-lk-ink data-[state=checked]:bg-lk-blue-tint data-[state=checked]:p-[13px]",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
);

/**
 * The type of property in tiles (L1-61, the property types of Airbnb): « Tous
 * les biens » then each type, its pictogram over its name; the chosen one
 * outlined in ink on the light indigo, its pictogram in the gradient.
 * radio (the « Filtres » panel, a draft): a radio group, arrows move between
 * the tiles. buttons (the panel of the bar, applied at once): buttons
 * pressed or not, so that an arrow never applies a type and closes the panel.
 */
export function TypeTiles({
  value,
  onValueChange,
  label,
  id,
  as = "radio",
  className,
}: {
  /** "" for every type. */
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  id?: string;
  as?: "radio" | "buttons";
  className?: string;
}) {
  const options = [
    { value: "", label: fr.search.bar.typeAll, icon: LayoutGrid },
    ...PROPERTY_TYPES.map((type) => ({
      value: type,
      label: fr.search.types[type],
      icon: ICONS[type],
    })),
  ];
  const gridClassName = cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3", className);
  const content = (Icon: LucideIcon, optionLabel: string) => (
    <>
      <Icon
        aria-hidden="true"
        strokeWidth={1.6}
        className="size-7 text-lk-ink group-data-[state=checked]:lk-icon-gradient"
      />
      <span className="text-lk-compact font-semibold text-lk-ink">{optionLabel}</span>
    </>
  );
  if (as === "buttons") {
    return (
      <div id={id} role="group" aria-label={label} className={gridClassName}>
        {options.map(({ value: optionValue, label: optionLabel, icon }) => (
          <button
            key={optionValue}
            type="button"
            aria-pressed={optionValue === value}
            data-state={optionValue === value ? "checked" : "unchecked"}
            onClick={() => onValueChange(optionValue)}
            className={tileClassName}
          >
            {content(icon, optionLabel)}
          </button>
        ))}
      </div>
    );
  }
  return (
    <RadioGroup.Root
      id={id}
      aria-label={label}
      value={value}
      onValueChange={onValueChange}
      className={gridClassName}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon }) => (
        <RadioGroup.Item key={optionValue} value={optionValue} className={tileClassName}>
          {content(icon, optionLabel)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
