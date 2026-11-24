"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pathnameOf } from "./nav-items";

export type LinkTab = {
  href: string;
  label: string;
  /** Shown before the label in the side list (`aside`), from 1 024 px. */
  icon?: ReactNode;
};

/**
 * Tabs (docs/DESIGN.md 10.2, « Tabs »): the pages of one object (Infos,
 * Photos, Annonce of a property), as links, the current one marked with
 * aria-current. Text 14 px 500 `--lk-ink-3`; current `--lk-ink` 600 with a
 * 2 px blue line on the bottom edge; no background. On a narrow screen, the
 * row scrolls sideways. With `aside`, from 1 024 px, the tabs become a side
 * list (the page of a property, DECISIONS.md 2026-11-24): rows of 44 px with
 * their icon, the current one on `--lk-stone-2` in 600, no bottom line.
 */
export function LinkTabs({
  label,
  tabs,
  current,
  aside = false,
  className,
}: {
  /** Name of the navigation (« Rubriques de votre bien »). */
  label: string;
  tabs: readonly LinkTab[];
  /** Href of the current tab; by default, the one of the page (catalogue /design). */
  current?: string;
  /** A side list from 1 024 px instead of a row. */
  aside?: boolean;
  className?: string;
}) {
  const path = pathnameOf(usePathname());
  return (
    <nav
      aria-label={label}
      className={cn(
        "-mx-5 overflow-x-auto border-b border-lk-line px-5 md:mx-0 md:px-0",
        aside && "lg:overflow-visible lg:border-b-0",
        className,
      )}
    >
      <ul className={cn("flex gap-6", aside && "lg:flex-col lg:gap-1")}>
        {tabs.map((tab) => {
          const active =
            current !== undefined ? tab.href === current : pathnameOf(tab.href) === path;
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-lk-sm text-lk-compact whitespace-nowrap",
                  "focus-visible:outline-solid focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-lk-brand-blue",
                  active
                    ? "font-semibold text-lk-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.75 after:rounded-full after:bg-lk-indigo-mark"
                    : "font-medium text-lk-ink-3 hover:text-lk-ink",
                  aside &&
                    "lg:flex lg:w-full lg:gap-3 lg:rounded-lk-md lg:px-3 lg:text-lk-title lg:after:hidden",
                  aside && (active ? "lg:bg-lk-stone-2" : "lg:hover:bg-lk-stone-2"),
                )}
              >
                {aside && tab.icon ? (
                  <span
                    aria-hidden="true"
                    className="hidden shrink-0 lg:inline-flex [&_svg]:size-5"
                  >
                    {tab.icon}
                  </span>
                ) : null}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
