import type { Metadata } from "next";
import { FinancingBadge, FinancingMention } from "@/components/shared/financing-badge";
import { IdentityLabel, IdentityMention } from "@/components/shared/identity-label";
import { InlineAlert } from "@/components/shared/inline-alert";
import { propertyForSheet } from "@/leenkey/properties/load";
import Link from "next/link";
import { BuyerFeedback } from "@/leenkey/visits/components/buyer-feedback";
import { CancelVisitButton } from "@/leenkey/visits/components/cancel-visit-button";
import { InviteButton, RemoveSlotButton } from "@/leenkey/visits/components/seller-buttons";
import { SlotForm } from "@/leenkey/visits/components/slot-form";
import { VisitStatusBadge } from "@/leenkey/visits/components/visit-status-badge";
import { parisDayKey, visitDateTime, visitRange } from "@/leenkey/visits/dates";
import { visitTookPlace } from "@/leenkey/visits/feedback";
import { sellerVisits } from "@/leenkey/visits/queries";
import { formatDate } from "@/lib/format";
import { frVisits } from "@/lib/i18n/sections/visits";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.seller;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

const card = "rounded-lk-xl border border-lk-line bg-lk-surface p-4";
const heading = "text-lk-h3 font-bold text-wide text-lk-ink";

// L3-02: the tab « Visites » of a property (SPEC-V2 14): the slots of the
// seller (one at a time, no series), the buyers they may invite (those who
// wrote or sent an offer, with their financing status), the visits to come
// and past. Nobody books without an invitation. L3-03: a past visit shows
// what its buyer said of it, as given (« Intérêt 4 / 5 » and the comment, or
// « Retour non donné »), and opens its page, where the seller writes a note.
// The identity of a buyer invited or with a visit (DECISIONS.md 2026-11-23):
// a label only (« Identité vérifiée par Leenkey », « Pièce d'identité
// déposée, en cours de vérification »), never the document nor its type.
export default async function PropertyVisitsPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForSheet(id);
  if (!property) return null;
  const result = await sellerVisits(property.id);
  if (!result.ok) {
    return (
      <InlineAlert tone="danger" live={false}>
        {t.loadError}
      </InlineAlert>
    );
  }
  const { slots, visits, contacts } = result.data;
  const now = new Date();
  const online = property.listingStatus === "published" || property.listingStatus === "paused";
  const upcoming = visits
    .filter((visit) => visit.status === "confirmed" && new Date(visit.startsAt) > now)
    .reverse();
  const others = visits.filter((visit) => !upcoming.includes(visit));
  const freeSlot = slots.some((slot) => slot.bookedBy === null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className={heading}>{t.title}</h2>
        <p className="text-lk-secondary text-pretty text-lk-ink-2">{t.intro}</p>
      </div>
      {!online ? <InlineAlert tone="info">{t.offline}</InlineAlert> : null}

      <section aria-labelledby="visits-upcoming" className="flex flex-col gap-3">
        <h3 id="visits-upcoming" className="text-lk-body font-semibold text-lk-ink">
          {t.visits.upcoming}
        </h3>
        {upcoming.length === 0 ? (
          <p className={`${card} text-lk-secondary text-lk-ink-2`}>{t.visits.emptyUpcoming}</p>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {upcoming.map((visit) => (
                <li
                  key={visit.id}
                  className={`${card} flex flex-wrap items-center gap-x-4 gap-y-3`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="text-lk-body font-semibold text-lk-ink first-letter:uppercase">
                      {visitDateTime(visit.startsAt, now)}
                    </p>
                    <p className="text-lk-secondary text-lk-ink-2">
                      {t.visits.with(visit.buyerFirstName)}
                    </p>
                    <FinancingBadge status={visit.financingStatus} className="self-start" />
                    <IdentityLabel status={visit.identityStatus} />
                  </div>
                  <CancelVisitButton
                    visitId={visit.id}
                    propertyId={property.id}
                    role="seller"
                    label={t.visits.cancelAbout(visitDateTime(visit.startsAt, now))}
                  />
                </li>
              ))}
            </ul>
            <FinancingMention />
            <IdentityMention />
          </>
        )}
      </section>

      <section aria-labelledby="visits-slots" className="flex flex-col gap-3">
        <h3 id="visits-slots" className="text-lk-body font-semibold text-lk-ink">
          {t.slots.title}
        </h3>
        {slots.length === 0 ? (
          <p className={`${card} text-lk-secondary text-lk-ink-2`}>{t.slots.empty}</p>
        ) : (
          <ul className={`${card} flex flex-col divide-y divide-lk-line py-1`}>
            {slots.map((slot) => {
              const label = visitDateTime(slot.startsAt, now);
              return (
                <li key={slot.id} className="flex min-h-13 items-center justify-between gap-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-lk-secondary font-medium text-lk-ink first-letter:uppercase">
                      {formatDate(slot.startsAt, now)}
                    </span>
                    <span className="text-lk-caption text-lk-ink-3 tabular">
                      {visitRange(slot.startsAt, slot.endsAt)}
                      {" · "}
                      {slot.bookedBy === null ? t.slots.free : t.slots.bookedBy(slot.bookedBy)}
                    </span>
                  </div>
                  {slot.bookedBy === null ? (
                    <RemoveSlotButton propertyId={property.id} slotId={slot.id} label={label} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {online ? (
          <div className={card}>
            <SlotForm propertyId={property.id} minDay={parisDayKey(now)} />
          </div>
        ) : null}
      </section>

      <section aria-labelledby="visits-contacts" className="flex flex-col gap-3">
        <h3 id="visits-contacts" className="text-lk-body font-semibold text-lk-ink">
          {t.contacts.title}
        </h3>
        {contacts.length === 0 ? (
          <p className={`${card} text-lk-secondary text-lk-ink-2`}>{t.contacts.empty}</p>
        ) : (
          <>
            {online && !freeSlot ? (
              <InlineAlert tone="info">{t.contacts.noSlot}</InlineAlert>
            ) : null}
            <ul className="flex flex-col gap-3">
              {contacts.map((contact) => {
                const name = contact.firstName ?? t.contacts.someone;
                return (
                  <li
                    key={contact.buyerId}
                    className={`${card} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-lk-body font-semibold text-lk-ink">{name}</p>
                      <FinancingBadge status={contact.financingStatus} className="self-start" />
                      {contact.identityStatus ? (
                        <IdentityLabel status={contact.identityStatus} />
                      ) : null}
                      {contact.hasVisit ? (
                        <p className="text-lk-caption text-lk-ink-3">{t.contacts.hasVisit}</p>
                      ) : contact.invitedUntil ? (
                        <p className="text-lk-caption text-lk-ink-3">
                          {t.contacts.invitedUntil(formatDate(contact.invitedUntil, now))}
                        </p>
                      ) : null}
                    </div>
                    {online && !contact.hasVisit ? (
                      <InviteButton
                        propertyId={property.id}
                        buyerId={contact.buyerId}
                        name={name}
                        again={contact.invitedUntil !== null}
                        disabled={!freeSlot}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <FinancingMention />
            {/* Said once on the page: above, with the visits to come, when there are some. */}
            {upcoming.length === 0 && contacts.some((contact) => contact.identityStatus) ? (
              <IdentityMention />
            ) : null}
          </>
        )}
      </section>

      {others.length > 0 ? (
        <section aria-labelledby="visits-past" className="flex flex-col gap-3">
          <h3 id="visits-past" className="text-lk-body font-semibold text-lk-ink">
            {t.visits.past}
          </h3>
          <ul className={`${card} flex flex-col divide-y divide-lk-line py-1`}>
            {others.map((visit) => {
              const tookPlace = visitTookPlace(visit.status, visit.endsAt, now);
              return (
                <li key={visit.id} className="flex min-h-13 items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-lk-secondary font-medium text-lk-ink first-letter:uppercase">
                      {visitDateTime(visit.startsAt, now)}
                    </span>
                    <span className="text-lk-caption text-lk-ink-3">
                      {t.visits.with(visit.buyerFirstName)}
                    </span>
                    <FinancingBadge status={visit.financingStatus} className="mt-1 self-start" />
                    {tookPlace ? (
                      <>
                        <BuyerFeedback
                          interest={visit.buyerInterest}
                          comment={visit.buyerFeedback}
                          clamp
                          className="mt-2"
                        />
                        <Link
                          href={`/visites/${visit.id}`}
                          aria-label={t.visits.openAbout(visitDateTime(visit.startsAt, now))}
                          className="mt-1 inline-flex min-h-11 items-center self-start text-lk-label font-semibold text-lk-blue underline-offset-2 hover:underline"
                        >
                          {t.visits.open}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  <VisitStatusBadge status={visit.status} past={new Date(visit.startsAt) <= now} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
