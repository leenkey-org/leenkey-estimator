"use client";

import { X } from "lucide-react";
import { useSearch } from "./search-context";
import { Button } from "@/components/shared/button";
import { frSearch } from "@/lib/i18n/sections/search";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { search: frSearch } as const;

/**
 * « Retirer la zone » (L1-16b): the same search without the area of the map,
 * the other filters kept. A link-like button beside the count of the results
 * (44 px high), or an outline button in the empty state.
 */
export function ClearAreaButton({
  display = "link",
  className,
}: {
  display?: "link" | "button";
  className?: string;
}) {
  const { clearBbox, isPending } = useSearch();
  if (display === "button") {
    return (
      <Button variant="outline-ink" onClick={clearBbox} disabled={isPending} className={className}>
        {fr.search.results.clearArea}
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={clearBbox}
      disabled={isPending}
      className={cn(
        "-my-2.5 inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-2 text-lk-secondary font-semibold text-lk-blue underline underline-offset-2",
        "transition-colors duration-140 ease-out-lk hover:no-underline disabled:opacity-60 lg:text-lk-compact",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue [&_svg]:size-3.5",
        className,
      )}
    >
      <X aria-hidden="true" strokeWidth={2.2} />
      {fr.search.results.clearArea}
    </button>
  );
}
