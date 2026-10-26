import type { ReactNode } from "react";
import Link from "next/link";
import { Heart, Menu, Plus, User } from "lucide-react";
import { AccountMenu, type AccountMenuProps } from "./account-menu";
import { Button } from "./button";
import { iconButtonVariants } from "./icon-button";
import { Logo } from "./logo";
import type { NavItem } from "./nav-items";
import { TopNavLinks } from "./top-nav-links";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type TopNavAccount =
  | {
      signedIn: false;
      /** « Mon compte »: the login page, back to this page afterwards. */
      href: string;
      label: string;
    }
  | {
      signedIn: true;
      /** The NotificationBell, size « nav » (its panel sentence depends on the space). */
      notifications: ReactNode;
      favourites: { href: string; label: string };
      menu: Omit<AccountMenuProps, "variant" | "className">;
    };

export type TopNavProps = {
  /** Destination of the logo. */
  homeHref: string;
  /** Accessible name of the <nav> of the links. */
  label: string;
  links: readonly NavItem[];
  /** Current link instead of the one of the address (catalogue); null: none. */
  activeHref?: string | null;
  /** Primary action on the right, with its Plus icon (« Vendre mon bien »). */
  cta?: { href: string; label: string };
  account: TopNavAccount;
  className?: string;
};

/**
 * Desktop navigation (docs/DESIGN.md 10.6, direction C), from 768 px: 72 px,
 * white, bottom border, sticky, its content in the 1 280 px of the pages.
 * Logo 32 px high, links, then on the right: the action in a blue outlined
 * pill, and when signed in the bell, the favourites and the pill of the
 * account menu; when signed out, the same pill (menu and avatar) to « Mon
 * compte ». Padding 0 32 and gap 40 from 1024 px, tighter below so that it
 * fits in 768 px. Layer 30, above the sticky headers of the pages (20): the
 * panel of a group of its links covers them (L1-51); no BottomNav from 768 px.
 */
export function TopNav({
  homeHref,
  label,
  links,
  activeHref,
  cta,
  account,
  className,
}: TopNavProps) {
  return (
    <header
      data-sticky-header="top-nav"
      className={cn(
        "hidden border-b border-lk-line bg-lk-surface md:sticky md:top-0 md:z-30 md:block",
        className,
      )}
    >
      <div className="mx-auto flex h-18 max-w-lk-wide items-center gap-6 px-5 lg:gap-10 lg:px-8">
        <Link href={homeHref} className="inline-flex h-11 shrink-0 items-center rounded-lk-sm">
          <Logo className="h-8" />
        </Link>
        <TopNavLinks label={label} links={links} activeHref={activeHref} />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {cta ? (
            <Button asChild variant="outline-blue" shape="pill" icon={Plus} className="mr-2">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : null}
          {account.signedIn ? (
            <>
              {account.notifications}
              <Link
                href={account.favourites.href}
                aria-label={account.favourites.label}
                className={cn(
                  iconButtonVariants({ variant: "transparent" }),
                  "inline-flex size-10.5 items-center justify-center after:absolute after:-inset-px",
                )}
              >
                <Heart aria-hidden="true" />
              </Link>
              <AccountMenu {...account.menu} variant="avatar" />
            </>
          ) : (
            <Link
              href={account.href}
              aria-label={account.label}
              className={cn(
                "flex h-12 items-center gap-2.5 rounded-full border border-lk-line-strong bg-lk-surface pr-1.5 pl-4 text-lk-ink",
                "transition-shadow duration-140 ease-out-lk hover:shadow-lk-field",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
              )}
            >
              <Menu aria-hidden="true" className="size-4.5" />
              <span className="flex size-8.5 items-center justify-center rounded-full bg-lk-blue text-white">
                <User aria-hidden="true" className="size-4.5" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
