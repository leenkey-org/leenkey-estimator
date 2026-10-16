import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Label, help and error around a form control (docs/DESIGN.md 10.1, 15).
// Used by Input, UnitInput and Select.

export type FieldTextProps = {
  /** Always rendered as a <label>; hideLabel keeps it for screen readers only. */
  label: string;
  hideLabel?: boolean;
  /** Adds « (facultatif) » after the label. */
  optional?: boolean;
  help?: string;
  /** Turns the control red and is announced through aria-describedby. */
  error?: string;
};

/** Border, height, text and focus of every text control. */
export const fieldControlClassName = cn(
  "h-12 w-full rounded-lk-sm border-[1.5px] border-lk-field bg-lk-surface px-3.5 py-0 shadow-none",
  "text-lk-body text-lk-ink md:text-lk-body placeholder:text-lk-ink-3",
  "transition duration-140 ease-out-lk",
  "focus-visible:border-lk-blue focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lk-blue-line",
  "aria-invalid:border-lk-danger aria-invalid:focus-visible:ring-lk-danger-bg",
  "disabled:cursor-not-allowed disabled:bg-lk-stone-2 disabled:text-lk-ink-3 disabled:opacity-100",
);

/** ids of the help and error texts, for aria-describedby. */
export function fieldDescribedBy(
  id: string,
  { help, error }: Pick<FieldTextProps, "help" | "error">,
  ...extra: Array<string | undefined>
): string | undefined {
  const ids = [...extra, help ? `${id}-help` : undefined, error ? `${id}-error` : undefined];
  const value = ids.filter(Boolean).join(" ");
  return value || undefined;
}

export function Field({
  id,
  label,
  hideLabel = false,
  optional = false,
  help,
  error,
  className,
  children,
}: FieldTextProps & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn("text-lk-label font-medium text-lk-ink", hideLabel && "sr-only")}
      >
        {label}
        {optional ? <span className="font-normal text-lk-ink-3"> {fr.field.optional}</span> : null}
      </Label>
      {children}
      {help ? (
        <p id={`${id}-help`} className="text-lk-caption text-lk-ink-3">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-lk-caption text-lk-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
