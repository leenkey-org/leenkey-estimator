import { useId } from "react";
import { Field, fieldDescribedBy } from "./field";
import type { InputProps } from "./input";
import { Input as UiInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type UnitInputProps = InputProps & {
  /** « m² », « € », « % »: shown inside the field, on the right. */
  unit: string;
};

/**
 * Field with its unit inside (docs/DESIGN.md 10.1). The border is drawn by the
 * wrapper so that the unit can take any width; screen readers hear the unit
 * through aria-describedby.
 */
export function UnitInput({
  id,
  unit,
  label,
  hideLabel,
  optional,
  help,
  error,
  compact = false,
  className,
  containerClassName,
  "aria-describedby": describedBy,
  ...props
}: UnitInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const unitId = `${inputId}-unit`;
  return (
    <Field
      id={inputId}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      help={help}
      error={error}
      className={containerClassName}
    >
      <div
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface pr-3.5",
          "transition duration-140 ease-out-lk",
          "has-[input:focus-visible]:border-lk-blue has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-lk-blue-line",
          "has-[input[aria-invalid=true]]:border-lk-danger has-[input[aria-invalid=true]:focus-visible]:ring-lk-danger-bg",
          "has-[input:disabled]:bg-lk-stone-2",
          compact && "h-11",
        )}
      >
        <UiInput
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(inputId, { help, error }, describedBy, unitId)}
          className={cn(
            "h-full min-w-0 flex-1 rounded-lk-sm border-0 bg-transparent py-0 pl-3.5 pr-0 shadow-none",
            "text-lk-body text-lk-ink md:text-lk-body placeholder:text-lk-ink-3",
            "focus-visible:outline-none focus-visible:ring-0",
            "disabled:cursor-not-allowed disabled:text-lk-ink-3 disabled:opacity-100",
            className,
          )}
          {...props}
        />
        <span id={unitId} className="shrink-0 text-lk-secondary text-lk-ink-3">
          {unit}
        </span>
      </div>
    </Field>
  );
}
