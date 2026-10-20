"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentHref, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Links of the TopNav (docs/DESIGN.md 10.6): 14 px 500 ink, the current one
 * in blue with aria-current and a line under it, the others drawing that line
 * on hover. Client side, so that the current link follows the address when a
 * layout is not rendered again.
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
            <li
              key={link.href}
              className={cn(
                link.from === "lg" && "hidden lg:list-item",
                link.from === "xl" && "hidden xl:list-item",
              )}
            >
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // 44 px high touch target inside the 72 px bar.
                  "relative inline-flex h-11 items-center whitespace-nowrap rounded-lk-sm text-lk-compact font-medium",
                  "transition-colors duration-140 ease-out-lk",
                  // A 2 px blue line under the label, drawn from the left on
                  // hover, kept under the current link (DESIGN.md 9).
                  "after:absolute after:inset-x-0 after:bottom-2 after:h-0.5 after:origin-left after:bg-lk-blue",
                  "after:transition-transform after:duration-220 after:ease-out-lk",
                  active
                    ? "text-lk-blue after:scale-x-100"
                    : "text-lk-ink after:scale-x-0 hover:text-lk-blue hover:after:scale-x-100",
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
