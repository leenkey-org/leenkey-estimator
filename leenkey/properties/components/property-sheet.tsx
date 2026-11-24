import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  FolderOpen,
  HandCoins,
  Images,
  Info,
  ListChecks,
  Megaphone,
} from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { KeyFigures } from "@/components/shared/key-figures";
import { LinkTabs } from "@/components/shared/link-tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { SpaceNotificationBell } from "@/leenkey/navigation/components/space";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { legalDate } from "@/leenkey/billing/withdrawal";
import { frLegal } from "@/lib/i18n/sections/legal";
import { frProperties } from "@/lib/i18n/sections/properties";
import type { ListingDeletionFacts, SellerProperty } from "../queries";
import { creationHref, propertyName, sheetFigures, sheetTabs } from "../sheet";
import { ListingStatusActions } from "./listing-status-actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { legal: frLegal, properties: frProperties } as const;

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
          {/* The reason on its own line: Leenkey writes it without a full stop. */}
          {listing?.suspensionReason ? (
            <span className="block">{s.suspended.text(listing.suspensionReason)}</span>
          ) : null}
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
 * The request of the team to bring the listing into line (DECISIONS.md
 * 2026-11-22): its reason, its deadline, what follows without a change.
 */
function ComplianceNotice({ compliance }: { compliance: { reason: string; dueAt: string } }) {
  const c = t.compliance;
  // The deadline passed: the team may delete it (by hand, DECISIONS.md 2026-11-22).
  const overdue = new Date(compliance.dueAt).getTime() <= Date.now();
  return (
    <InlineAlert tone={overdue ? "danger" : "warning"} live={false}>
      <span className="block font-semibold">{c.title}</span>
      {/* The reason on its own line: the team writes it without a full stop. */}
      <span className="block">{c.reason(compliance.reason)}</span>
      <span>{overdue ? c.overdue : c.deadline(formatDateTime(compliance.dueAt))}</span>
    </InlineAlert>
  );
}

/** What the seller can still change: the request of the team is shown then only. */
const COMPLIANCE_STATUSES: readonly SellerProperty["listingStatus"][] = [
  "published",
  "paused",
  "rejected",
];

// The icons of the tabs in the side list, in the order of sheetTabs: Infos,
// Photos, Annonce, Étapes, Offres, Visites, Documents.
const TAB_ICONS = [Info, Images, Megaphone, ListChecks, HandCoins, CalendarDays, FolderOpen];

/**
 * Top of the page of a property (L1-14, G9 with Tabs, docs/DESIGN.md 13.1):
 * « Ma vente », the name of the property, its address and reference, its
 * status, its key figures (surface, rooms, floor, price per m²), what the
 * status means, the actions it allows, then the tabs Infos, Photos, Annonce.
 * The bell beside the title below 768 px, as on the other pages of the space.
 * From 1 024 px (Cédric, DECISIONS.md 2026-11-24), two columns: on the left,
 * the property in a card (figures two by two), the tabs as a side list, then
 * the actions; on the right, what the status means, then the tab (children).
 * One tree for both: below 1 024 px the two columns are `contents` and the
 * `order` of each part gives the order of a single column.
 */
export function PropertySheetHeader({
  property,
  roles,
  profileId,
  deletion = null,
  children,
}: {
  property: SellerProperty;
  /** The tab. */
  children: ReactNode;
  roles: readonly string[];
  /** The account the page is rendered for: its notifications. */
  profileId: string;
  /** A request of the team, a paid plan: said around the deletion; null when unknown. */
  deletion?: ListingDeletionFacts | null;
}) {
  const { address, listing } = property;
  const figures = sheetFigures(property);
  const tabs = sheetTabs(property.id).map((tab, index) => {
    const Icon = TAB_ICONS[index];
    return Icon ? { ...tab, icon: <Icon strokeWidth={1.75} /> } : tab;
  });
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-10">
      <div className="contents lg:flex lg:flex-col lg:gap-4">
        <Link
          href="/vendeur"
          className="order-1 -ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-lk-sm pr-2 text-lk-secondary font-medium text-lk-ink-2 hover:text-lk-ink focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="order-2 flex flex-col gap-4 lg:rounded-lk-2xl lg:border lg:border-lk-line lg:bg-lk-surface lg:p-5 lg:shadow-lk-field">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-h2">
                {propertyName(property)}
              </h1>
              <p className="text-lk-secondary text-lk-ink-3">
                {address.line} · {address.postalCode} {address.city}
                {listing ? <> · {t.reference(listing.reference)}</> : null}
              </p>
              <StatusBadge status={property.listingStatus ?? "draft"} className="mt-1 self-start" />
            </div>
            <SpaceNotificationBell roles={roles} profileId={profileId} className="md:hidden" />
          </div>
          {figures.length > 0 ? <KeyFigures items={figures} className="lg:grid-cols-2" /> : null}
        </div>
        <div className="order-4">
          <ListingStatusActions
            propertyId={property.id}
            listingId={listing?.id ?? null}
            status={property.listingStatus}
            resumeHref={creationHref(property)}
            publicHref={listing?.status === "published" ? `/annonce/${listing.slug}` : null}
            paidPlan={deletion?.paidPlan ?? false}
            withdrawalUntil={deletion?.withdrawalUntil ? legalDate(deletion.withdrawalUntil) : null}
            contactEmail={fr.legal.contactEmail}
          />
        </div>
        <LinkTabs
          label={t.tabs.label}
          tabs={tabs}
          aside
          className="order-5 mt-2 lg:order-3 lg:mt-0"
        />
      </div>
      <div className="contents lg:mt-15 lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
        <div className="order-3 flex flex-col gap-4 empty:hidden">
          <StatusNotice property={property} />
          {deletion?.compliance && COMPLIANCE_STATUSES.includes(property.listingStatus) ? (
            <ComplianceNotice compliance={deletion.compliance} />
          ) : null}
        </div>
        <div className="order-6 mt-2 min-w-0 lg:mt-0">{children}</div>
      </div>
    </div>
  );
}
