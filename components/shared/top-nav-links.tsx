"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/** The mouse resting on a group opens it after this pause, leaving it closes it after this one. */
const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 150;
/** A click this soon after an opening by the mouse meant to open it too: it keeps it open. */
const CLICK_GRACE_MS = 500;

/** 14 px 500, then 600 from 1 024 px and 15 px from 1 280 px, 44 px high in the 72 px bar, the current one underlined (charte D). */
function linkClassName(active: boolean, night = false) {
  if (night) {
    return cn(
      "relative inline-flex h-11 items-center whitespace-nowrap rounded-lk-sm text-lk-compact font-medium text-white xl:text-lk-title",
      // The violet light of the night under the current link (charte D).
      "after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:origin-left after:bg-lk-night-violet",
      "after:transition-transform after:duration-220 after:ease-out-lk",
      active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
    );
  }
  return cn(
    // 44 px high touch target inside the 72 px bar.
    "relative inline-flex h-11 items-center whitespace-nowrap rounded-lk-sm text-lk-compact font-medium lg:font-semibold xl:text-lk-title",
    "transition-colors duration-140 ease-out-lk",
    // A 2 px indigo line under the label (the line of a tab of the charte),
    // drawn from the left on hover, kept under the current link (DESIGN.md 9).
    "after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:origin-left after:bg-lk-indigo-mark",
    "after:transition-transform after:duration-220 after:ease-out-lk",
    active
      ? "text-lk-ink after:scale-x-100"
      : "text-lk-ink after:scale-x-0 hover:after:scale-x-100",
  );
}

/**
 * A link of an open group: the rows of the AccountMenu; the one of the page in
 * blue and underlined (never told by the colour alone, DESIGN.md 15).
 */
function groupLinkClassName(page: boolean) {
  return cn(
    "flex h-11 items-center whitespace-nowrap rounded-lk-sm px-3 text-lk-compact font-medium",
    "transition-colors duration-140 ease-out-lk hover:bg-lk-stone-2 focus-visible:bg-lk-stone-2",
    page ? "text-lk-blue underline decoration-2 underline-offset-6" : "text-lk-ink",
  );
}

/**
 * A group of the TopNav (« Qui sommes-nous », L1-51, docs/DESIGN.md 10.6): a
 * button that shows its links under it (disclosure: aria-expanded, then the
 * links in the tab order).
 * - Opened by a click, Enter or Space, it stays open until Escape (the focus
 *   back on the button), a press outside, the focus moving out of the group,
 *   a link followed or another page.
 * - Opened by the mouse resting on it, it also closes when the mouse leaves
 *   the group, unless the focus is in it; a click right after the opening
 *   keeps it open (it meant to open it), a later one closes it.
 * Panel of the AccountMenu, 8 px under the button, its rows aligned on the
 * label; the TopNav is above the sticky headers of the pages (layer 30).
 */
function NavGroup({
  link,
  items,
  active,
  here,
  night = false,
  className,
}: {
  link: NavItem;
  items: readonly NavItem[];
  /** The page is one of the group's. */
  active: boolean;
  /** Href of the link of this page. */
  here: string | null;
  night?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  // The page it was opened on: another page closes it, and coming back
  // (Back, then Forward) does not open it again.
  const [openOn, setOpenOn] = useState<string | null>(null);
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn === pathname;
  const id = useId();
  const group = useRef<HTMLLIElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  // When the mouse opened it; null when a click or the keyboard did.
  const hoveredAt = useRef<number | null>(null);

  const show = useCallback(
    (next: boolean, onHover = false) => {
      window.clearTimeout(timer.current);
      hoveredAt.current = next && onHover ? performance.now() : null;
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
      // The mouse only: a tap is a click.
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        if (open) window.clearTimeout(timer.current);
        else showLater(true, OPEN_DELAY_MS);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "mouse") return;
        if (!open) window.clearTimeout(timer.current);
        else if (hoveredAt.current !== null && !group.current?.contains(document.activeElement)) {
          showLater(false, CLOSE_DELAY_MS);
        }
      }}
      // The focus going to an element out of the group (Tab); a press that
      // gives it to nothing (a link in Safari) is left to the document.
      onBlur={(event) => {
        const to = event.relatedTarget;
        if (open && to && !event.currentTarget.contains(to)) show(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        // Its pages are the group's: in blue and underlined, as a current link.
        aria-current={active ? "true" : undefined}
        onClick={(event) => {
          const hovered = hoveredAt.current;
          // A real click (not Enter nor Space) right after the mouse opened it.
          if (
            open &&
            hovered !== null &&
            event.detail > 0 &&
            performance.now() - hovered < CLICK_GRACE_MS
          ) {
            hoveredAt.current = null;
            return;
          }
          show(!open);
        }}
        className={cn(linkClassName(active || open, night), "group cursor-pointer gap-1")}
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
        <ul className="lk-on-light min-w-55 rounded-lk-md border border-lk-line bg-lk-surface p-1.5 shadow-float">
          {items.map((item) => {
            const page = item.href === here;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={page ? "page" : undefined}
                  onClick={() => show(false)}
                  className={groupLinkClassName(page)}
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
  night = false,
}: {
  label: string;
  links: readonly NavItem[];
  activeHref?: string | null;
  /** White, on the night of the home page D. */
  night?: boolean;
}) {
  const pathname = usePathname();
  const current = activeHref === undefined ? currentHref(pathname, links) : activeHref;
  return (
    <nav aria-label={label} className="min-w-0">
      <ul className="flex items-center gap-3 lg:gap-4 xl:gap-6">
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
                night={night}
                className={shown}
              />
            );
          }
          return (
            <li key={link.href} className={shown}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={linkClassName(active, night)}
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
