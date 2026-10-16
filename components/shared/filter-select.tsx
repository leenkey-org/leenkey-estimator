import { useId, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectProps = Omit<ComponentProps<"select">, "size"> & {
  /** Read by screen readers; the first option names the filter on screen. */
  label: string;
  /** A value is chosen: tinted blue (docs/DESIGN.md 10.3, FilterBar). */
  active?: boolean;
  containerClassName?: string;
};

/**
 * Select of the desktop filter bar (docs/DESIGN.md 10.3): 44 px, label in the
 * field, never on two lines; blue tint when a value is chosen. Native, like
 * Select: keyboard and screen readers for free.
 */
export function FilterSelect({
  id,
  label,
  active = false,
  className,
  containerClassName,
  children,
  ...props
}: FilterSelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={cn("relative shrink-0", containerClassName)}>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <select
        id={selectId}
        className={cn(
          "h-11 cursor-pointer appearance-none whitespace-nowrap rounded-lk-sm border-[1.5px] pl-3 pr-9",
          "text-lk-label font-medium transition-colors duration-140 ease-out-lk",
          "focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lk-blue-line",
          active
            ? "border-lk-blue bg-lk-blue-tint text-lk-blue"
            : "border-lk-field bg-lk-surface text-lk-ink hover:border-lk-ink-3",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2",
          active ? "text-lk-blue" : "text-lk-ink",
        )}
      />
    </div>
  );
}
