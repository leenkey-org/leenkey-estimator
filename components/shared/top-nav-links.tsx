"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Links of the TopNav (docs/DESIGN.md 10.6): 14 px 500 ink, the current one
 * in blue with aria-current. Client side, so that the current link follows
 * the address when a layout is not rendered again.
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
          return (
            <li key={link.href} className={cn(link.wide && "hidden lg:list-item")}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // 44 px high touch target inside the 72 px bar.
                  "inline-flex h-11 items-center whitespace-nowrap rounded-lk-sm text-lk-compact font-medium",
                  "transition-colors duration-140 ease-out-lk",
                  active ? "text-lk-blue" : "text-lk-ink hover:text-lk-blue",
                )}
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
