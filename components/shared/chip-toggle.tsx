import type { ComponentProps } from "react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export type ChipToggleProps = Omit<ComponentProps<typeof Toggle>, "variant" | "size"> & {
  /** 36 px instead of 40 px, for the mobile filter bar. */
  compact?: boolean;
};

/** Shape, inactive and active states of a chip (docs/DESIGN.md 10.1). */
export function chipClassName(compact = false) {
  return cn(
    "relative inline-flex min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap",
    // The strong line of direction C: the chip stays drawn on white (DESIGN.md 2.1).
    "rounded-lk-sm border-[1.5px] border-lk-line-strong bg-lk-surface px-3.5",
    "text-lk-label font-medium text-lk-ink",
    "transition-colors duration-140 ease-out-lk",
    // components/ui/toggle.tsx greys the chip on hover: keep it white,
    // darken the border of an inactive chip only.
    "hover:bg-lk-surface hover:text-lk-ink data-[state=off]:enabled:hover:border-lk-ink-3",
    "data-[state=on]:border-lk-blue data-[state=on]:bg-lk-blue-tint data-[state=on]:text-lk-blue",
    "data-[state=on]:hover:bg-lk-blue-tint data-[state=on]:hover:text-lk-blue",
    "focus-visible:ring-0 focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
    "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-45",
    // 44 px touch target (DESIGN.md 15).
    compact
      ? "h-9 after:absolute after:inset-x-0 after:-inset-y-1"
      : "h-10 after:absolute after:inset-x-0 after:-inset-y-0.5",
  );
}

/**
 * Strengths and quick filters (docs/DESIGN.md 10.1): a 4 px rectangle that the
 * Radix toggle exposes with aria-pressed. Extends components/ui/toggle.tsx.
 */
export function ChipToggle({ compact = false, className, ...props }: ChipToggleProps) {
  return (
    <Toggle
      variant={null}
      size={null}
      className={cn(chipClassName(compact), className)}
      {...props}
    />
  );
}

export type ChipButtonProps = ComponentProps<"button"> & {
  compact?: boolean;
};

/**
 * Same look as an inactive chip, for a chip that opens something (the filters
 * panel on a given field) instead of switching a state: a plain button, so
 * that it is not announced as a toggle.
 */
export function ChipButton({
  compact = false,
  className,
  type = "button",
  ...props
}: ChipButtonProps) {
  return (
    <button
      type={type}
      data-state="off"
      className={cn(chipClassName(compact), className)}
      {...props}
    />
  );
}
