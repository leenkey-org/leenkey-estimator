"use client";

import { useTransition } from "react";
import Link from "next/link";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Menu, User } from "lucide-react";
import { facadeScope } from "./facade-root";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.nav.menu;

export type AccountMenuProps = {
  /** First letter of the first name, in the avatar (a person icon without it). */
  initial: string | null;
  /** « Mon espace »: home of the account's role. */
  homeHref: string;
  /** « Mon compte ». */
  accountHref: string;
  /** Server action that ends the session, then leaves the page. */
  signOut: () => Promise<void>;
  /**
   * avatar: the pill of direction C, menu icon and 34 px blue avatar (TopNav);
   * header: 40 px blue avatar on a dark header (AdminMobileHeader); card:
   * user card of the AdminSidebar.
   */
  variant?: "avatar" | "header" | "card";
  /** Card only: first name and role under it. */
  name?: string | null;
  role?: string;
  className?: string;
};

const itemClassName = cn(
  "flex h-11 cursor-pointer select-none items-center rounded-lk-sm px-3",
  "text-lk-compact font-medium text-lk-ink",
  "transition-colors duration-140 ease-out-lk data-[highlighted]:bg-lk-stone-2",
  "data-[disabled]:cursor-progress data-[disabled]:opacity-45",
);

function Avatar({ initial, className }: { initial: string | null; className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
    >
      {initial ?? <User className="size-4.5" />}
    </span>
  );
}

/**
 * Account menu (docs/DESIGN.md 10.6): opened from the avatar of the TopNav or
 * of the back office. Radix dropdown menu, keyboard included: « Mon espace »,
 * « Mon compte », then « Se déconnecter » after a separator. Floating panel:
 * radius 6, 1 px border, shadow-float, 220 ms (no movement with reduced
 * motion).
 */
export function AccountMenu({
  initial,
  homeHref,
  accountHref,
  signOut,
  variant = "avatar",
  name,
  role,
  className,
}: AccountMenuProps) {
  const [signingOut, startSignOut] = useTransition();
  const onDark = variant !== "avatar";
  const triggerFocus = cn(
    "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2",
    onDark ? "focus-visible:outline-white" : "focus-visible:outline-lk-blue",
  );

  return (
    // Not modal: the page keeps its scroll bar and is not hidden from
    // assistive technologies (axe aria-hidden-focus); Escape, a click outside
    // or the focus moving out close it.
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger asChild>
        {variant === "card" ? (
          <button
            type="button"
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 rounded-lk-sm bg-white/6 p-3 text-left text-white",
              "transition-colors duration-140 ease-out-lk hover:bg-white/12",
              triggerFocus,
              className,
            )}
          >
            <Avatar initial={initial} className="size-8.5 bg-lk-blue text-lk-caption" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-lk-label font-semibold">{name}</span>
              {role ? <span className="truncate text-lk-micro text-white/60">{role}</span> : null}
            </span>
          </button>
        ) : variant === "avatar" ? (
          <button
            type="button"
            aria-label={t.trigger}
            className={cn(
              "flex h-12 shrink-0 items-center gap-2.5 rounded-full border border-lk-line-strong bg-lk-surface pr-1.5 pl-4 text-lk-ink",
              "transition-shadow duration-140 ease-out-lk hover:shadow-lk-field data-[state=open]:shadow-lk-field",
              "focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
              className,
            )}
          >
            <Menu aria-hidden="true" className="size-4.5" />
            <Avatar initial={initial} className="size-8.5 bg-lk-blue text-lk-label" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={t.trigger}
            className={cn(
              // 44 px touch target around the 40 px avatar.
              "relative shrink-0 rounded-full after:absolute after:-inset-0.5",
              triggerFocus,
              className,
            )}
          >
            <Avatar initial={initial} className="size-10 bg-lk-blue text-lk-label" />
          </button>
        )}
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          side={variant === "card" ? "top" : "bottom"}
          align={variant === "card" ? "start" : "end"}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            facadeScope,
            "z-50 min-w-55 rounded-lk-md border border-lk-line bg-lk-surface p-1.5 shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "motion-reduce:animate-none",
          )}
        >
          <MenuPrimitive.Item asChild className={itemClassName}>
            <Link href={homeHref}>{t.home}</Link>
          </MenuPrimitive.Item>
          <MenuPrimitive.Item asChild className={itemClassName}>
            <Link href={accountHref}>{t.account}</Link>
          </MenuPrimitive.Item>
          <MenuPrimitive.Separator className="-mx-1.5 my-1.5 h-px bg-lk-line" />
          <MenuPrimitive.Item
            className={itemClassName}
            disabled={signingOut}
            // The action redirects: Next.js turns the redirect it throws into
            // a navigation (RedirectBoundary), as for a form action.
            onSelect={() => startSignOut(() => signOut())}
          >
            {t.signOut}
          </MenuPrimitive.Item>
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
