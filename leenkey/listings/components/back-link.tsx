"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { previousRoute } from "@/leenkey/navigation/route-history";
import { lastSearch } from "@/leenkey/search/last-search";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "@/lib/validations/search";

/**
 * « Retour aux annonces »: back to the results the visitor came from, filters
 * and scroll kept, when the page before is the search; otherwise to the last
 * search of the visit (from a conversation, the home page), or to /acheter. A
 * link, so that it works before JavaScript too and opens in a new tab when
 * asked to. float: the button over the mobile gallery (docs/DESIGN.md 7.1,
 * 12.7); text: above the gallery from 1 024 px (Younes, DECISIONS 2026-10-26).
 */
export function BackLink({ variant = "float" }: { variant?: "float" | "text" }) {
  const router = useRouter();
  const [href, setHref] = useState(SEARCH_PATH);
  useEffect(() => setHref(lastSearch() ?? SEARCH_PATH), []);
  const text = variant === "text";
  return (
    <Link
      href={href}
      aria-label={text ? undefined : fr.listing.backToListings}
      onClick={(event) => {
        // A new tab or window (modifier keys, middle button) is left to the browser.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0 || previousRoute() !== SEARCH_PATH) return;
        event.preventDefault();
        router.back();
      }}
      className={
        text
          ? cn(
              "inline-flex min-h-11 items-center gap-1 rounded-lk-sm text-lk-compact font-semibold text-lk-blue",
              "underline-offset-2 hover:underline",
            )
          : cn(
              iconButtonVariants({ variant: "white-float" }),
              "inline-flex items-center justify-center",
            )
      }
    >
      <ChevronLeft aria-hidden="true" className={text ? "size-4" : undefined} />
      {text ? fr.listing.backToListings : null}
    </Link>
  );
}
