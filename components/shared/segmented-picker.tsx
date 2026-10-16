import { useId, type ComponentProps } from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type SegmentedOption = {
  value: string;
  label: string;
  /** Spoken name when the label is too short (« Classe C »). */
  ariaLabel?: string;
};

export type SegmentedPickerProps = Omit<ComponentProps<typeof RadioGroup>, "children"> & {
  label: string;
  hideLabel?: boolean;
  options: readonly SegmentedOption[];
};

/**
 * Short single choice (DPE A to G, project): equal 44 px buttons in a
 * radiogroup, arrow keys to move (docs/DESIGN.md 10.1 and 15). Root from
 * components/ui/radio-group.tsx, items from Radix without the round indicator.
 */
export function SegmentedPicker({
  label,
  hideLabel = false,
  options,
  className,
  ...props
}: SegmentedPickerProps) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={labelId}
        className={cn("text-lk-label font-medium text-lk-ink", hideLabel && "sr-only")}
      >
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        className={cn("grid auto-cols-fr grid-flow-col gap-1.5", className)}
        {...props}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              "h-11 min-w-0 cursor-pointer rounded-lk-sm bg-lk-stone-2 px-1",
              "text-lk-button-md font-semibold text-lk-ink-2",
              "transition-colors duration-140 ease-out-lk",
              "data-[state=unchecked]:enabled:hover:bg-lk-stone",
              "data-[state=checked]:bg-lk-blue data-[state=checked]:text-white",
              "data-[state=checked]:enabled:hover:bg-lk-blue-hover",
              "disabled:cursor-not-allowed disabled:opacity-45",
            )}
          >
            {option.label}
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroup>
    </div>
  );
}
