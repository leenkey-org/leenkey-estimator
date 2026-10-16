import Link from "next/link";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { SEARCH_PATH } from "@/lib/validations/search";

/** « Acheter › Savigny-sur-Orge › Appartement 3 pièces, centre » (docs/DESIGN.md 12.8). */
export function ListingBreadcrumb({
  city,
  cityHref,
  title,
  className,
}: {
  city: string;
  cityHref: string;
  title: string;
  className?: string;
}) {
  const link = "rounded-lk-sm text-lk-ink-3 underline-offset-2 hover:text-lk-ink hover:underline";
  return (
    <nav aria-label={fr.listing.breadcrumb} className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lk-secondary text-lk-ink-3">
        <li>
          <Link href={SEARCH_PATH} className={link}>
            {fr.listing.breadcrumbRoot}
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li>
          <Link href={cityHref} className={link}>
            {city}
          </Link>
        </li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" className={cn("min-w-0 truncate text-lk-ink")}>
          {title}
        </li>
      </ol>
    </nav>
  );
}
