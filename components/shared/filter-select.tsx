import { useId, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterSelectProps = Omit<ComponentProps<"select">, "size"> & {
  /** Read by screen readers. */
  label: string;
  /** Text shown in the field: the chosen option, or the name of the filter. */
  display: string;
  /** A value is chosen: tinted blue (docs/DESIGN.md 10.3, FilterBar). */
  active?: boolean;
  containerClassName?: string;
};

/**
 * Select of the desktop filter bar (docs/DESIGN.md 10.3): 44 px, never on two
 * lines, as wide as its text; blue tint when a value is chosen. The native
 * select (keyboard, screen readers, system picker) lies transparent over the
 * text: a native select would take the width of its longest option.
 */
export function FilterSelect({
  id,
  label,
  display,
  active = false,
  className,
  containerClassName,
  children,
  ...props
}: FilterSelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div
      className={cn(
        "relative inline-flex h-11 shrink-0 items-center gap-2 rounded-lk-sm border-[1.5px] pl-3 pr-2.5",
        "text-lk-label font-medium transition-colors duration-140 ease-out-lk",
        "has-[select:focus-visible]:border-lk-blue has-[select:focus-visible]:ring-3 has-[select:focus-visible]:ring-lk-blue-line",
        active
          ? "border-lk-blue bg-lk-blue-tint text-lk-blue"
          : "border-lk-field bg-lk-surface text-lk-ink hover:border-lk-ink-3",
        containerClassName,
      )}
    >
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <span aria-hidden="true" className="whitespace-nowrap">
        {display}
      </span>
      <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      <select
        id={selectId}
        className={cn(
          "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
