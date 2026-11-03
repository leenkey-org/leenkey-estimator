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

/** A counter of the header: what waits, and where it is dealt with. */
export type AdminHeaderTile = { label: string; value: number; href: string };

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
  /** Three counters under the title (L1-30a), the first in blue; none when absent. */
  tiles?: readonly AdminHeaderTile[];
  /** Name of the group of the counters. */
  tilesLabel?: string;
  className?: string;
};

/**
 * Back office header below 768 px (docs/DESIGN.md 10.6): the night, padding
 * 20 × 20 × 16, « Back office » (11 px, white 60 %) over the title of the page
 * (20 px 700 wide); on the right « Voir le site » (Globe, 44 px, DECISIONS
 * 2026-10-26), the bell and the avatar. Under them, three counter tiles
 * (grid of 3, gap 8, padding 12 × 10): the first on the gradient of the
 * actions, the others white at 10 %; figure 22 px 700, label 11 px; each a
 * link to where it is dealt with (L1-30a).
 */
export function AdminMobileHeader({
  items,
  title,
  fallbackTitle,
  account,
  notifications,
  tiles,
  tilesLabel,
  className,
}: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const current = currentHref(pathname, items);
  const heading = title ?? items.find((item) => item.href === current)?.label ?? fallbackTitle;
  return (
    <header
      className={cn(
        "flex flex-col gap-4 bg-lk-night px-5 pt-5 pb-4 text-white md:hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
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
      </div>
      {tiles && tiles.length > 0 ? (
        <nav aria-label={tilesLabel} className="grid grid-cols-3 gap-2">
          {tiles.map((tile, index) => (
            <Link
              key={tile.label}
              href={tile.href}
              className={cn(
                "flex min-h-11 min-w-0 flex-col gap-0.5 rounded-lk-sm px-2.5 py-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid",
                index === 0 ? "lk-gradient" : "bg-white/10",
              )}
            >
              <span className="text-lk-stat font-bold tabular">{tile.value}</span>{" "}
              <span className="truncate text-lk-micro text-white/90">{tile.label}</span>
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
