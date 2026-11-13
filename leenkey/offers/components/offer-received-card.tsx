import type { ReactNode } from "react";
import { FinancingBadge } from "@/components/shared/financing-badge";
import { frOffer } from "@/lib/i18n/sections/offer";
import { cn } from "@/lib/utils";
import { formatNumericDateTime, fullName } from "../document";
import type { SellerOffer } from "../seller";
import { buildOfferSynthesis, remainingLabel } from "../synthesis";
import { OfferStatusBadge } from "./offer-status-badge";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller;
const s = fr.offer.synthesis;

/**
 * The summary of an offer for its seller (SPEC-V2 13, docs/DESIGN.md 13.3,
 * « Nouvelle offre reçue »): who, the time left, then asking price, offer,
 * gap, financing declared, proof of financing and the « Analyse Leenkey »,
 * in this order; the actions below. The gap in a neutral colour. The same
 * for the three plans.
 */
export function OfferReceivedCard({
  item,
  now,
  title,
  headingAs: Heading = "h3",
  actions,
  className,
}: {
  item: SellerOffer;
  now: Date;
  /** « Nouvelle offre reçue » on the dashboard, the reference on its own page. */
  title: string;
  /** The level of its title in the page; « Analyse Leenkey » is one below. */
  headingAs?: "h2" | "h3";
  actions?: ReactNode;
  className?: string;
}) {
  const { offer } = item;
  const synthesis = buildOfferSynthesis(item);
  const SubHeading = Heading === "h2" ? "h3" : "h4";
  const waiting = offer.status === "submitted" || offer.status === "viewed";
  const remaining =
    waiting && offer.validityUntil ? remainingLabel(offer.validityUntil, now) : null;
  const rows: { label: string; value: ReactNode; strong?: boolean }[] = [
    { label: s.asking, value: synthesis.askingPriceLabel },
    { label: s.offer, value: synthesis.offerPriceLabel, strong: true },
    { label: s.gap, value: synthesis.priceGapLabel ?? s.noGap },
    {
      label: s.financing,
      value: synthesis.financingDeclared.map((line) => <span key={line}>{line}</span>),
    },
    {
      label: s.proof,
      value: (
        <>
          <FinancingBadge status={synthesis.financingStatus} className="self-end" />
          {synthesis.financingLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </>
      ),
    },
  ];
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-lk-md border-[1.5px] border-lk-blue bg-lk-surface p-4",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="text-lk-body font-bold text-wide text-lk-ink">{title}</Heading>
          <p className="text-lk-secondary text-lk-ink-2">
            {t.from(fullName(offer.buyer), offer.buyer.city)}
          </p>
        </div>
        {remaining ? (
          <span className="rounded-full bg-lk-warning-bg px-2.5 py-1 text-lk-caption font-semibold text-lk-warning-fg tabular">
            {remaining}
          </span>
        ) : offer.status === "expired" && offer.validityUntil ? (
          <span className="rounded-full bg-lk-stone-2 px-2.5 py-1 text-lk-caption font-semibold text-lk-ink-2 tabular">
            {t.expiredOn(formatNumericDateTime(offer.expiredAt ?? offer.validityUntil))}
          </span>
        ) : (
          <OfferStatusBadge status={offer.status} />
        )}
      </header>
      <dl className="flex flex-col gap-2 text-lk-secondary">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
            <dt className="text-lk-ink-2">{row.label}</dt>
            <dd
              className={cn(
                "flex flex-col gap-0.5 text-right tabular",
                row.strong
                  ? "text-lk-h3 font-bold text-wide text-lk-ink"
                  : "font-semibold text-lk-ink",
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2 rounded-lk-md bg-lk-stone-2 p-3.5 text-lk-secondary leading-relaxed text-lk-ink-2">
        <SubHeading className="font-semibold text-lk-ink">{s.analysis}</SubHeading>
        {synthesis.analysis.map((paragraph) => (
          <p key={paragraph} className="text-pretty">
            {paragraph}
          </p>
        ))}
      </div>
      {actions}
    </article>
  );
}
