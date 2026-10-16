import { useId, type ComponentProps } from "react";
import { Field, fieldControlClassName, fieldDescribedBy, type FieldTextProps } from "./field";
import { Input as UiInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InputProps = Omit<ComponentProps<"input">, "size"> &
  FieldTextProps & {
    /** 44 px instead of 48 px, for the desktop filter bar. */
    compact?: boolean;
    containerClassName?: string;
  };

/** Text field with its label, help and error (docs/DESIGN.md 10.1). */
export function Input({
  id,
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
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
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
      <UiInput
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(inputId, { help, error }, describedBy)}
        className={cn(fieldControlClassName, compact && "h-11", className)}
        {...props}
      />
    </Field>
  );
}
