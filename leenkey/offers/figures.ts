import { NNBSP, formatPrice } from "@/lib/format";

// The figures beside an offer (SPEC-V2 13, steps 3 and 4), shown on the
// screen only, never in the document: the gap to the asking price, and the
// estimated budget of the project. Neutral: never a verdict, never a block.

/** Indicative acquisition costs (SPEC 13; Q3 for a new build). */
export const FEES_RATE_OLD = 0.075;
export const FEES_RATE_NEW = 0.025;

const MINUS = "\u2212";

const percentFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « 7,5 % ». */
export function formatRate(rate: number): string {
  return `${percentFormat.format(rate * 100)}${NNBSP}%`;
}

export type OfferGap = { amountCents: number; percent: number };

/** The gap of the offer to the asking price; null without an asking price. */
export function offerGap(offerCents: number, askingCents: number): OfferGap | null {
  if (askingCents <= 0) return null;
  const amountCents = offerCents - askingCents;
  // One decimal, as it is shown; -0 reads as 0.
  const percent = Math.round((amountCents / askingCents) * 1000) / 10;
  return { amountCents, percent: percent === 0 ? 0 : percent };
}

/** « −12 000 € · −3,4 % », « +5 000 € · +1,4 % »; null when the two prices are equal. */
export function gapLabel(gap: OfferGap): string | null {
  if (gap.amountCents === 0) return null;
  const sign = gap.amountCents < 0 ? MINUS : "+";
  const amount = `${sign}${formatPrice(Math.abs(gap.amountCents))}`;
  const percent = `${sign}${percentFormat.format(Math.abs(gap.percent))}${NNBSP}%`;
  return `${amount} · ${percent}`;
}

export type OfferBudget = { rate: number; feesCents: number; totalCents: number };

/** Price and indicative acquisition costs, rounded to the euro. */
export function offerBudget(priceCents: number, isNewBuild: boolean): OfferBudget {
  const rate = isNewBuild ? FEES_RATE_NEW : FEES_RATE_OLD;
  const feesCents = Math.round((priceCents * rate) / 100) * 100;
  return { rate, feesCents, totalCents: priceCents + feesCents };
}
