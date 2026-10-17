import { useId, type ComponentProps } from "react";
import { Field, fieldControlClassName, fieldDescribedBy, type FieldTextProps } from "./field";
import { Textarea as UiTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type TextareaProps = ComponentProps<"textarea"> &
  FieldTextProps & { containerClassName?: string };

/** Multi-line text field with its label, help and error (docs/DESIGN.md 10.1). */
export function Textarea({
  id,
  label,
  hideLabel,
  optional,
  help,
  error,
  className,
  containerClassName,
  "aria-describedby": describedBy,
  ...props
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <Field
      id={textareaId}
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      help={help}
      error={error}
      className={containerClassName}
    >
      <UiTextarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={fieldDescribedBy(textareaId, { help, error }, describedBy)}
        className={cn(
          fieldControlClassName,
          "h-auto min-h-30 resize-y py-3 leading-normal",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
