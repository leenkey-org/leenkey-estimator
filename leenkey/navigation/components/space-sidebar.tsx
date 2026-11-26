"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "@/components/shared/nav-icon";
import { currentHref } from "@/components/shared/nav-items";
import { cn } from "@/lib/utils";
import { hasSpaceSidebar, spaceSidebar } from "../config";
import { useSpace } from "./space-context";

const card = "rounded-lk-2xl border border-lk-line bg-lk-surface";

/**
 * The column of the signed-in areas from 1 024 px (Younes, DECISIONS.md
 * 2026-11-26, docs/DESIGN.md 10.6): the card of the account (initial, name,
 * email), then the pages of the current space, the current one on a tinted
 * pill. It follows the space of the page (useSpace): a shared page (the
 * account, an offer, a visit) keeps the column of the space the visitor came
 * from. Nothing below 1 024 px, where the BottomNav and the TopNav lead;
 * nothing in the back office nor on the messaging.
 */
export function SpaceSidebar({
  roles,
  initial,
  name,
  email,
}: {
  roles: readonly string[];
  /** Capital initial of the first name, as in the avatar of the TopNav. */
  initial: string | null;
  name: string | null;
  email: string | null;
}) {
  const pathname = usePathname();
  const sidebar = spaceSidebar(useSpace(roles));
  if (!sidebar || !hasSpaceSidebar(pathname)) return null;
  const current = currentHref(pathname, sidebar.groups.flat());
  return (
    <aside className="hidden w-66 shrink-0 self-start py-10 pl-(--lk-gutter) lg:sticky lg:top-18 lg:flex lg:max-h-[calc(100dvh-4.5rem)] lg:flex-col lg:gap-4 lg:overflow-y-auto xl:w-74">
      {name || email ? (
        <div className={cn(card, "flex items-center gap-3 p-4")}>
          {initial ? (
            <span
              aria-hidden="true"
              className="lk-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-lk-body font-semibold text-white"
            >
              {initial}
            </span>
          ) : null}
          <p className="flex min-w-0 flex-col">
            {name ? (
              <span className="truncate text-lk-body font-semibold text-lk-ink">{name}</span>
            ) : null}
            {email ? (
              <span className="truncate text-lk-secondary text-lk-ink-3">{email}</span>
            ) : null}
          </p>
        </div>
      ) : null}
      <nav aria-label={sidebar.label} className={cn(card, "p-2")}>
        {sidebar.groups.map((group, index) => (
          <ul
            key={group[0]?.href ?? index}
            className={cn(
              "flex flex-col gap-0.5",
              index > 0 && "mt-2 border-t border-lk-line pt-2",
            )}
          >
            {group.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-lk-xl px-3 text-lk-compact transition-colors focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
                      active
                        ? "bg-lk-blue-tint font-semibold text-lk-blue-dark"
                        : "font-medium text-lk-ink-2 hover:bg-lk-sand hover:text-lk-ink",
                    )}
                  >
                    {item.icon ? (
                      <NavIcon
                        name={item.icon}
                        className={cn(
                          "size-5 shrink-0",
                          active ? "lk-icon-gradient" : "text-lk-ink-3",
                        )}
                      />
                    ) : null}
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
    </aside>
  );
}
