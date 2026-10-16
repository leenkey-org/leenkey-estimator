import { pillClassName } from "./status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/** Energy classes (properties.dpe_class, SPEC-V2 section 4). */
export const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type DpeClass = (typeof DPE_CLASSES)[number];

export function isDpeClass(value: unknown): value is DpeClass {
  return typeof value === "string" && (DPE_CLASSES as readonly string[]).includes(value);
}

// docs/DESIGN.md 2.1, one background and one text token per class.
const dpeTone: Record<DpeClass, string> = {
  A: "bg-lk-dpe-a-bg text-lk-dpe-a-fg",
  B: "bg-lk-dpe-b-bg text-lk-dpe-b-fg",
  C: "bg-lk-dpe-c-bg text-lk-dpe-c-fg",
  D: "bg-lk-dpe-d-bg text-lk-dpe-d-fg",
  E: "bg-lk-dpe-e-bg text-lk-dpe-e-fg",
  F: "bg-lk-dpe-f-bg text-lk-dpe-f-fg",
  G: "bg-lk-dpe-g-bg text-lk-dpe-g-fg",
};

export type DpeBadgeProps = {
  value: DpeClass;
  /** Letter only, for compact cards; « DPE » stays for screen readers. */
  compact?: boolean;
  className?: string;
};

/** « DPE C » on a listing, « C » in compact cards (docs/DESIGN.md 10.2). */
export function DpeBadge({ value, compact = false, className }: DpeBadgeProps) {
  return (
    <span
      className={cn(
        pillClassName,
        "px-2.5 py-1 text-lk-tag font-semibold",
        compact && "min-w-6 justify-center px-2",
        dpeTone[value],
        className,
      )}
    >
      {/* No-break space: never collapsed, so screen readers say « DPE C ». */}
      {compact ? (
        <span className="sr-only">{`${fr.dpe.label}\u00A0`}</span>
      ) : (
        `${fr.dpe.label}\u00A0`
      )}
      {value}
    </span>
  );
}
