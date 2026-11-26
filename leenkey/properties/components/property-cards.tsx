import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { Photo } from "@/components/shared/photo";
import { StatusBadge } from "@/components/shared/status-badge";
import { listingSummary } from "@/leenkey/listings/presentation";
import { formatPrice } from "@/lib/format";
import { frProperties } from "@/lib/i18n/sections/properties";
import { cn } from "@/lib/utils";
import { photoUrl } from "../photo-files";
import type { SellerProperty } from "../queries";
import { propertyName, sheetHref } from "../sheet";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { properties: frProperties } as const;

const list = fr.properties.list;

/** « Appartement 3 pièces · 68 m² », null while the characteristics are missing. */
function summary(property: SellerProperty): string | null {
  const { type, rooms, surfaceM2 } = property.characteristics;
  return type !== null && rooms !== null && surfaceM2 !== null
    ? listingSummary({ type, rooms, surfaceM2 })
    : null;
}

/**
 * The properties of the seller on « Ma vente » (2026-11-25, Younes: « effets
 * sur les vignettes »): a card each, its main photo in 4:3 with its status
 * on it, its name, its summary, its address and its price; each one opens
 * its page (L1-14), from which a draft resumes. One a row on a phone, two
 * from 640 px, three from 1 024 px, four from 1 536 px (1 280 px before the
 * column of the space, DECISIONS.md 2026-11-26). A link: hovered or focused,
 * the card rises 2 px and its photo zooms slowly (DESIGN.md 9), never with
 * prefers-reduced-motion. The property shown above in the outline of the
 * gradient, « Vente affichée » on its photo.
 */
export function PropertyCards({
  properties,
  currentId,
}: {
  properties: readonly SellerProperty[];
  /** The property « Ma vente » shows. */
  currentId?: string;
}) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {properties.map((property) => {
        const status = property.listingStatus ?? "draft";
        const current = property.id === currentId;
        const name = propertyName(property);
        // Under the title of the listing; the title itself without one.
        const kind = property.listing ? summary(property) : null;
        return (
          <li key={property.id} className="flex">
            <Link
              href={sheetHref(property.id)}
              aria-current={current ? "true" : undefined}
              className={cn(
                "group relative flex w-full flex-col rounded-lk-d-card",
                current
                  ? "lk-gradient-border p-1.75 shadow-lk-d-featured"
                  : "border border-lk-line bg-lk-surface p-2 shadow-lk-d-field",
                "transition-[translate,box-shadow,border-color] duration-220 ease-out-lk",
                "hover:shadow-lk-d-block focus-visible:shadow-lk-d-block",
                !current && "hover:border-lk-blue-border",
                "motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5",
                "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
              )}
            >
              <div
                aria-hidden="true"
                className="relative aspect-4/3 overflow-hidden rounded-lk-xl bg-lk-stone-2"
              >
                {property.coverPath ? (
                  <span className="absolute inset-0 transition-transform duration-500 ease-out-lk motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-visible:scale-[1.04]">
                    <Photo
                      src={photoUrl(property.coverPath)}
                      alt=""
                      sizes="(min-width: 1280px) 280px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 100vw"
                    />
                  </span>
                ) : (
                  <span className="flex h-full items-center justify-center">
                    <FacadeDrawing className="w-2/5 text-lk-ink-3" />
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 px-2 pt-3 pb-2">
                <p className="line-clamp-2 text-lk-title font-semibold text-lk-ink">{name}</p>
                {kind ? <p className="truncate text-lk-label text-lk-ink-2">{kind}</p> : null}
                <p className="flex min-w-0 items-center gap-1 text-lk-caption text-lk-ink-3">
                  <MapPin aria-hidden="true" strokeWidth={1.75} className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {property.address.line} · {property.address.city}
                  </span>
                </p>
                {property.listing ? (
                  <p className="mt-auto pt-1.5 text-lk-card-price font-bold text-wide tabular text-lk-ink">
                    {formatPrice(property.listing.priceCents)}
                  </p>
                ) : null}
              </div>
              {/* On the photo (the same box), after the name in the reading order. */}
              <div
                className={cn(
                  "pointer-events-none absolute flex aspect-4/3 flex-col items-start justify-between p-2.5",
                  current ? "inset-x-1.75 top-1.75" : "inset-x-2 top-2",
                )}
              >
                <StatusBadge status={status} className="shadow-lk-badge" />
                {current ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-lk-surface px-2.5 py-1.25 text-lk-micro font-semibold text-lk-blue-dark shadow-lk-badge">
                    <Check aria-hidden="true" strokeWidth={2.5} className="size-3" />
                    {list.current}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
