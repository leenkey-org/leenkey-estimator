"use client";

import type { ReactNode } from "react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { facadeScope } from "./facade-root";
import { cn } from "@/lib/utils";

export type FilterMenuOption = {
  /** "" for « Tous », « Indifférent »: no filter. */
  value: string;
  label: string;
  icon?: LucideIcon;
  /** Drawn before the label instead of an icon (the letter of a DPE class). */
  adornment?: ReactNode;
};

export type FilterMenuProps = {
  /** Name of the filter: the title of a segment, spoken before the value of a ghost menu. */
  label: string;
  value: string;
  /** What the trigger shows: the chosen option, or « Tous les biens ». */
  display: string;
  options: readonly FilterMenuOption[];
  onValueChange: (value: string) => void;
  /**
   * segment: a part of the rounded search bar, its name above its value
   * (docs/DESIGN.md 10.3, direction C); ghost: a blue word and its chevron
   * (the sort of the results).
   */
  variant?: "segment" | "ghost";
  align?: "start" | "end";
  className?: string;
};

const panelClassName = cn(
  facadeScope,
  "z-50 max-h-[min(26rem,var(--radix-dropdown-menu-content-available-height))] min-w-64 overflow-y-auto rounded-lk-xl border border-lk-line bg-lk-surface p-2 shadow-lk-block outline-none",
  "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-1 motion-reduce:animate-none",
);

const itemClassName = cn(
  "relative flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-lk-lg py-2 pl-3 pr-10 text-lk-body text-lk-ink outline-none",
  "transition-colors duration-140 ease-out-lk data-[highlighted]:bg-lk-sand",
  "data-[state=checked]:font-semibold data-[state=checked]:text-lk-blue",
);

/**
 * A single choice in a rounded menu (Younes, « menus déroulants trop
 * Excel », DECISIONS 2026-10-26): Radix menu with radio items, so arrows,
 * Home, End, the first letters and Escape work, and the chosen option is
 * announced as checked. The menu says its name, the option chosen is blue
 * with a check.
 */
export function FilterMenu({
  label,
  value,
  display,
  options,
  onValueChange,
  variant = "segment",
  align = "start",
  className,
}: FilterMenuProps) {
  const active = value !== "";
  return (
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger
        className={cn(
          "group outline-none transition-colors duration-140 ease-out-lk",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
          variant === "segment"
            ? "flex min-h-14 min-w-0 flex-col items-start justify-center rounded-full px-5 py-1.5 text-left hover:bg-lk-sand data-[state=open]:bg-lk-surface data-[state=open]:shadow-lk-field"
            : "relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-lk-button-sm font-semibold text-lk-blue hover:bg-lk-blue-tint data-[state=open]:bg-lk-blue-tint",
          className,
        )}
      >
        {variant === "segment" ? (
          <>
            <span className="text-lk-caption font-bold text-lk-ink">{label}</span>
            <span
              className={cn(
                "flex max-w-full items-center gap-1 whitespace-nowrap text-lk-compact",
                active ? "font-semibold text-lk-blue" : "text-lk-ink-3",
              )}
            >
              <span className="truncate">{display}</span>
              <ChevronDown
                aria-hidden="true"
                className="size-3.5 shrink-0 transition-transform duration-140 ease-out-lk group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </span>
          </>
        ) : (
          <>
            <span className="sr-only">{`${label} : `}</span>
            <span className="whitespace-nowrap">{display}</span>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={2.5}
              className="size-3.5 shrink-0 transition-transform duration-140 ease-out-lk group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </>
        )}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={10}
          collisionPadding={16}
          aria-label={label}
          className={panelClassName}
        >
          <MenuPrimitive.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map(({ value: optionValue, label: optionLabel, icon: Icon, adornment }) => (
              <MenuPrimitive.RadioItem
                key={optionValue}
                value={optionValue}
                className={itemClassName}
              >
                {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : adornment}
                <span>{optionLabel}</span>
                <MenuPrimitive.ItemIndicator className="absolute right-3 flex">
                  <Check aria-hidden="true" className="size-4.5" strokeWidth={2.5} />
                </MenuPrimitive.ItemIndicator>
              </MenuPrimitive.RadioItem>
            ))}
          </MenuPrimitive.RadioGroup>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
