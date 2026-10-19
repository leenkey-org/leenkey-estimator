import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AppHeader } from "@/components/shared/app-header";
import { iconButtonVariants } from "@/components/shared/icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.properties.edit;

/**
 * Header of the pages that change a listing once sent (L1-14b, G5 without
 * steps, docs/DESIGN.md 10.4 AppHeader): back to the page of the property,
 * « Modifier votre bien »; the form saves with its own button.
 */
export function EditHeader({ backHref }: { backHref: string }) {
  return (
    <AppHeader
      title={t.title}
      back={
        <Link
          href={backHref}
          aria-label={t.back}
          className={cn(
            iconButtonVariants({ variant: "stone" }),
            "inline-flex items-center justify-center",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
      }
    />
  );
}
