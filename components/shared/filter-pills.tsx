import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterPillItem = {
  href: string;
  label: string;
  /** Shown in the label: « En attente · 3 ». */
  count?: number;
  active: boolean;
};

/**
 * Status filters (docs/DESIGN.md 10.1 FilterPill): 34 px links, 12 px, radius
 * 4; active on navy, white 600 with aria-current; inactive white with a 1.5
 * px line border. The list scrolls sideways on a phone and wraps from 768 px.
 */
export function FilterPills({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly FilterPillItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        // The scrolling list cuts what passes its box: 5 px above and below
        // for the touch target, without moving the layout.
        "-mx-5 -my-1.25 overflow-x-auto px-5 py-1.25 md:m-0 md:overflow-visible md:p-0",
        className,
      )}
    >
      <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                // 44 px touch target around the 34 px pill.
                "relative inline-flex h-8.5 items-center whitespace-nowrap rounded-full px-3.5 text-lk-caption",
                "after:absolute after:-inset-y-1.25 after:inset-x-0",
                "transition-colors duration-140 ease-out-lk",
                item.active
                  ? "lk-gradient font-semibold text-white"
                  : "border-[1.5px] border-lk-line bg-lk-surface font-medium text-lk-ink hover:bg-lk-stone-2",
              )}
            >
              {item.count === undefined ? item.label : `${item.label} · ${item.count}`}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type FilterPillButton<K extends string = string> = { key: K; label: string };

/**
 * The same pills as buttons, for a filter of the page that leaves the address
 * alone (the notifications panel, DESIGN.md 10.7): a group of toggle buttons,
 * the active one aria-pressed.
 */
export function FilterPillButtons<K extends string>({
  label,
  items,
  active,
  onSelect,
  className,
}: {
  label: string;
  items: readonly FilterPillButton<K>[];
  active: K;
  onSelect: (key: K) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      // Room for the focus ring of the first and last pills (DESIGN.md 15).
      className={cn("-mx-1 -my-1.25 overflow-x-auto px-1 py-1.25", className)}
    >
      <ul className="flex w-max gap-2">
        {items.map((item) => {
          const current = item.key === active;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-pressed={current}
                onClick={() => onSelect(item.key)}
                className={cn(
                  "relative inline-flex h-8.5 items-center whitespace-nowrap rounded-full px-3.5 text-lk-caption",
                  "after:absolute after:-inset-y-1.25 after:inset-x-0",
                  "transition-colors duration-140 ease-out-lk",
                  current
                    ? "lk-gradient font-semibold text-white"
                    : "border-[1.5px] border-lk-line bg-lk-surface font-medium text-lk-ink hover:bg-lk-stone-2",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
