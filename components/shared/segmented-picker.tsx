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
  /**
   * dark: on the navy of a showcase page (/tarifs, L1-50): a glass frame, the
   * options in white, the chosen one in white with blue text (13:1 against
   * the navy, where the blue would not reach 3:1), a white focus ring.
   */
  tone?: "light" | "dark";
  /** Light only: white pills, the chosen one blue (the filters of the search, direction C). */
  shape?: "default" | "pill";
};

/**
 * Short single choice (DPE A to G, project): equal 44 px buttons in a
 * radiogroup, arrow keys to move (docs/DESIGN.md 10.1 and 15). Root from
 * components/ui/radio-group.tsx, items from Radix without the round indicator.
 * Dark: the glass switch of the V1 on navy.
 */
export function SegmentedPicker({
  label,
  hideLabel = false,
  options,
  tone = "light",
  shape = "default",
  className,
  ...props
}: SegmentedPickerProps) {
  const labelId = useId();
  const dark = tone === "dark";
  return (
    <div className="flex flex-col gap-1.5">
      <span
        id={labelId}
        className={cn(
          "text-lk-label font-medium",
          dark ? "text-white" : "text-lk-ink",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        className={cn(
          "grid auto-cols-fr grid-flow-col",
          dark ? "gap-1 rounded-lk-lg border border-white/12 bg-white/[0.06] p-1" : "gap-1.5",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            aria-label={option.ariaLabel}
            className={cn(
              "min-w-0 cursor-pointer px-1",
              "text-lk-button-md font-semibold",
              "transition-colors duration-140 ease-out-lk",
              dark
                ? [
                    // Its long labels may take two lines at 390 px.
                    "min-h-11 rounded-lk-md py-1.5 leading-tight text-white/80 focus-visible:outline-white",
                    "data-[state=unchecked]:enabled:hover:bg-white/10",
                    "data-[state=checked]:bg-lk-surface data-[state=checked]:text-lk-blue",
                  ]
                : shape === "pill"
                  ? [
                      "h-11 rounded-full border-[1.5px] border-lk-line-strong bg-lk-surface text-lk-ink",
                      "data-[state=unchecked]:enabled:hover:border-lk-ink-3",
                      "data-[state=checked]:border-lk-blue data-[state=checked]:bg-lk-blue data-[state=checked]:text-white",
                      "data-[state=checked]:enabled:hover:bg-lk-blue-hover",
                    ]
                  : [
                      "h-11 rounded-lk-sm bg-lk-stone-2 text-lk-ink-2",
                      "data-[state=unchecked]:enabled:hover:bg-lk-stone",
                      "data-[state=checked]:bg-lk-blue data-[state=checked]:text-white",
                      "data-[state=checked]:enabled:hover:bg-lk-blue-hover",
                    ],
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
