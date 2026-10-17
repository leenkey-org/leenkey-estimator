"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { NavIcon } from "./nav-icon";
import { currentHref, type NavItem } from "./nav-items";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type AdminSidebarProps = {
  /** Accessible name of the <nav>. */
  label: string;
  /** Destination of the logo. */
  homeHref: string;
  items: readonly NavItem[];
  /** Current item instead of the one of the address (catalogue); null: none. */
  activeHref?: string | null;
  /** User card at the bottom, which opens the account menu. */
  account: Omit<AccountMenuProps, "variant" | "className">;
  className?: string;
};

const darkFocus =
  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Back office sidebar (docs/DESIGN.md 10.6): 240 px on ink, padding 24 × 16,
 * gap 24. Logo and « Back office » (11 px, white 60 %); links of 42 px, icon
 * 18 and 14 px label in white 80 %, the current one on blue in 600, count
 * pill on the right; user card at the bottom.
 */
export function AdminSidebar({
  label,
  homeHref,
  items,
  activeHref,
  account,
  className,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const current = activeHref === undefined ? currentHref(pathname, items) : activeHref;
  return (
    <div
      className={cn(
        "flex w-60 shrink-0 flex-col gap-6 overflow-y-auto bg-lk-ink px-4 py-6 text-white",
        className,
      )}
    >
      <Link
        href={homeHref}
        className={cn("flex flex-col gap-0.5 self-start rounded-lk-sm px-2", darkFocus)}
      >
        <span className="text-lk-logo font-bold text-wide">{fr.nav.brand}</span>
        <span className="text-lk-micro text-white/60">{fr.nav.backOffice}</span>
      </Link>
      <nav aria-label={label}>
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = item.href === current;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10.5 items-center gap-2.5 rounded-lk-sm px-3 text-lk-compact",
                    "transition-colors duration-140 ease-out-lk",
                    darkFocus,
                    active
                      ? "bg-lk-blue font-semibold text-white"
                      : "font-medium text-white/80 hover:bg-white/6 hover:text-white",
                  )}
                >
                  {item.icon ? <NavIcon name={item.icon} className="size-4.5 shrink-0" /> : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.count ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-lk-micro font-semibold tabular",
                        active ? "bg-lk-surface text-lk-blue" : "bg-white/15 text-white",
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto">
        <AccountMenu {...account} variant="card" />
      </div>
    </div>
  );
}
