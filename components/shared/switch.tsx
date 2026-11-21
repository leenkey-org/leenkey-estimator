"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type SwitchProps = Omit<ComponentProps<"button">, "role" | "onChange" | "children"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Its name: what is switched on or off. */
  "aria-label": string;
};

/**
 * Switch (docs/DESIGN.md 12 « lignes d'alerte avec interrupteur », L3-06): a
 * button of role switch, 44 × 24 px with a touch target of 44 px, blue when
 * on. Its state is read by its role, never by its colour alone: the caller
 * writes it beside (« Active », « En pause »).
 */
export function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-140 ease-out-lk",
        // 44 px touch target (DESIGN.md 15).
        "after:absolute after:-inset-y-2.5 after:inset-x-0 after:content-['']",
        "focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue",
        "disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "bg-lk-blue" : "bg-lk-ink-3",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 rounded-full bg-white transition-transform duration-140 ease-out-lk motion-reduce:transition-none",
          checked ? "translate-x-5.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
