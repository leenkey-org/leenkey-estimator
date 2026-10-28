"use client";

import Link from "next/link";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { facadeScope } from "@/components/shared/facade-root";
import { StatusBadge } from "@/components/shared/status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ListingStatus = Database["public"]["Enums"]["listing_status"];

const t = fr.saleDashboard;

export type PropertyChoice = {
  id: string;
  label: string;
  /** `/vendeur?bien=`. */
  href: string;
  status: ListingStatus;
  current: boolean;
};

/**
 * The property of « Ma vente », among those of the seller (SPEC-V2 8.7: a
 * selector under the greeting): a pill on the night of the header, a menu of
 * links, the one shown ticked. A menu rather than a row of pills: a seller
 * with seven properties keeps the header as short as with one.
 */
export function PropertySwitcher({ choices }: { choices: readonly PropertyChoice[] }) {
  return (
    // Not modal, as the account menu: the page keeps its scroll bar and stays
    // readable by assistive technologies.
    <MenuPrimitive.Root modal={false}>
      <MenuPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 self-start rounded-full bg-white/10 pr-3 pl-3.5 text-lk-label font-semibold text-white",
            "transition-colors duration-140 ease-out-lk hover:bg-white/20 data-[state=open]:bg-white/20",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:outline-solid",
            // 44 px of target (DESIGN.md 15).
            "relative after:absolute after:inset-x-0 after:-inset-y-1",
          )}
        >
          {t.switch.trigger}
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            facadeScope,
            "z-50 flex max-h-(--radix-dropdown-menu-content-available-height) w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-y-auto rounded-lk-md border border-lk-line bg-lk-surface p-1.5 shadow-float",
            "duration-220 ease-out-lk data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[side=bottom]:slide-in-from-top-2",
            "motion-reduce:animate-none",
          )}
        >
          {choices.map((choice) => (
            <MenuPrimitive.Item key={choice.id} asChild>
              <Link
                href={choice.href}
                aria-current={choice.current ? "page" : undefined}
                className={cn(
                  "flex min-h-12 cursor-pointer select-none items-center gap-2.5 rounded-lk-sm px-3 py-2",
                  "text-lk-compact text-lk-ink outline-none",
                  "transition-colors duration-140 ease-out-lk data-[highlighted]:bg-lk-stone-2",
                )}
              >
                <Check
                  aria-hidden="true"
                  className={cn("size-4 shrink-0 text-lk-blue", choice.current ? "" : "invisible")}
                />
                <span
                  className={cn(
                    "line-clamp-2 min-w-0 flex-1",
                    choice.current ? "font-semibold" : "font-medium",
                  )}
                >
                  {choice.label}
                </span>
                <StatusBadge status={choice.status} className="shrink-0" />
              </Link>
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
