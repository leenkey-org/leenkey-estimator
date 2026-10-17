"use client";

import { usePathname } from "next/navigation";
import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { currentHref, type NavItem } from "./nav-items";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type AdminMobileHeaderProps = {
  /** Items of the sidebar: the title is the label of the current one. */
  items: readonly NavItem[];
  /** Title instead of the one of the address (catalogue). */
  title?: string;
  /** Title of a page that no item covers. */
  fallbackTitle: string;
  /** 40 px blue avatar, which opens the account menu. */
  account: Omit<AccountMenuProps, "variant" | "className">;
  className?: string;
};

/**
 * Back office header below 768 px (docs/DESIGN.md 10.6): ink, padding
 * 20 × 20 × 16, « Back office » (11 px, white 60 %) over the title of the
 * page (20 px 700 wide), avatar on the right. The counter tiles come with the
 * back office data.
 */
export function AdminMobileHeader({
  items,
  title,
  fallbackTitle,
  account,
  className,
}: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const current = currentHref(pathname, items);
  const heading = title ?? items.find((item) => item.href === current)?.label ?? fallbackTitle;
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 bg-lk-ink px-5 pt-5 pb-4 text-white md:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-lk-micro font-semibold text-white/60">{fr.nav.backOffice}</p>
        <p className="truncate text-lk-h2 font-bold text-wide">{heading}</p>
      </div>
      <AccountMenu {...account} variant="header" />
    </header>
  );
}
