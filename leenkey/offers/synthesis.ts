import type { FinancingStatus } from "@/components/shared/financing-badge";
import { NNBSP, formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import type { OfferContent, OfferProperty } from "./content";
import { formatNumericDay } from "./document";
import { gapLabel, offerGap } from "./figures";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

// The summary of an offer for its seller and its « Analyse Leenkey » (SPEC-V2
// 13): computed from the frozen offer with templates, each time it is read.
// No model, nothing invented, nothing a client could write (the buyer would
// write the analysis of its own offer): `offers.synthesis` stays empty
// (DECISIONS.md 2026-11-13, L2-04a). Never an advice to accept or decline;
// the financing status in its exact words, never « validé ».

const t = fr.offer.synthesis;

export type OfferSynthesis = {
  askingPriceLabel: string;
  offerPriceLabel: string;
  /** « −12 000 € · −3,4 % »; null when the two prices are equal. */
  priceGapLabel: string | null;
  financingDeclared: string[];
  financingStatus: FinancingStatus;
  financingLines: string[];
  conditions: string[];
  validityUntil: string | null;
  analysis: string[];
};

export type SynthesisInput = {
  offer: OfferContent;
  property: OfferProperty;
  /** The status of the financing of the buyer when the offer was sent. */
  financingStatus: FinancingStatus;
  /** When Leenkey checked the proof the offer carries; null before. */
  financingCheckedAt: string | null;
};

const percentFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** « a », « a et b », « a, b et c ». */
function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${t.and} ${items[items.length - 1]}`;
}

/** The day of an instant in Paris, « 30/09/2026 ». */
function parisDay(instant: string): string {
  return formatNumericDay(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(instant)),
  );
}

export function buildOfferSynthesis({
  offer,
  property,
  financingStatus,
  financingCheckedAt,
}: SynthesisInput): OfferSynthesis {
  const priceCents = offer.priceCents ?? 0;
  const gap = offerGap(priceCents, property.askingPriceCents);
  const loan = offer.financingMode === "loan";
  const proof =
    financingStatus === "document_checked"
      ? "checked"
      : financingStatus === "document_provided"
        ? "provided"
        : "none";

  const conditionNames = [
    offer.conditionPriorSale ? "priorSale" : null,
    offer.conditionAuthorization ? "authorization" : null,
    offer.conditionOther ? "other" : null,
  ].filter((name): name is "priorSale" | "authorization" | "other" => name !== null);
  const labels = fr.offer.conditions;

  const analysis: string[] = [];
  if (gap) {
    const percent = `${percentFormat.format(Math.abs(gap.percent))}${NNBSP}%`;
    analysis.push(
      gap.amountCents === 0 ? t.equal : gap.amountCents < 0 ? t.below(percent) : t.above(percent),
    );
  }
  const declared = loan
    ? offer.downPaymentCents > 0
      ? t.withLoan(formatPrice(offer.downPaymentCents))
      : t.withLoanOnly
    : t.withoutLoan;
  const proofSentence =
    proof === "checked"
      ? t.proofCheckedSentence
      : proof === "provided"
        ? t.proofProvidedSentence
        : t.proofNoneSentence;
  analysis.push(`${declared} ${proofSentence}`);
  if (conditionNames.length > 0) {
    analysis.push(t.conditions(list(conditionNames.map((name) => t.conditionNames[name]))));
  }
  analysis.push(t.last);

  return {
    askingPriceLabel: formatPrice(property.askingPriceCents),
    offerPriceLabel: formatPrice(priceCents),
    priceGapLabel: gap ? gapLabel(gap) : null,
    financingDeclared: loan
      ? [
          t.downPayment(formatPrice(offer.downPaymentCents)),
          t.loan(formatPrice(offer.loanAmountCents)),
        ]
      : [t.noLoan],
    financingStatus,
    financingLines:
      proof === "none"
        ? [t.proofNone]
        : [
            t.proofProvided,
            ...(proof === "checked" && financingCheckedAt
              ? [t.proofChecked(parisDay(financingCheckedAt))]
              : []),
          ],
    conditions: conditionNames.map((name) => labels[name]),
    validityUntil: offer.validityUntil,
    analysis,
  };
}

/** « 4 jours et 7 heures restantes »; null once the validity is past. */
export function remainingLabel(validityUntil: string, now: Date): string | null {
  const left = Date.parse(validityUntil) - now.getTime();
  if (!Number.isFinite(left) || left <= 0) return null;
  const r = fr.offer.seller.remaining;
  const hours = Math.floor(left / 3_600_000);
  if (hours < 1) return r.lessThanAnHour;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days === 0) return r.hoursLeft(r.hours(rest), rest > 1);
  if (rest === 0) return r.daysLeft(r.days(days), days > 1);
  // Agrees with the hours, the nearest (model of Cédric).
  return r.hoursLeft(`${r.days(days)} ${r.and} ${r.hours(rest)}`, true);
}
