"use client";

import * as RadioGroup from "@radix-ui/react-radio-group";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
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

/** « Tous les biens » in a toggle group, where "" means none pressed. */
const ALL = "tous";

// Chosen: an inset ring of 1 px over the border, so that nothing moves.
const tileClassName = cn(
  "group flex min-h-21 flex-col items-start justify-between gap-3 rounded-lk-xl border p-3.5 text-left",
  "transition-[border-color,background-color,box-shadow] duration-140 ease-out-lk",
  "border-lk-line-strong bg-lk-surface hover:border-lk-ink-3",
  "aria-checked:border-lk-ink aria-checked:bg-lk-blue-tint aria-checked:ring-1 aria-checked:ring-lk-ink aria-checked:ring-inset",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
);

/**
 * The type of property in tiles (L1-61, the property types of Airbnb): « Tous
 * les biens » then each type, its pictogram over its name; the chosen one
 * outlined in ink on the light indigo, its pictogram in the gradient. Both
 * are announced as radio buttons (aria-checked).
 * radio (the « Filtres » panel, a draft): a radio group, an arrow moves and
 * chooses. toggle (the panel of the bar, applied at once): a toggle group of
 * one choice, an arrow moves without choosing, Enter or a click chooses; so
 * that an arrow never applies a type and closes the panel.
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
  as?: "radio" | "toggle";
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
        className="size-7 text-lk-ink group-aria-checked:lk-icon-gradient"
      />
      <span className="text-lk-compact font-semibold text-lk-ink">{optionLabel}</span>
    </>
  );
  if (as === "toggle") {
    return (
      <ToggleGroup.Root
        id={id}
        type="single"
        aria-label={label}
        value={value || ALL}
        // Pressed again, the chosen one would be « unpressed » (""): it stays chosen.
        onValueChange={(next) => onValueChange(next ? (next === ALL ? "" : next) : value)}
        className={gridClassName}
      >
        {options.map(({ value: optionValue, label: optionLabel, icon }) => (
          <ToggleGroup.Item
            key={optionValue || ALL}
            value={optionValue || ALL}
            className={tileClassName}
          >
            {content(icon, optionLabel)}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
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
