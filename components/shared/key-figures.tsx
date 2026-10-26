import { cn } from "@/lib/utils";

export type KeyFigure = {
  /** Already formatted: « 68 m² », « 3 », « 3e ». */
  value: string;
  label: string;
};

export type KeyFiguresProps = {
  /** Up to 6 figures: the first 4 on mobile, all 6 from 1024 px. */
  items: readonly KeyFigure[];
  className?: string;
};

/**
 * Key figures of a property (docs/DESIGN.md 10.2): tiles of the light blue of
 * Leenkey (stone until L1-55, « pas de gris », Younes), the value in wide
 * Archivo above its label. A description list, so that screen readers
 * read « surface, 68 m² ».
 */
export function KeyFigures({ items, className }: KeyFiguresProps) {
  return (
    <dl className={cn("grid grid-cols-4 gap-2 lg:grid-cols-6 lg:gap-2.5", className)}>
      {items.slice(0, 6).map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={cn(
            "flex min-w-0 flex-col-reverse gap-1 rounded-lk-lg bg-lk-blue-tint px-1.5 py-2.5 text-center",
            "lg:p-3 lg:text-left",
            index >= 4 && "hidden lg:flex",
          )}
        >
          <dt className="truncate text-lk-micro text-lk-ink-3">{item.label}</dt>
          <dd className="text-lk-figure font-bold text-wide tabular text-lk-blue-dark lg:text-lk-figure-lg">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
