import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { formatNumericDay } from "../document";
import { offerFormPath, offerPath } from "../paths";
import type { BuyerOfferLine } from "../lines";
import { OfferStatusBadge } from "./offer-status-badge";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.followUp.list;

/** A moment as its day in Paris, « 14/11/2026 ». */
const day = (value: string) =>
  formatNumericDay(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(value)),
  );

/**
 * The offers of a buyer on their home (docs/DESIGN.md 12.10, « Vos visites
 * et offres »): one card per offer, the whole card a link to its page (a
 * draft goes back to its form), its status, its amount and the day it was
 * sent.
 */
export function BuyerOffersList({ offers }: { offers: readonly BuyerOfferLine[] }) {
  return (
    // One column that never grows past the screen: a long title is cut, not the page widened.
    <ul aria-label={t.label} className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {offers.map((offer) => {
        const draft = offer.status === "draft";
        const title = [offer.title || t.offline, offer.city].filter(Boolean).join(" · ");
        return (
          <li key={offer.id} className="min-w-0">
            <Link
              href={draft ? offerFormPath(offer.listingId) : offerPath(offer.id)}
              className="flex min-h-11 items-center gap-3 rounded-lk-xl border border-lk-line bg-lk-surface p-3.5 hover:border-lk-ink-3 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid"
            >
              <span
                aria-hidden="true"
                className="flex size-13 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint text-lk-blue"
              >
                <FileText className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="max-w-full truncate text-lk-compact font-semibold text-lk-ink">
                  {title}
                </span>
                <span className="text-lk-caption text-lk-ink-3 tabular">
                  {t.detail(
                    offer.priceCents !== null ? formatPrice(offer.priceCents) : null,
                    draft ? t.draft : offer.submittedAt ? t.sentOn(day(offer.submittedAt)) : null,
                  )}
                </span>
                <OfferStatusBadge status={offer.status} />
              </span>
              <span className="flex shrink-0 items-center gap-1 text-lk-label font-semibold text-lk-blue">
                {draft ? t.resume : t.open}
                <span className="sr-only"> ({t.about(title)})</span>
                <ChevronRight aria-hidden="true" className="size-4" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
