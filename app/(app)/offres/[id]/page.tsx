import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download } from "lucide-react";
import { SpacePage } from "../../_components/space-page";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { isUuid } from "@/leenkey/messaging/queries";
import { OfferDocumentView } from "@/leenkey/offers/components/offer-document-view";
import { OfferStatusBadge } from "@/leenkey/offers/components/offer-status-badge";
import { buildOfferDocument, formatNumericDateTime } from "@/leenkey/offers/document";
import { offerFormPath, offerPath, offerPdfPath } from "@/leenkey/offers/paths";
import { buyerOffer } from "@/leenkey/offers/queries";
import { frOffer } from "@/lib/i18n/sections/offer";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.page;

export const metadata: Metadata = { title: t.metaTitle };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ envoyee?: string | string[] }>;
};

// L2-03: the page of an offer for its buyer (SPEC-V2 13): its status, its
// document as it was sent, its PDF. A draft goes back to the form. The
// follow-up (withdrawal, new offer) and the page of the seller come with
// L2-04; a seller gets a 404 here until then (RLS of `offers`).
export default async function OfferPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const profile = await requireProfile();
  const found = await buyerOffer(profile.id, id);
  if (found.ok && (!found.data || !found.data.isBuyer)) notFound();
  if (!found.ok || !found.data) {
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
  const { offer, snapshot } = found.data;
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
        {query.envoyee === "1" && !expired ? (
          <InlineAlert tone="success">{t.sent}</InlineAlert>
        ) : null}
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
        <div className="flex flex-wrap gap-2.5">
          <Button asChild variant="secondary">
            {/* A file, not a page: no prefetch, a new tab. */}
            <a href={offerPdfPath(offer.id)} target="_blank" rel="noopener">
              <Download aria-hidden="true" />
              {t.pdf}
            </a>
          </Button>
        </div>
        <OfferDocumentView document={buildOfferDocument(offer, snapshot)} />
      </div>
    </SpacePage>
  );
}
