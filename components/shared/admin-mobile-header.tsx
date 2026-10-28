"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { iconButtonVariants } from "./icon-button";
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
  /** The NotificationBell, before the avatar (tone dark). */
  notifications?: ReactNode;
  className?: string;
};

/**
 * Back office header below 768 px (docs/DESIGN.md 10.6): the night, padding
 * 20 × 20 × 16, « Back office » (11 px, white 60 %) over the title of the page
 * (20 px 700 wide); on the right « Voir le site » (Globe, 44 px, DECISIONS
 * 2026-10-26), the bell and the avatar. The counter tiles come with the
 * back office data.
 */
export function AdminMobileHeader({
  items,
  title,
  fallbackTitle,
  account,
  notifications,
  className,
}: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const current = currentHref(pathname, items);
  const heading = title ?? items.find((item) => item.href === current)?.label ?? fallbackTitle;
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 bg-lk-night px-5 pt-5 pb-4 text-white md:hidden",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-lk-micro font-semibold text-white/60">{fr.nav.backOffice}</p>
        <p className="truncate text-lk-h2 font-bold text-wide">{heading}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {account.siteHref ? (
          <Link
            href={account.siteHref}
            aria-label={fr.nav.site}
            className={cn(
              iconButtonVariants({ variant: "on-dark" }),
              "inline-flex items-center justify-center",
            )}
          >
            <Globe aria-hidden="true" />
          </Link>
        ) : null}
        {notifications}
        <AccountMenu {...account} variant="header" />
      </div>
    </header>
  );
}
