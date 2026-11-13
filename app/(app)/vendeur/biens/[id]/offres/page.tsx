import type { Metadata } from "next";
import Link from "next/link";
import { InlineAlert } from "@/components/shared/inline-alert";
import { OfferHistory } from "@/leenkey/offers/components/offer-history";
import { OfferStatusBadge } from "@/leenkey/offers/components/offer-status-badge";
import { formatNumericDateTime, fullName } from "@/leenkey/offers/document";
import { offerPath } from "@/leenkey/offers/paths";
import { offerEvents, propertyOffers } from "@/leenkey/offers/seller";
import { propertyForSheet } from "@/leenkey/properties/load";
import { formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller.tab;

export const metadata: Metadata = { title: t.metaTitle };

type Props = { params: Promise<{ id: string }> };

// L2-04a: the tab « Offres » of a property (SPEC-V2 13): every offer received
// on it, the withdrawn, expired and replaced ones too, each with its journal.
// The names and the town of the buyers only, as the view of the seller gives
// them before acceptance.
export default async function PropertyOffersPage({ params }: Props) {
  const { id } = await params;
  const property = await propertyForSheet(id);
  if (!property) return null;
  const offers = await propertyOffers(property.id);
  if (!offers.ok) {
    return (
      <InlineAlert tone="danger" live={false}>
        {t.loadError}
      </InlineAlert>
    );
  }
  const events = await offerEvents(offers.data.map(({ offer }) => offer.id));
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lk-h3 font-bold text-wide text-lk-ink">{t.title}</h2>
      {offers.data.length === 0 ? (
        <p className="rounded-lk-xl border border-lk-line bg-lk-surface p-5 text-lk-secondary text-pretty text-lk-ink-2">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {offers.data.map(({ offer }) => (
            <li
              key={offer.id}
              className="flex flex-col gap-3 rounded-lk-xl border border-lk-line bg-lk-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-lk-body font-bold text-lk-ink tabular">
                    {formatPrice(offer.priceCents ?? 0)}
                  </p>
                  <p className="text-lk-secondary text-lk-ink-2">
                    {fr.offer.seller.from(fullName(offer.buyer), offer.buyer.city)}
                  </p>
                </div>
                <OfferStatusBadge status={offer.status} />
              </div>
              <p className="text-lk-caption text-lk-ink-3 tabular">
                {[
                  offer.reference,
                  t.version(offer.version),
                  offer.submittedAt ? t.receivedOn(formatNumericDateTime(offer.submittedAt)) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {events.ok && events.data[offer.id] ? (
                <OfferHistory events={events.data[offer.id]} />
              ) : null}
              <Link
                href={offerPath(offer.id)}
                className="self-start text-lk-secondary font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
              >
                {t.open}
                <span className="sr-only"> {offer.reference}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
