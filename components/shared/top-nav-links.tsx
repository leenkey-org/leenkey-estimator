"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/** The pointer resting on a group opens it after this pause, leaving it closes it after this one. */
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 150;

/** 14 px 500, 44 px high in the 72 px bar, the current one in blue. */
function linkClassName(active: boolean) {
  return cn(
    // 44 px high touch target inside the 72 px bar.
    "relative inline-flex h-11 items-center whitespace-nowrap rounded-lk-sm text-lk-compact font-medium",
    "transition-colors duration-140 ease-out-lk",
    // A 2 px blue line under the label, drawn from the left on hover, kept
    // under the current link (DESIGN.md 9).
    "after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:origin-left after:bg-lk-blue",
    "after:transition-transform after:duration-220 after:ease-out-lk",
    active
      ? "text-lk-blue after:scale-x-100"
      : "text-lk-ink after:scale-x-0 hover:text-lk-blue hover:after:scale-x-100",
  );
}

/** A link of an open group: the rows of the AccountMenu. */
const groupLinkClassName = cn(
  "flex h-11 items-center whitespace-nowrap rounded-lk-sm px-3 text-lk-compact font-medium",
  "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:bg-lk-stone-2",
);

/**
 * A group of the TopNav (« Qui sommes-nous », L1-51): a button that shows its
 * links under it (disclosure: aria-expanded, then the links in the tab order),
 * on a click, Enter or Space, or when the pointer rests on it. The click that
 * follows an opening by the pointer keeps it open (it meant to open it).
 * Escape, a click outside, the focus or the pointer leaving the group, a link
 * followed close it. Panel of the AccountMenu, 8 px under the button, its rows
 * aligned on the label.
 */
function NavGroup({
  link,
  items,
  active,
  here,
  className,
}: {
  link: NavItem;
  items: readonly NavItem[];
  /** The page is one of the group's. */
  active: boolean;
  /** Href of the link of this page. */
  here: string | null;
  className?: string;
}) {
  const pathname = usePathname();
  // Open on the page it was opened on: a navigation closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const id = useId();
  const group = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const openedOnHover = useRef(false);

  const show = useCallback(
    (next: boolean, onHover = false) => {
      window.clearTimeout(timer.current);
      openedOnHover.current = next && onHover;
      setOpenOn(next ? pathname : null);
    },
    [pathname],
  );
  const showLater = (next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => show(next, true), delay);
  };

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!group.current?.contains(event.target as Node)) show(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const inside = group.current?.contains(document.activeElement) ?? false;
      show(false);
      if (inside) button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, show]);

  return (
    <li
      ref={group}
      className={cn("relative", className)}
      // A mouse only: a tap is a click.
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        if (open) window.clearTimeout(timer.current);
        else showLater(true, OPEN_DELAY_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        if (open) showLater(false, CLOSE_DELAY_MS);
        else window.clearTimeout(timer.current);
      }}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) show(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (open && openedOnHover.current) {
            openedOnHover.current = false;
            return;
          }
          show(!open);
        }}
        className={cn(linkClassName(active || open), "group gap-1")}
      >
        {link.label}
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform duration-220 ease-out-lk group-aria-expanded:rotate-180 motion-reduce:transition-none"
        />
      </button>
      {/* In its padding, the 8 px under the button: the pointer never leaves the group on its way. */}
      <div
        id={id}
        hidden={!open}
        className="absolute top-full -left-4.75 z-10 animate-in pt-2 duration-220 ease-out-lk fade-in-0 slide-in-from-top-2 motion-reduce:animate-none"
      >
        <ul className="min-w-55 rounded-lk-md border border-lk-line bg-lk-surface p-1.5 shadow-float">
          {items.map((item) => {
            const page = item.href === here;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={page ? "page" : undefined}
                  onClick={() => show(false)}
                  className={cn(groupLinkClassName, page ? "text-lk-blue" : "text-lk-ink")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

/**
 * Links of the TopNav (docs/DESIGN.md 10.6): 14 px 500 ink, the current one
 * in blue with aria-current and a line under it, the others drawing that line
 * on hover; a group opens its links under it (NavGroup). Client side, so that
 * the current link follows the address when a layout is not rendered again.
 */
export function TopNavLinks({
  label,
  links,
  activeHref,
}: {
  label: string;
  links: readonly NavItem[];
  activeHref?: string | null;
}) {
  const pathname = usePathname();
  const current = activeHref === undefined ? currentHref(pathname, links) : activeHref;
  return (
    <nav aria-label={label} className="min-w-0">
      <ul className="flex items-center gap-5 lg:gap-6">
        {links.map((link) => {
          const active = link.href === current;
          const shown = cn(
            link.from === "lg" && "hidden lg:list-item",
            link.from === "xl" && "hidden xl:list-item",
          );
          if (link.items) {
            return (
              <NavGroup
                key={link.href}
                link={link}
                items={link.items}
                active={active}
                here={active ? currentHref(pathname, link.items) : null}
                className={shown}
              />
            );
          }
          return (
            <li key={link.href} className={shown}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={linkClassName(active)}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
