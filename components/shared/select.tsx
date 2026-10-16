import { useId, type ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { Field, fieldControlClassName, fieldDescribedBy, type FieldTextProps } from "./field";
import { cn } from "@/lib/utils";

export type SelectProps = Omit<ComponentProps<"select">, "size"> &
  FieldTextProps & {
    /** First option with an empty value, e.g. « Choisir ». */
    placeholder?: string;
    /** 44 px instead of 48 px, for the desktop filter bar. */
    compact?: boolean;
    containerClassName?: string;
  };

/**
 * Native select with the Façade field styles and a ChevronDown (docs/DESIGN.md
 * 10.1): the system picker on mobile, keyboard and screen reader support for
 * free, and it works in a server-rendered form.
 */
export function Select({
  id,
  label,
  hideLabel,
  optional,
  help,
  error,
  placeholder,
  compact = false,
  className,
  containerClassName,
  children,
  "aria-describedby": describedBy,
  ...props
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field
      id={selectId}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      help={help}
      error={error}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(selectId, { help, error }, describedBy)}
          className={cn(
            fieldControlClassName,
            "cursor-pointer appearance-none pr-10",
            compact && "h-11",
            className,
          )}
          {...props}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-lk-ink"
        />
      </div>
    </Field>
  );
}
