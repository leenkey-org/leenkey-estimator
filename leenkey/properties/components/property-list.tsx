import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PropertyThumb } from "@/components/shared/property-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { listingSummary } from "@/leenkey/listings/presentation";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { photoUrl } from "../photo-files";
import type { SellerProperty } from "../queries";
import { sheetHref } from "../sheet";

function summary(property: SellerProperty): string {
  const { type, rooms, surfaceM2 } = property.characteristics;
  return type !== null && rooms !== null && surfaceM2 !== null
    ? listingSummary({ type, rooms, surfaceM2 })
    : fr.properties.list.untitled;
}

/**
 * The properties of the seller (« Ma vente », « Dossier »): main photo,
 * summary, address and status; each one opens its page (L1-14), from which
 * a draft resumes. `wide` (a page of the width of the screen, L1-56): from
 * 1 280 px, a card each, two then three a row.
 */
export function PropertyList({
  properties,
  wide = false,
}: {
  properties: readonly SellerProperty[];
  wide?: boolean;
}) {
  return (
    <ul
      className={cn(
        "flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface",
        wide &&
          "xl:grid xl:grid-cols-2 xl:gap-3 xl:divide-y-0 xl:border-0 xl:bg-transparent 2xl:grid-cols-3",
      )}
    >
      {properties.map((property) => {
        const status = property.listingStatus ?? "draft";
        return (
          <li
            key={property.id}
            className={cn(
              wide &&
                "xl:overflow-hidden xl:rounded-lk-md xl:border xl:border-lk-line xl:bg-lk-surface",
            )}
          >
            <Link
              href={sheetHref(property.id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-lk-stone-2"
            >
              <PropertyThumb
                src={property.coverPath ? photoUrl(property.coverPath) : null}
                className="size-14"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-lk-compact font-semibold text-lk-ink">
                  {summary(property)}
                </p>
                <p className="truncate text-lk-caption text-lk-ink-3">
                  {property.address.line} · {property.address.city}
                </p>
                {/* Under the text on a phone: the summary keeps its width. */}
                <StatusBadge status={status} className="mt-1 self-start md:hidden" />
              </div>
              <StatusBadge status={status} className="hidden md:inline-flex" />
              <ChevronRight aria-hidden="true" className="size-4 text-lk-ink-3" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
