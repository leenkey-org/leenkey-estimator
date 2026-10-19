"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Plus, X } from "lucide-react";
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
  className?: string;
};

const rowClass = cn(
  "flex min-h-12 items-center border-b border-lk-line text-lk-body-lg font-medium",
  "transition-colors duration-140 ease-out-lk hover:text-lk-blue",
  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
);

/**
 * Mobile header of the public pages (G1, docs/DESIGN.md 11): below 768 px,
 * sticky, 60 px, white with a bottom border, the logo and « Menu ». The menu
 * is a Radix dialog over the whole screen, opened from the top in 220 ms (no
 * movement with reduced motion): the links of the site, then « Vendre mon
 * bien » and the account. A link followed closes it. From 768 px, the TopNav.
 */
export function SiteMenu({
  homeHref,
  label,
  links,
  cta,
  account,
  texts,
  className,
}: SiteMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = currentHref(pathname, links);
  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-15 items-center justify-between gap-4 border-b border-lk-line bg-lk-surface px-5 md:hidden",
        className,
      )}
    >
      <Link
        href={homeHref}
        className="inline-flex h-11 items-center rounded-lk-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
      >
        <Logo className="h-7" />
      </Link>
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          <IconButton icon={Menu} variant="stone" aria-label={texts.open} />
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              facadeScope,
              "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-lk-surface outline-none",
              "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
              "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2",
              "motion-reduce:animate-none",
            )}
          >
            <div className="flex h-15 shrink-0 items-center justify-between gap-4 border-b border-lk-line px-5">
              <Link
                href={homeHref}
                onClick={close}
                className="inline-flex h-11 items-center rounded-lk-sm focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
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
                  const active = link.href === current;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                        className={cn(rowClass, active ? "text-lk-blue" : "text-lk-ink")}
                      >
                        {link.label}
                      </Link>
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
