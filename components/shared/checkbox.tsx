import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  /** Clickable label; may contain links. */
  label: ReactNode;
  error?: string;
  containerClassName?: string;
};

/**
 * Native checkbox (docs/DESIGN.md 10.1): 20 px box, 4 px radius, blue when
 * ticked, clickable label of 12–13 px. Native so that FormData carries it.
 */
export function Checkbox({
  id,
  label,
  error,
  className,
  containerClassName,
  ...props
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      <div className="flex items-start gap-3">
        <span className="relative mt-px flex size-5 shrink-0">
          <input
            id={inputId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(
              "peer size-5 cursor-pointer appearance-none rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface",
              "transition-colors duration-140 ease-out-lk checked:border-lk-blue checked:bg-lk-blue",
              "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
              "aria-invalid:border-lk-danger disabled:cursor-not-allowed disabled:opacity-45",
              // 44 px touch target (DESIGN.md 15).
              "after:absolute after:-inset-3 after:content-['']",
              className,
            )}
            {...props}
          />
          <Check
            aria-hidden="true"
            strokeWidth={3}
            className="pointer-events-none absolute inset-0.5 size-4 text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        <label htmlFor={inputId} className="cursor-pointer text-lk-secondary text-lk-ink-2">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-lk-caption text-lk-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
