import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, FileText } from "lucide-react";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { requireProfile } from "@/core/auth/session";
import { isUuid } from "@/leenkey/messaging/queries";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sheetHref } from "@/leenkey/properties/sheet";
import { BuyerFeedback } from "@/leenkey/visits/components/buyer-feedback";
import { CancelVisitButton } from "@/leenkey/visits/components/cancel-visit-button";
import { BuyerFeedbackForm, SellerNoteForm } from "@/leenkey/visits/components/feedback-forms";
import { VisitStatusBadge } from "@/leenkey/visits/components/visit-status-badge";
import { canCancel, visitDateTime, visitRange } from "@/leenkey/visits/dates";
import { feedbackDeadline, feedbackWindow } from "@/leenkey/visits/feedback";
import { visitDetail } from "@/leenkey/visits/queries";
import { sheetAvailable, visitSheetPath } from "@/leenkey/visits/sheet";
import { frVisits } from "@/lib/i18n/sections/visits";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.visit;
const f = fr.visits.feedback;

const panel = "flex flex-col gap-4 rounded-lk-xl border border-lk-line bg-lk-surface p-5";
const panelTitle = "text-lk-body font-semibold text-lk-ink";

export const metadata: Metadata = { title: t.metaTitle };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reservee?: string | string[] }>;
};

// L3-02: the page of a visit (SPEC-V2 14), for its buyer and for the seller
// of the property; anyone else: a 404. The exact address is shown to the
// buyer only while the visit is confirmed (« dans l'email de confirmation et
// sur la page de la visite. Jamais ailleurs. »). The buyer cancels until 2
// hours before, the seller until it starts. L3-03: once the visit is over,
// the buyer gives an interest and a comment, the seller reads them and writes
// a note for themselves (never shown to the buyer), each for 7 days.
export default async function VisitPage({ params, searchParams }: Props) {
  const [{ id }, query, profile] = await Promise.all([params, searchParams, requireProfile()]);
  if (!isUuid(id)) notFound();
  const result = await visitDetail(id, profile.id);
  if (result.ok && !result.data) notFound();
  const back =
    result.ok && result.data?.role === "seller"
      ? { href: sheetHref(result.data.propertyId, "visites"), label: t.sellerBack }
      : { href: ROUTES.buyer, label: t.back };
  if (!result.ok || !result.data) {
    return (
      <SpacePage title={t.title} roles={profile.roles} profileId={profile.id} back={back}>
        <InlineAlert tone="danger" className="mt-6">
          {t.loadError}
        </InlineAlert>
      </SpacePage>
    );
  }
  const visit = result.data;
  const now = new Date();
  const past = new Date(visit.startsAt) <= now;
  const confirmed = visit.status === "confirmed";
  const cancellable = confirmed && canCancel(visit.startsAt, visit.role, now);
  const feedback = feedbackWindow(visit.status, visit.endsAt, now);
  // With its hour: the deadline falls in the middle of a day.
  const until = f.until(visitDateTime(feedbackDeadline(visit.endsAt), now));
  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id} back={back}>
      <div className="mt-4 flex flex-col gap-5">
        {query.reservee === "1" && confirmed && !past ? (
          <InlineAlert tone="success">{t.booked}</InlineAlert>
        ) : null}
        {visit.status === "cancelled" ? (
          <InlineAlert tone="info">{t.cancelled}</InlineAlert>
        ) : past ? (
          <InlineAlert tone="info">{t.past}</InlineAlert>
        ) : null}
        <div className="flex flex-col gap-4 rounded-lk-xl border border-lk-line bg-lk-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 text-lk-body font-semibold text-lk-ink">
              {visit.listing
                ? fr.visits.booking.about(visit.listing.title, visit.listing.city)
                : fr.visits.home.offline}
            </p>
            <VisitStatusBadge status={visit.status} past={past} />
          </div>
          <dl className="flex flex-col gap-3 text-lk-secondary">
            <div className="flex flex-col gap-0.5">
              <dt className="text-lk-caption text-lk-ink-3">{t.when}</dt>
              <dd className="font-medium text-lk-ink first-letter:uppercase tabular">
                {visitDateTime(visit.startsAt, now)} ({visitRange(visit.startsAt, visit.endsAt)})
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-lk-caption text-lk-ink-3">{t.where}</dt>
              <dd className="font-medium text-lk-ink">
                {visit.address ? (
                  <>
                    {visit.address.line}
                    <br />
                    {visit.address.postalCode} {visit.address.city}
                  </>
                ) : (
                  <span className="font-normal text-lk-ink-2">{t.addressLater}</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2.5">
            {confirmed && !past ? (
              <Button asChild variant="secondary" size="sm">
                <a href={`/visites/${visit.id}/ics`}>
                  <CalendarPlus aria-hidden="true" />
                  {t.calendar}
                </a>
              </Button>
            ) : null}
            {/* The technical sheet of the property (DECISIONS.md 2026-11-24), drawn
                from the listing online: for the buyer of a booked visit. */}
            {visit.role === "buyer" && sheetAvailable(visit.status) && visit.listing?.slug ? (
              <Button asChild variant="secondary" size="sm">
                <a href={visitSheetPath(visit.id)} target="_blank" rel="noopener">
                  <FileText aria-hidden="true" />
                  {t.sheet}
                </a>
              </Button>
            ) : null}
            {visit.role === "buyer" && visit.listing?.slug ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={`${ROUTES.listing}/${visit.listing.slug}`}>{t.listing}</Link>
              </Button>
            ) : null}
          </div>
        </div>
        {confirmed && !past ? (
          <div className="flex flex-col items-start gap-2">
            {cancellable ? (
              <>
                {visit.role === "buyer" ? (
                  <p className="text-lk-secondary text-lk-ink-2">{t.cancelUntil}</p>
                ) : null}
                <CancelVisitButton
                  visitId={visit.id}
                  propertyId={visit.propertyId}
                  role={visit.role}
                  size="md"
                />
              </>
            ) : (
              <p className="text-lk-secondary text-lk-ink-2">{t.cancelTooLate}</p>
            )}
          </div>
        ) : null}
        {feedback !== "none" && visit.role === "buyer" ? (
          <section aria-labelledby="visit-feedback" className={panel}>
            <div className="flex flex-col gap-1">
              <h2 id="visit-feedback" className={panelTitle}>
                {f.buyer.title}
              </h2>
              {feedback === "open" ? (
                <p className="text-lk-secondary text-lk-ink-2">{f.buyer.intro}</p>
              ) : null}
            </div>
            {feedback === "open" ? (
              <BuyerFeedbackForm
                visitId={visit.id}
                until={until}
                interest={visit.buyerInterest}
                comment={visit.buyerFeedback}
              />
            ) : (
              <>
                <BuyerFeedback interest={visit.buyerInterest} comment={visit.buyerFeedback} />
                <p className="text-lk-caption text-lk-ink-3">
                  {visit.buyerInterest === null ? f.buyer.closed : f.buyer.closedGiven}
                </p>
              </>
            )}
          </section>
        ) : null}
        {feedback !== "none" && visit.role === "seller" ? (
          <>
            <section aria-labelledby="visit-buyer-feedback" className={panel}>
              <h2 id="visit-buyer-feedback" className={panelTitle}>
                {f.seller.buyerTitle}
              </h2>
              <BuyerFeedback
                interest={visit.buyerInterest}
                comment={visit.buyerFeedback}
                none={feedback === "open" ? f.seller.buyerPending : f.none}
              />
            </section>
            <section aria-labelledby="visit-note" className={panel}>
              <div className="flex flex-col gap-1">
                <h2 id="visit-note" className={panelTitle}>
                  {f.seller.title}
                </h2>
                <p className="text-lk-secondary text-lk-ink-2">{f.seller.intro}</p>
              </div>
              {feedback === "open" ? (
                <SellerNoteForm visitId={visit.id} until={until} note={visit.sellerNote} />
              ) : (
                <>
                  {visit.sellerNote ? (
                    <p className="text-lk-secondary text-pretty break-words whitespace-pre-line text-lk-ink">
                      {visit.sellerNote}
                    </p>
                  ) : null}
                  <p className="text-lk-caption text-lk-ink-3">
                    {visit.sellerNote ? f.seller.closedGiven : f.seller.closed}
                  </p>
                </>
              )}
            </section>
          </>
        ) : null}
      </div>
    </SpacePage>
  );
}
