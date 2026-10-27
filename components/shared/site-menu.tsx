"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Plus, User, X } from "lucide-react";
import { Button } from "./button";
import { facadeScope } from "./facade-root";
import { IconButton } from "./icon-button";
import { Logo } from "./logo";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

export type SiteMenuTexts = {
  /** Button that opens the menu, and the title of the panel. */
  open: string;
  close: string;
};

export type SiteMenuProps = {
  homeHref: string;
  /** Accessible name of the <nav> of the links. */
  label: string;
  links: readonly NavItem[];
  /** Primary action at the end of the panel (« Vendre mon bien »). */
  cta: { href: string; label: string };
  /** « Mon compte » signed out, « Mon espace » signed in. */
  account: { href: string; label: string };
  texts: SiteMenuTexts;
  /** night: on the night band of the home page D, white logo, pill of glass. */
  tone?: "light" | "night";
  /** Classes of the opened menu (the scope of a redesign, `lk-d`). */
  panelClassName?: string;
  className?: string;
};

const rowClass = cn(
  "flex min-h-12 items-center border-b border-lk-line text-lk-body-lg font-medium",
  "transition-colors duration-140 ease-out-lk hover:text-lk-blue",
  "focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
);

/**
 * Mobile header of the public pages (G1, docs/DESIGN.md 11): below 768 px,
 * sticky, 60 px, white with a bottom border, the logo and « Menu » (a pill, its
 * menu icon and the avatar of the account, direction C). The menu
 * is a Radix dialog over the whole screen, opened from the top in 220 ms (no
 * movement with reduced motion): the links of the site, those of a group
 * under its label (« Qui sommes-nous », L1-51), then « Vendre mon bien » and
 * the account. A link followed closes it. From 768 px, the TopNav.
 */
export function SiteMenu({
  homeHref,
  label,
  links,
  cta,
  account,
  texts,
  tone = "light",
  panelClassName,
  className,
}: SiteMenuProps) {
  const night = tone === "night";
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = currentHref(pathname, links);
  const close = () => setOpen(false);
  const id = useId();

  const row = (link: NavItem, active: boolean) => (
    <li key={link.href}>
      <Link
        href={link.href}
        aria-current={active ? "page" : undefined}
        onClick={close}
        // In blue and underlined: never told by the colour alone (DESIGN.md 15).
        className={cn(
          rowClass,
          active ? "text-lk-blue underline decoration-2 underline-offset-6" : "text-lk-ink",
        )}
      >
        {link.label}
      </Link>
    </li>
  );

  return (
    <header
      data-sticky-header="site-menu"
      className={cn(
        "sticky top-0 z-20 flex h-15 items-center justify-between gap-4 border-b px-4 md:hidden",
        night ? "lk-on-night border-transparent bg-lk-night" : "border-lk-line bg-lk-surface",
        className,
      )}
    >
      <Link
        href={homeHref}
        className="inline-flex h-11 items-center rounded-lk-sm focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
      >
        <Logo tone={night ? "white" : "color"} className="h-7" />
      </Link>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          {/* The pill of direction C: the menu and the avatar of the account. */}
          <button
            type="button"
            aria-label={texts.open}
            className={cn(
              "flex h-11 items-center gap-2 rounded-full border border-lk-line-strong bg-lk-surface pr-1.25 pl-3.5 text-lk-ink",
              "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
            )}
          >
            <Menu aria-hidden="true" className="size-4.5" />
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-white",
                night ? "lk-gradient-brand" : "bg-lk-blue",
              )}
            >
              <User aria-hidden="true" className="size-4" />
            </span>
          </button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              facadeScope,
              panelClassName,
              "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-lk-surface outline-none",
              "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
              "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2",
              "motion-reduce:animate-none",
            )}
          >
            <div className="flex h-15 shrink-0 items-center justify-between gap-4 border-b border-lk-line px-4">
              <Link
                href={homeHref}
                onClick={close}
                className="inline-flex h-11 items-center rounded-lk-sm focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
              >
                <Logo className="h-7" />
              </Link>
              <DialogPrimitive.Title className="sr-only">{texts.open}</DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <IconButton icon={X} variant="outline" aria-label={texts.close} />
              </DialogPrimitive.Close>
            </div>
            <nav aria-label={label} className="px-5 pt-2">
              <ul>
                {links.map((link) => {
                  if (!link.items) return row(link, link.href === current);
                  const here = link.href === current ? currentHref(pathname, link.items) : null;
                  const labelId = `${id}-${link.href}`;
                  return (
                    <li key={link.href}>
                      <p
                        id={labelId}
                        className="pt-5 pb-1 text-lk-label font-semibold text-lk-ink-3"
                      >
                        {link.label}
                      </p>
                      <ul aria-labelledby={labelId} className="ml-4">
                        {link.items.map((item) => row(item, item.href === here))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="mt-auto flex flex-col gap-2.5 px-5 pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button asChild size="lg" icon={Plus}>
                <Link href={cta.href} onClick={close}>
                  {cta.label}
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={account.href} onClick={close}>
                  {account.label}
                </Link>
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </header>
  );
}
