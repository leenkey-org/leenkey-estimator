"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { pathnameOf } from "./nav-items";

export type LinkTab = { href: string; label: string };

/**
 * Tabs (docs/DESIGN.md 10.2, « Tabs »): the pages of one object (Infos,
 * Photos, Annonce of a property), as links, the current one marked with
 * aria-current. Text 14 px 500 `--lk-ink-3`; current `--lk-ink` 600 with a
 * 2 px blue line on the bottom edge; no background. On a narrow screen, the
 * row scrolls sideways.
 */
export function LinkTabs({
  label,
  tabs,
  current,
  className,
}: {
  /** Name of the navigation (« Rubriques de votre bien »). */
  label: string;
  tabs: readonly LinkTab[];
  /** Href of the current tab; by default, the one of the page (catalogue /design). */
  current?: string;
  className?: string;
}) {
  const path = pathnameOf(usePathname());
  return (
    <nav
      aria-label={label}
      className={cn(
        "-mx-5 overflow-x-auto border-b border-lk-line px-5 md:mx-0 md:px-0",
        className,
      )}
    >
      <ul className="flex gap-6">
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
                  "focus-visible:outline-solid focus-visible:outline-3 focus-visible:-outline-offset-2 focus-visible:outline-lk-blue",
                  active
                    ? "font-semibold text-lk-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.75 after:rounded-full after:bg-lk-indigo-mark"
                    : "font-medium text-lk-ink-3 hover:text-lk-ink",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
