"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

export type BottomNavProps = {
  /** Accessible name of the <nav>. */
  label: string;
  /** The tabs of the space, four or five (docs/DESIGN.md 10.6). */
  items: readonly NavItem[];
  /** Current tab instead of the one of the address (catalogue); null: none. */
  activeHref?: string | null;
  /** In the flow of the page instead of fixed at the bottom (catalogue). */
  inline?: boolean;
  className?: string;
};

/**
 * Mobile navigation (docs/DESIGN.md 10.6, direction C): fixed at the bottom
 * below 768 px, white with a top border, padding 10 × 20 × 22 with the iOS
 * safe area, four or five tabs (icon 24 and 12 px 600 label, secondary text).
 * The current tab is the longest prefix of the address, in blue with
 * aria-current. A page that shows it adds BOTTOM_NAV_OFFSET (nav-items.ts) so
 * that its end stays visible.
 */
export function BottomNav({ label, items, activeHref, inline = false, className }: BottomNavProps) {
  const pathname = usePathname();
  const current = activeHref === undefined ? currentHref(pathname, items) : activeHref;
  return (
    <nav
      aria-label={label}
      className={cn(
        "border-t border-lk-line bg-lk-surface px-5 pt-2.5 pb-[max(1.375rem,env(safe-area-inset-bottom))] md:hidden",
        inline ? "relative" : "fixed inset-x-0 bottom-0 z-30",
        className,
      )}
    >
      <ul className={cn("grid", items.length > 4 ? "grid-cols-5" : "grid-cols-4")}>
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className="flex min-w-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // 48 px high touch target, the bar keeps its height.
                  "-my-1 flex w-full min-w-0 flex-col items-center gap-1 rounded-lk-sm py-1",
                  "text-lk-caption font-semibold transition-colors duration-140 ease-out-lk",
                  active ? "text-lk-blue" : "text-lk-ink-2",
                )}
              >
                {item.icon ? <NavIcon name={item.icon} className="size-6 shrink-0" /> : null}
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
