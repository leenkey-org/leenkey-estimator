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
      className={cn("-mx-5 overflow-x-auto px-5 md:mx-0 md:overflow-visible md:px-0", className)}
    >
      <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                // 44 px touch target around the 34 px pill.
                "relative inline-flex h-8.5 items-center whitespace-nowrap rounded-lk-sm px-3.5 text-lk-caption",
                "after:absolute after:-inset-y-1.25 after:inset-x-0",
                "transition-colors duration-140 ease-out-lk",
                item.active
                  ? "bg-lk-navy font-semibold text-white"
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
