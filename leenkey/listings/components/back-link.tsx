"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { lastSearch } from "@/leenkey/search/last-search";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "@/lib/validations/search";

/**
 * Back to the results the visitor came from (filters and scroll kept),
 * otherwise to the search. A link, so that it works before JavaScript too.
 * float: the button over the mobile gallery (docs/DESIGN.md 7.1, 12.7); text:
 * « Retour aux annonces » above the gallery from 1 024 px (Younes,
 * DECISIONS 2026-10-26).
 */
export function BackLink({ variant = "float" }: { variant?: "float" | "text" }) {
  const router = useRouter();
  const text = variant === "text";
  return (
    <Link
      href={SEARCH_PATH}
      aria-label={text ? undefined : fr.listing.back}
      onClick={(event) => {
        if (lastSearch() === null) return;
        event.preventDefault();
        router.back();
      }}
      className={
        text
          ? cn(
              "inline-flex items-center gap-1 rounded-lk-sm text-lk-compact font-semibold text-lk-blue",
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
