import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KeyFact = {
  label: string;
  value: ReactNode;
  /**
   * muted: « Non renseigné »; success: « Complets »; link: a link such as
   * « Demander l'accès » (docs/DESIGN.md 10.2).
   */
  tone?: "default" | "muted" | "success" | "link";
};

export type KeyFactsTableProps = {
  items: readonly KeyFact[];
  className?: string;
};

const tones = {
  default: "font-semibold text-lk-ink",
  muted: "text-lk-ink-3",
  success: "font-semibold text-lk-success",
  link: "font-semibold text-lk-blue",
} as const;

/**
 * « Ce que vous savez avant de visiter » (docs/DESIGN.md 10.2): label on the
 * left, value on the right, 1 px separators. A description list, read as
 * « Taxe foncière, 1 150 € / an ».
 */
export function KeyFactsTable({ items, className }: KeyFactsTableProps) {
  return (
    <dl className={cn("overflow-hidden rounded-lk-md border border-lk-line", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-lk-line px-3.5 py-3 text-lk-secondary last:border-b-0"
        >
          <dt className="text-lk-ink-3">{item.label}</dt>
          <dd className={cn("text-right tabular", tones[item.tone ?? "default"])}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
