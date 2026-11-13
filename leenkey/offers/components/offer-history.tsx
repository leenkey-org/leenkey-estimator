import { frOffer } from "@/lib/i18n/sections/offer";
import { cn } from "@/lib/utils";
import { formatNumericDateTime } from "../document";
import type { OfferEvent } from "../seller";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller.history;

const isKnown = (event: string): event is keyof typeof t.events => event in t.events;

/**
 * The journal of an offer (SPEC-V2 13, « historique complet »): what happened
 * and when, with the message of the seller. The draft and its internal lines
 * are not shown.
 */
export function OfferHistory({
  events,
  className,
}: {
  events: readonly OfferEvent[];
  className?: string;
}) {
  const shown = events.filter(
    (event) => isKnown(event.event) && event.event !== "created" && event.event !== "pdf_generated",
  );
  if (shown.length === 0) return null;
  return (
    <ol className={cn("flex flex-col gap-2 text-lk-secondary", className)}>
      {shown.map((event) => (
        <li key={event.id} className="flex flex-col gap-0.5 border-l-2 border-lk-line pl-3">
          <p className="font-semibold text-lk-ink">
            {isKnown(event.event) ? t.events[event.event] : event.event}
          </p>
          <p className="text-lk-caption text-lk-ink-3 tabular">{formatNumericDateTime(event.at)}</p>
          {event.message ? (
            <p className="text-pretty text-lk-ink-2">{t.message(event.message)}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
