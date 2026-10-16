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
 * Back button over the mobile gallery (docs/DESIGN.md 7.1, 12.7): back to the
 * results the visitor came from (filters and scroll kept), otherwise to the
 * search. A link, so that it works before JavaScript too.
 */
export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href={SEARCH_PATH}
      aria-label={fr.listing.back}
      onClick={(event) => {
        if (lastSearch() === null) return;
        event.preventDefault();
        router.back();
      }}
      className={cn(
        iconButtonVariants({ variant: "white-float" }),
        "inline-flex items-center justify-center",
      )}
    >
      <ChevronLeft aria-hidden="true" />
    </Link>
  );
}
