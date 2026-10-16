import type { ComponentProps } from "react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export type ChipToggleProps = Omit<ComponentProps<typeof Toggle>, "variant" | "size"> & {
  /** 36 px instead of 40 px, for the mobile filter bar. */
  compact?: boolean;
};

/**
 * Strengths and quick filters (docs/DESIGN.md 10.1): a 4 px rectangle that the
 * Radix toggle exposes with aria-pressed. Extends components/ui/toggle.tsx.
 */
export function ChipToggle({ compact = false, className, ...props }: ChipToggleProps) {
  return (
    <Toggle
      variant={null}
      size={null}
      className={cn(
        "relative min-w-0 rounded-lk-sm border-[1.5px] border-lk-line bg-lk-surface px-3.5",
        "text-lk-label font-medium text-lk-ink",
        "transition-colors duration-140 ease-out-lk",
        // components/ui/toggle.tsx greys the chip on hover: keep it white,
        // darken the border of an inactive chip only.
        "hover:bg-lk-surface hover:text-lk-ink data-[state=off]:enabled:hover:border-lk-ink-3",
        "data-[state=on]:border-lk-blue data-[state=on]:bg-lk-blue-tint data-[state=on]:text-lk-blue",
        "data-[state=on]:hover:bg-lk-blue-tint data-[state=on]:hover:text-lk-blue",
        "focus-visible:ring-0 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
        "disabled:pointer-events-auto disabled:cursor-not-allowed disabled:opacity-45",
        // 44 px touch target (DESIGN.md 15).
        compact
          ? "h-9 after:absolute after:inset-x-0 after:-inset-y-1"
          : "h-10 after:absolute after:inset-x-0 after:-inset-y-0.5",
        className,
      )}
      {...props}
    />
  );
}
