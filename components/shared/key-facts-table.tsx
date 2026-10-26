import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KeyFact = {
  label: string;
  value: ReactNode;
  /**
   * muted: « Non renseigné »; success: « Complets »; link: a link such as
   * « Demander l'accès » (docs/DESIGN.md 10.2).
   */
  tone?: "default" | "muted" | "success" | "link";
  /** Its pictogram in the grid of a listing (KeyFactsGrid). */
  icon?: LucideIcon;
  /** Title of the group of the grid it belongs to (« Le bien », « Énergie »…). */
  section?: string;
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

/**
 * The facts of a listing in the way of Airbnb (Younes, L1-55, DECISIONS
 * 2026-10-26): grouped under their title, two columns from 768 px, each a
 * pictogram in a light blue round, its name above its value. A description
 * list per group, read as « Taxe foncière, 1 150 € / an ».
 */
export function KeyFactsGrid({
  items,
  headingLevel = "h3",
  className,
}: KeyFactsTableProps & { headingLevel?: "h3" | "h4" | "h5" }) {
  const sections = new Map<string, KeyFact[]>();
  for (const item of items) {
    const key = item.section ?? "";
    sections.set(key, [...(sections.get(key) ?? []), item]);
  }
  const Heading = headingLevel;
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {[...sections].map(([title, facts]) => (
        <div key={title} className="flex flex-col gap-3">
          {title ? (
            <Heading className="text-lk-title font-semibold text-lk-ink">{title}</Heading>
          ) : null}
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {facts.map((item) => {
              const Icon = item.icon;
              return (
                // dt and dd straight in their group (HTML): the pictogram sits in the dt.
                <div
                  key={item.label}
                  className={cn(
                    "relative flex min-h-10 min-w-0 flex-col justify-center",
                    Icon && "pl-13",
                  )}
                >
                  <dt className="text-lk-caption text-lk-ink-3">
                    {Icon ? (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-lk-blue-tint text-lk-blue"
                      >
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                    ) : null}
                    {item.label}
                  </dt>
                  <dd className={cn("text-lk-compact tabular", tones[item.tone ?? "default"])}>
                    {item.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
