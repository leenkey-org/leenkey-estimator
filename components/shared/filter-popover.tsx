"use client";

import type { ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { facadeScope } from "./facade-root";
import { cn } from "@/lib/utils";

export type FilterPopoverProps = {
  /** Name of the filter, above its value in the segment. */
  label: string;
  /** What the segment shows: the value chosen, or « Indifférent ». */
  display: string;
  /** A value is chosen: the segment says it in blue. */
  active: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel: tiles, a range, pills. */
  children: ReactNode;
  /** Width of the panel. */
  panelClassName?: string;
  align?: "start" | "center" | "end";
  className?: string;
};

/**
 * A part of the rounded search bar that opens a panel (L1-61, the panels of
 * Airbnb): the name of the filter above its value, and a large rounded panel
 * under it for tiles, a budget range or pills, where a menu of options was
 * (FilterMenu). Radix popover: Escape and a press outside close it, the focus
 * comes back to the segment.
 */
export function FilterPopover({
  label,
  display,
  active,
  open,
  onOpenChange,
  children,
  panelClassName,
  align = "start",
  className,
}: FilterPopoverProps) {
  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger
        className={cn(
          "group flex min-h-14 min-w-0 max-w-56 shrink flex-col items-start justify-center rounded-full px-5 py-1.5 text-left outline-none",
          "transition-colors duration-140 ease-out-lk hover:bg-lk-sand data-[state=open]:bg-lk-surface data-[state=open]:shadow-lk-field",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
          className,
        )}
      >
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
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={12}
          collisionPadding={16}
          aria-label={label}
          className={cn(
            facadeScope,
            "z-50 max-h-(--radix-popover-content-available-height) overflow-y-auto rounded-lk-3xl border border-lk-line bg-lk-surface p-5 shadow-lk-d-search outline-none",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-top-1 motion-reduce:animate-none",
            panelClassName,
          )}
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
