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
  /** The whole width of the screen, aligned with a page that uses it (search and its map). */
  fullWidth?: boolean;
  /**
   * night: in the night band of the first section (the home page, SPECS.md 3,
   * item 1, and the heroes of the showcase pages): white logo and links, the
   * action and the account of glass, no line under it.
   */
  tone?: "light" | "night";
  className?: string;
};

/**
 * Desktop navigation (docs/DESIGN.md 10.6, charte D), from 768 px: 72 px,
 * white, bottom border, sticky, its content in the frame of the pages (the
 * width of the screen up to 1 920 px, L1-56).
 * Logo 32 px high, links, then on the right: the action in a blue outlined
 * pill, and when signed in the bell, the favourites and the pill of the
 * account menu; when signed out, the same pill (menu and avatar) to « Mon
 * compte ». Gutters of the frame from 1024 px (32 px, 64 px from 1536 px),
 * gap 40; 20 px and 24 below, so that it fits in 768 px. Layer 30, above the sticky headers of the pages (20): the
 * panel of a group of its links covers them (L1-51); no BottomNav from 768 px.
 */
export function TopNav({
  homeHref,
  label,
  links,
  activeHref,
  cta,
  account,
  fullWidth = false,
  tone = "light",
  className,
}: TopNavProps) {
  const night = tone === "night";
  return (
    <header
      data-sticky-header="top-nav"
      className={cn(
        "hidden h-18 border-b md:sticky md:top-0 md:z-30 md:block",
        night ? "lk-on-night border-transparent bg-lk-night" : "border-lk-line bg-lk-surface",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-full items-center gap-6 lg:gap-10",
          // The page frame (L1-56), or the whole width (the search sets its
          // own gutter on its page). 20 px below 1 024 px: the links of an
          // account do not fit in 768 px with 32.
          fullWidth ? "w-full lk-gutter" : "lk-frame",
          "max-lg:[--lk-gutter:1.25rem]",
        )}
      >
        <Link href={homeHref} className="inline-flex h-11 shrink-0 items-center rounded-lk-sm">
          <Logo tone={night ? "white" : "color"} className="h-8" />
        </Link>
        <TopNavLinks label={label} links={links} activeHref={activeHref} night={night} />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {cta ? (
            <Button
              asChild
              variant={night ? "night" : "outline-blue"}
              shape="pill"
              icon={Plus}
              className="mr-2"
            >
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
                // The avatar alone below 1 024 px, where the links need the room.
                "flex h-12 items-center gap-2.5 rounded-full border border-lk-line-strong bg-lk-surface pr-1.5 pl-1.5 text-lk-ink lg:pl-4",
                "transition-shadow duration-140 ease-out-lk hover:shadow-lk-field",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
              )}
            >
              <Menu aria-hidden="true" className="hidden size-4.5 lg:block" />
              <span className="lk-gradient-brand flex size-8.5 items-center justify-center rounded-full text-white">
                <User aria-hidden="true" className="size-4.5" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
