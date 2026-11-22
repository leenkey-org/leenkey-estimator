import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/shared/button";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SectionTitle } from "@/components/shared/section-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import { ModerationFeedback } from "@/leenkey/admin/components/listing-moderation";
import { OfferAnalysed } from "@/leenkey/admin/components/offer-analysed";
import { adminOffer } from "@/leenkey/admin/offers/queries";
import { OfferDocumentView } from "@/leenkey/offers/components/offer-document-view";
import { OfferHistory } from "@/leenkey/offers/components/offer-history";
import { OfferPrecontractForm } from "@/leenkey/offers/components/offer-precontract-form";
import { OfferReceivedCard } from "@/leenkey/offers/components/offer-received-card";
import { OfferStatusBadge } from "@/leenkey/offers/components/offer-status-badge";
import {
  buildOfferDocument,
  formatNumericDateTime,
  formatNumericDay,
} from "@/leenkey/offers/document";
import { offerPdfPath } from "@/leenkey/offers/paths";
import { showsWithdrawalPeriod, withdrawalPeriodEnd } from "@/leenkey/offers/withdrawal";
import { frAdminOffers } from "@/lib/i18n/sections/adminOffers";
import { frOffer } from "@/lib/i18n/sections/offer";
import { adminOffersHref } from "@/lib/validations/admin";
import { AdminPage } from "../../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminOffers: frAdminOffers, offer: frOffer } as const;

const t = fr.adminOffers;
const d = t.detail;
const p = fr.offer.seller.precontract;

type Props = { params: Promise<{ id: string }> };

// adminOffer is read once per request (React cache): metadata and page share it.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireAdmin();
  const result = await adminOffer((await params).id);
  return {
    title:
      result.ok && result.data ? t.detailMetaTitle(result.data.item.offer.reference) : t.metaTitle,
  };
}

const backLink = (
  <Link
    href={adminOffersHref({})}
    className="inline-flex min-h-11 items-center gap-1 text-lk-secondary font-semibold text-lk-blue"
  >
    <ChevronLeft aria-hidden="true" className="size-4" />
    {t.back}
  </Link>
);

const box = "rounded-lk-md border border-lk-line bg-lk-surface";
const link = "text-lk-blue underline-offset-2 hover:underline";

/** The day of an instant in Paris, « 2026-11-15 ». */
const parisDay = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(value));

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <SectionTitle id={id}>{title}</SectionTitle>
      {children}
    </section>
  );
}

// L2-07: an offer as the back office sees it (SPEC-V2 section 17), read
// only: its parties, its property and the plan of its sale; the summary its
// seller reads (the same templates, never a model); its document and its
// PDF; its journal. Two acts of the team, each one a right of the plan of
// the property (plan_entitlements, never a plan name): « Marquer comme
// analysée » (the task of the sale) and the dates of the avant-contrat of an
// accepted offer. The team never accepts, declines nor changes an offer. The
// page checks the admin role itself.
export default async function AdminOfferPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const result = await adminOffer(id);
  if (!result.ok) {
    return (
      <AdminPage title={t.title} titleOnMobile back={backLink}>
        <InlineAlert
          tone="danger"
          action={
            <Link
              href={`/admin/offres/${id}`}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.retry}
            </Link>
          }
        >
          {d.error}
        </InlineAlert>
      </AdminPage>
    );
  }
  if (!result.data) notFound();
  const { item, events, analysis, precontractByTeam } = result.data;
  const { offer } = item;
  const now = new Date();
  const person = (who: { id: string; name: string | null }) => (
    <Link href={`/admin/utilisateurs/${who.id}`} className={link}>
      {who.name ?? t.noName}
    </Link>
  );
  const facts: { label: string; value: ReactNode }[] = [
    { label: d.buyer, value: person(result.data.buyer) },
    { label: d.seller, value: person(result.data.seller) },
    {
      label: d.property,
      value: (
        <Link href={`/admin/annonces/${offer.listingId}`} className={link}>
          {[result.data.listingReference, result.data.city].filter(Boolean).join(" · ") ||
            t.noProperty}
        </Link>
      ),
    },
    ...(offer.submittedAt
      ? [{ label: d.sent, value: formatNumericDateTime(offer.submittedAt) }]
      : []),
    ...(item.answeredAt
      ? [{ label: d.answered, value: formatNumericDateTime(item.answeredAt) }]
      : []),
  ];
  const accepted = offer.status === "accepted" && item.answeredAt !== null;
  // No period for an acquisition by an SCI (answer of Cédric of 2026-11-19).
  const period = showsWithdrawalPeriod(offer.acquisitionMode);
  const periodStart = period ? item.withdrawalPeriodStart : null;
  const periodEnd = periodStart ? withdrawalPeriodEnd(periodStart) : null;

  return (
    <AdminPage title={d.summaryTitle(offer.reference)} titleOnMobile back={backLink}>
      <ModerationFeedback>
        <section aria-label={d.facts} className={`flex flex-col gap-4 p-5 ${box}`}>
          <div className="flex flex-wrap items-center gap-2">
            <OfferStatusBadge status={offer.status} />
            {result.data.plan ? <StatusBadge plan={result.data.plan} /> : null}
            <span className="text-lk-caption text-lk-ink-3">{d.version(offer.version)}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-lk-caption text-lk-ink-3">{fact.label}</dt>
                <dd className="text-lk-label font-semibold break-words text-lk-ink tabular">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <Button asChild variant="outline-ink" size="sm">
              <a href={offerPdfPath(offer.id)} target="_blank" rel="noopener">
                {d.pdf}
              </a>
            </Button>
          </div>
          <p className="text-lk-caption text-lk-ink-3">{d.readOnly}</p>
        </section>

        {analysis ? (
          <Section id="analyse" title={t.analysis.title}>
            {analysis.doneAt ? (
              <InfoNote>{t.analysis.doneOn(formatNumericDateTime(analysis.doneAt))}</InfoNote>
            ) : (
              <>
                <p className="text-lk-secondary text-lk-ink-2">{t.analysis.intro}</p>
                <OfferAnalysed offerId={offer.id} />
              </>
            )}
          </Section>
        ) : null}

        {accepted && (precontractByTeam || item.precontractSignedAt) ? (
          <Section id="avant-contrat" title={t.precontract.title}>
            {item.precontractSignedAt ? (
              <div className="flex flex-col gap-1 text-lk-secondary text-lk-ink-2">
                <p className="font-semibold text-lk-ink">
                  {p.signedOn(formatNumericDay(item.precontractSignedAt))}
                </p>
                {periodStart ? <p>{p.notifiedOn(formatNumericDay(periodStart))}</p> : null}
                {periodEnd ? (
                  <p>
                    {p.periodEnd(formatNumericDay(periodEnd))} {t.precontract.indicative}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-lk-secondary text-lk-ink-2">{t.precontract.none}</p>
            )}
            {!period ? (
              <p className="text-lk-secondary text-lk-ink-2">{t.precontract.noPeriod}</p>
            ) : null}
            {precontractByTeam && item.answeredAt ? (
              <>
                <p className="text-lk-caption text-lk-ink-3">{t.precontract.intro}</p>
                <OfferPrecontractForm
                  offerId={offer.id}
                  signedAt={item.precontractSignedAt}
                  notifiedAt={periodStart}
                  minDay={parisDay(item.answeredAt)}
                  maxDay={parisDay(now)}
                  withdrawalPeriod={period}
                />
              </>
            ) : null}
          </Section>
        ) : null}

        <Section id="synthese" title={d.summary}>
          <OfferReceivedCard
            item={item}
            now={now}
            title={d.summaryTitle(offer.reference)}
            headingAs="h3"
          />
        </Section>

        <Section id="document" title={d.document}>
          <OfferDocumentView document={buildOfferDocument(offer, item.property)} />
        </Section>

        {events.length > 0 ? (
          <Section id="historique" title={d.history}>
            <OfferHistory events={events} className={`p-5 ${box}`} />
          </Section>
        ) : null}
      </ModerationFeedback>
    </AdminPage>
  );
}
