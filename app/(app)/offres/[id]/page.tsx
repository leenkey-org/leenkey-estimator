import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { SpacePage } from "../../_components/space-page";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile, type SessionProfile } from "@/core/auth/session";
import { isUuid } from "@/leenkey/messaging/queries";
import { OfferDocumentView } from "@/leenkey/offers/components/offer-document-view";
import { OfferHistory } from "@/leenkey/offers/components/offer-history";
import { OfferReceivedCard } from "@/leenkey/offers/components/offer-received-card";
import {
  MarkOfferViewed,
  OfferSellerActions,
} from "@/leenkey/offers/components/offer-seller-actions";
import { OfferStatusBadge } from "@/leenkey/offers/components/offer-status-badge";
import { buildOfferDocument, formatNumericDateTime } from "@/leenkey/offers/document";
import { offerFormPath, offerPath, offerPdfPath } from "@/leenkey/offers/paths";
import { buyerOffer, type BuyerOffer } from "@/leenkey/offers/queries";
import {
  buyerConversationHref,
  offerEvents,
  sellerOffer,
  type SellerOffer,
} from "@/leenkey/offers/seller";
import { sheetHref } from "@/leenkey/properties/sheet";
import { frOffer } from "@/lib/i18n/sections/offer";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.page;
const s = fr.offer.seller;

export const metadata: Metadata = { title: t.metaTitle };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ envoyee?: string | string[] }>;
};

// The page of an offer (SPEC-V2 13). For its buyer (L2-03): its status, its
// document as it was sent, its PDF; a draft goes back to the form. For the
// seller of its listing (L2-04a): the summary and the « Analyse Leenkey »,
// the three answers while it waits, the document with the personal data of
// the buyers hidden until acceptance, its journal. The first opening by the
// seller marks it « Consultée ». Anyone else: a 404.
export default async function OfferPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const profile = await requireProfile();
  const [asBuyer, asSeller] = await Promise.all([buyerOffer(profile.id, id), sellerOffer(id)]);
  if (asBuyer.ok && asBuyer.data?.isBuyer) {
    return <BuyerView profile={profile} found={asBuyer.data} sent={query.envoyee === "1"} />;
  }
  if (asSeller.ok && asSeller.data) {
    return <SellerView profile={profile} item={asSeller.data} />;
  }
  if (asBuyer.ok && asSeller.ok) notFound();
  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      <InlineAlert
        tone="danger"
        className="mt-6"
        action={
          <Link
            href={offerPath(id)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {fr.offer.blocked.unavailable.action}
          </Link>
        }
      >
        {t.loadError}
      </InlineAlert>
    </SpacePage>
  );
}

function BuyerView({
  profile,
  found,
  sent,
}: {
  profile: SessionProfile;
  found: BuyerOffer;
  sent: boolean;
}) {
  const { offer, snapshot } = found;
  if (offer.status === "draft" || !snapshot) redirect(offerFormPath(offer.listingId));

  // Past its validity an offer is expired, even before the cron writes it.
  const expired =
    offer.status === "expired" ||
    ((offer.status === "submitted" || offer.status === "viewed") &&
      offer.validityUntil !== null &&
      Date.parse(offer.validityUntil) <= Date.now());
  const status = expired ? "expired" : offer.status;
  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      <div className="mt-4 flex flex-col gap-5">
        {sent && !expired ? <InlineAlert tone="success">{t.sent}</InlineAlert> : null}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-lk-body font-semibold text-lk-ink tabular">
              {fr.offer.reference(offer.reference)}
            </p>
            <OfferStatusBadge status={status} />
          </div>
          <p className="text-lk-secondary text-lk-ink-2 tabular">
            {[
              t.version(offer.version),
              offer.submittedAt ? t.sentOn(formatNumericDateTime(offer.submittedAt)) : null,
              offer.validityUntil
                ? expired
                  ? t.expiredOn(formatNumericDateTime(offer.expiredAt ?? offer.validityUntil))
                  : status === "submitted" || status === "viewed"
                    ? t.validUntil(formatNumericDateTime(offer.validityUntil))
                    : null
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {offer.status === "superseded" && offer.supersededBy ? (
          <InlineAlert
            tone="info"
            live={false}
            action={
              <Link
                href={offerPath(offer.supersededBy)}
                className="font-semibold underline underline-offset-2 hover:no-underline"
              >
                {t.newer}
              </Link>
            }
          >
            {t.superseded}
          </InlineAlert>
        ) : null}
        <PdfButton offerId={offer.id} label={t.pdf} />
        <OfferDocumentView document={buildOfferDocument(offer, snapshot)} />
      </div>
    </SpacePage>
  );
}

async function SellerView({ profile, item }: { profile: SessionProfile; item: SellerOffer }) {
  const { offer, property } = item;
  const waiting = offer.status === "submitted" || offer.status === "viewed";
  const [events, discussHref] = await Promise.all([
    offerEvents([offer.id]),
    buyerConversationHref(offer.listingId, item.buyerId),
  ]);
  const at = (value: string | null) => (value ? formatNumericDateTime(value) : "");
  const state =
    offer.status === "accepted"
      ? { tone: "success" as const, text: s.state.accepted(at(item.answeredAt)) }
      : offer.status === "declined"
        ? { tone: "info" as const, text: s.state.declined(at(item.answeredAt)) }
        : offer.status === "withdrawn"
          ? { tone: "info" as const, text: s.state.withdrawn(at(item.withdrawnAt)) }
          : offer.status === "expired"
            ? {
                tone: "warning" as const,
                text: s.state.expired(at(offer.expiredAt ?? offer.validityUntil)),
              }
            : offer.status === "superseded"
              ? { tone: "info" as const, text: s.state.superseded }
              : null;
  return (
    <SpacePage
      title={s.title}
      roles={profile.roles}
      profileId={profile.id}
      back={{ href: sheetHref(item.propertyId, "offres"), label: s.tab.title }}
    >
      {/* Sent and never opened: this opening is the first one. */}
      {offer.status === "submitted" ? <MarkOfferViewed offerId={offer.id} /> : null}
      <div className="mt-4 flex flex-col gap-5">
        {state ? (
          <InlineAlert tone={state.tone} live={false}>
            {state.text}
          </InlineAlert>
        ) : null}
        <OfferReceivedCard
          item={item}
          now={new Date()}
          title={`${fr.offer.reference(offer.reference)} · ${t.version(offer.version)}`}
          actions={
            waiting ? <OfferSellerActions offerId={offer.id} discussHref={discussHref} /> : null
          }
        />
        {offer.status === "accepted" ? (
          // The PDF carries the contact details of the buyers: once accepted only.
          <PdfButton offerId={offer.id} label={s.pdf} />
        ) : (
          <InfoNote>
            <p>{s.masked}</p>
          </InfoNote>
        )}
        <OfferDocumentView document={buildOfferDocument(offer, property)} />
        {events.ok && events.data[offer.id] ? (
          <section aria-labelledby="historique" className="flex flex-col gap-3">
            <h2 id="historique" className="text-lk-h3 font-bold text-wide text-lk-ink">
              {s.history.title}
            </h2>
            <OfferHistory events={events.data[offer.id]} />
          </section>
        ) : null}
      </div>
    </SpacePage>
  );
}

function PdfButton({ offerId, label }: { offerId: string; label: string }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button asChild variant="secondary">
        {/* A file, not a page: no prefetch, a new tab. */}
        <a href={offerPdfPath(offerId)} target="_blank" rel="noopener">
          <Download aria-hidden="true" />
          {label}
        </a>
      </Button>
    </div>
  );
}
