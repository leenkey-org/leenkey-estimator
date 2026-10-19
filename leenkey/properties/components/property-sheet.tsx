import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { KeyFigures } from "@/components/shared/key-figures";
import { LinkTabs } from "@/components/shared/link-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { formatDate, formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import type { SellerProperty } from "../queries";
import { creationHref, propertyName, sheetFigures, sheetTabs } from "../sheet";
import { ListingStatusActions } from "./listing-status-actions";

const t = fr.properties.sheet;

/**
 * What the status of the listing means for the seller, and what Leenkey said:
 * the title on its own line, in bold, then the text.
 */
function StatusNotice({ property }: { property: SellerProperty }) {
  const s = t.status;
  const listing = property.listing;
  const notice = (
    tone: "info" | "warning" | "success" | "danger",
    title: string,
    body: ReactNode,
  ) => (
    <InlineAlert tone={tone} live={false}>
      <span className="block font-semibold">{title}</span>
      {body ? <span>{body}</span> : null}
    </InlineAlert>
  );
  switch (property.listingStatus ?? "draft") {
    case "draft":
      return notice("info", s.draft.title, s.draft.text);
    case "pending":
      return notice("info", s.pending.title, s.pending.text);
    case "rejected":
      return notice(
        "warning",
        s.rejected.title,
        listing?.rejectionReason ? s.rejected.text(listing.rejectionReason) : null,
      );
    case "published":
      return notice(
        "success",
        s.published.title,
        s.published.text(listing?.publishedAt ? formatDate(listing.publishedAt) : null),
      );
    case "paused":
      return notice("info", s.paused.title, s.paused.text);
    case "suspended":
      return notice(
        "danger",
        s.suspended.title,
        <>
          {listing?.suspensionReason ? <>{s.suspended.text(listing.suspensionReason)} </> : null}
          {s.suspended.readOnly}{" "}
          <a
            href={`mailto:${fr.legal.contactEmail}`}
            className="font-semibold underline underline-offset-2"
          >
            {fr.legal.contactEmail}
          </a>
          .
        </>,
      );
    case "sold":
      return notice(
        "success",
        s.sold.title,
        s.sold.text(
          listing?.soldAt ? formatDate(listing.soldAt) : null,
          listing?.soldPriceCents ? formatPrice(listing.soldPriceCents) : null,
        ),
      );
  }
}

/**
 * Top of the page of a property (L1-14, G9 with Tabs, docs/DESIGN.md 13.1):
 * « Ma vente », the name of the property, its address and reference, its
 * status, its key figures (surface, rooms, floor, price per m²), what the
 * status means, the actions it allows, then the tabs Infos, Photos, Annonce.
 * The bell beside the title below 768 px, as on the other pages of the space.
 */
export function PropertySheetHeader({
  property,
  roles,
}: {
  property: SellerProperty;
  roles: readonly string[];
}) {
  const { address, listing } = property;
  const figures = sheetFigures(property);
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/vendeur"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-lk-sm pr-2 text-lk-secondary font-medium text-lk-ink-2 hover:text-lk-ink focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lk-blue"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        {t.back}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-h1-lg">
            {propertyName(property)}
          </h1>
          <p className="text-lk-secondary text-lk-ink-3">
            {address.line} · {address.postalCode} {address.city}
            {listing ? <> · {t.reference(listing.reference)}</> : null}
          </p>
          <StatusBadge status={property.listingStatus ?? "draft"} className="mt-1 self-start" />
        </div>
        <SpaceNotificationBell roles={roles} className="md:hidden" />
      </div>
      {figures.length > 0 ? <KeyFigures items={figures} /> : null}
      <StatusNotice property={property} />
      <ListingStatusActions
        propertyId={property.id}
        listingId={listing?.id ?? null}
        status={property.listingStatus}
        resumeHref={creationHref(property)}
        publicHref={listing?.status === "published" ? `/annonce/${listing.slug}` : null}
      />
      <LinkTabs label={t.tabs.label} tabs={sheetTabs(property.id)} className="mt-2" />
    </div>
  );
}
