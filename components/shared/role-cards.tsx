import { useId } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoleCardOption = { value: string; title: string; hint: string };

export type RoleCardsProps = {
  name: string;
  legend: string;
  options: readonly RoleCardOption[];
  defaultValue?: string;
  error?: string;
  className?: string;
};

/**
 * « Je vends » / « J'achète » (docs/DESIGN.md 10.1, RoleCard): two 76 px cards
 * that are native radio buttons, so the choice works in a server-action form
 * without JavaScript and moves with the arrow keys.
 */
export function RoleCards({
  name,
  legend,
  options,
  defaultValue,
  error,
  className,
}: RoleCardsProps) {
  const errorId = useId();
  return (
    <fieldset
      className={cn("flex flex-col gap-1.5", className)}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex h-19 cursor-pointer flex-col justify-center gap-0.5 rounded-lk-md px-3.5",
              "border-[1.5px] border-lk-line bg-lk-surface transition-colors duration-140 ease-out-lk",
              "hover:border-lk-ink-3",
              "has-checked:border-2 has-checked:border-lk-blue has-checked:bg-lk-blue-tint has-checked:px-[13.5px]",
              "has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-lk-blue",
              error && "border-lk-danger",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              aria-invalid={error ? true : undefined}
              className="peer sr-only"
            />
            <span className="text-lk-button-md font-semibold text-lk-ink peer-checked:text-lk-blue">
              {option.title}
            </span>
            <span className="text-lk-caption text-lk-ink-2">{option.hint}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-lk-caption text-lk-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
