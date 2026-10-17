import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { KeyFigures } from "@/components/shared/key-figures";
import { PriceBlock } from "@/components/shared/price-block";
import { SectionTitle } from "@/components/shared/section-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import {
  ListingModeration,
  ModerationFeedback,
} from "@/leenkey/admin/components/listing-moderation";
import { adminListing } from "@/leenkey/admin/queries";
import { isInLaunchZone } from "@/lib/config/launch-zone";
import { ListingDescription } from "@/leenkey/listings/components/listing-description";
import { listingKeyFacts } from "@/leenkey/listings/key-facts";
import { listingKeyFigures } from "@/leenkey/listings/presentation";
import { capitalize, formatDateShort, formatDateTime, formatRelative } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { adminListingsHref } from "@/lib/validations/admin";
import { AdminPage } from "../../_components/admin-page";

const t = fr.adminListings;

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  return adminListing(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const result = await load((await params).id);
  return {
    title:
      result?.ok && result.data ? t.detailMetaTitle(result.data.listing.reference) : t.metaTitle,
  };
}

function historyLabel(action: string): string {
  return t.history.actions[action] ?? t.history.other;
}

// L1-19: a listing as the back office sees it (SPEC-V2 section 17): status,
// seller, plan, the motive of a refusal or a suspension, the decisions, the
// preview of the listing and its history (audit_log). Not yet here: the AI
// pre-analysis (L1-30), « Modifier » and the detail panel of the desktop
// list (later, DECISIONS 2026-10-17).
export default async function AdminListingPage({ params }: Props) {
  await requireAdmin();
  const result = await load((await params).id);
  if (!result) notFound();
  if (!result.ok) {
    return (
      <AdminPage title={t.title}>
        <InlineAlert tone="danger">{t.error}</InlineAlert>
      </AdminPage>
    );
  }
  if (!result.data) notFound();
  const detail = result.data;
  const { listing } = detail;
  const now = new Date();
  const reason =
    detail.status === "rejected"
      ? { label: t.detail.rejection, text: detail.rejectionReason }
      : detail.status === "suspended"
        ? { label: t.detail.suspension, text: detail.suspensionReason }
        : null;
  const facts = [
    { label: t.detail.seller, value: detail.sellerName ?? t.sellerUnknown },
    { label: t.detail.plan, value: fr.plan[detail.plan] },
    {
      label: t.detail.received,
      value: detail.submittedAt
        ? capitalize(formatRelative(detail.submittedAt, now))
        : t.notReceived,
    },
    ...(listing.publishedAt
      ? [{ label: t.detail.published, value: formatDateShort(listing.publishedAt, now) }]
      : []),
  ];

  return (
    <AdminPage
      title={listing.title}
      titleOnMobile
      back={
        <Link
          href={adminListingsHref({})}
          className="inline-flex min-h-11 items-center gap-1 text-lk-secondary font-semibold text-lk-blue"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
      }
    >
      <ModerationFeedback>
        <section className="flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge status={detail.status} />
            <span className="text-lk-secondary font-semibold text-lk-ink-2">
              {listing.reference}
            </span>
            <span className="text-lk-secondary text-lk-ink-3">
              {listing.city} · {listing.postalCode}
              {isInLaunchZone(listing.postalCode) ? null : (
                <>
                  {" · "}
                  <span className="font-semibold text-lk-warning-fg">{t.outOfZone}</span>
                </>
              )}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{fact.label}</dt>
                <dd className="text-lk-label font-semibold text-lk-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {reason?.text ? (
            <div className="rounded-lk-md bg-lk-danger-bg px-4 py-3 text-lk-danger-fg">
              <p className="text-lk-caption font-semibold">{reason.label}</p>
              <p className="text-lk-secondary whitespace-pre-line">{reason.text}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ListingModeration
              listingId={listing.id}
              reference={listing.reference}
              status={detail.status}
              size="md"
            />
            {detail.status === "published" ? (
              <Link
                href={`/annonce/${listing.slug}`}
                className="inline-flex min-h-11 items-center text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
              >
                {t.detail.publicPage}
              </Link>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="apercu" className="flex flex-col gap-4">
          <SectionTitle id="apercu">{t.detail.preview}</SectionTitle>
          <div className="flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5">
            <PriceBlock priceCents={listing.priceCents} surfaceM2={listing.surfaceM2} />
            <KeyFigures items={listingKeyFigures(listing)} />
            <ListingDescription text={listing.description} />
            <KeyFactsTable items={listingKeyFacts(listing)} />
          </div>
        </section>

        <section aria-labelledby="historique" className="flex flex-col gap-3">
          <SectionTitle id="historique">{t.detail.history}</SectionTitle>
          {detail.history.length === 0 ? (
            <p className="text-lk-secondary text-lk-ink-3">{t.detail.historyEmpty}</p>
          ) : (
            <ol className="flex flex-col divide-y divide-lk-line rounded-lk-md border border-lk-line bg-lk-surface">
              {detail.history.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-3">
                  <p className="text-lk-label font-semibold text-lk-ink">
                    {historyLabel(entry.action)}
                    {entry.actorName ? (
                      <span className="font-normal text-lk-ink-3">
                        {" "}
                        {t.history.by(entry.actorName)}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-lk-caption text-lk-ink-3">{formatDateTime(entry.at, now)}</p>
                  {entry.reason ? (
                    <p className="text-lk-secondary whitespace-pre-line text-lk-ink-2">
                      {t.history.reason(entry.reason)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>
      </ModerationFeedback>
    </AdminPage>
  );
}
