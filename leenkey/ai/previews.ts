import { z } from "zod";

// What a change proposed by the assistant will do, shown before the seller
// confirms it (ConfirmActionCard, DESIGN.md 12 « Assistant »): before and
// after. Sent to the browser as data, read back there with these schemas.

export const descriptionPreview = z.object({
  kind: z.literal("listing_description"),
  propertyName: z.string(),
  before: z.string(),
  after: z.string(),
});

export const pricePreview = z.object({
  kind: z.literal("listing_price"),
  propertyName: z.string(),
  beforeEuros: z.number(),
  afterEuros: z.number(),
  /** The analysis of value of the property, when it has one. */
  valuationEuros: z.number().nullable(),
  /** Gap of the new price to the analysis of value, in %, one decimal. */
  gapPercent: z.number().nullable(),
});

/** contact_advisor (L1-34): the summary the adviser will read. */
export const handoffPreview = z.object({
  kind: z.literal("advisor_handoff"),
  propertyName: z.string(),
  summary: z.string(),
});

/** create_case (L1-31): the request the team will read, about a property or none. */
export const casePreview = z.object({
  kind: z.literal("case_request"),
  propertyName: z.string().nullable(),
  subject: z.string(),
  summary: z.string(),
});

/**
 * prefill_offer (L2-06): the price the draft of an offer will hold, beside
 * the price of the listing; the price already in the draft, when the buyer
 * wrote one.
 */
export const offerPrefillPreview = z.object({
  kind: z.literal("offer_prefill"),
  listingId: z.string().uuid(),
  listingTitle: z.string(),
  city: z.string(),
  askingEuros: z.number(),
  priceEuros: z.number(),
  /** Gap of the price offered to the price of the listing, in %, one decimal. */
  gapPercent: z.number().nullable(),
  draftPriceEuros: z.number().nullable(),
});

export const actionPreview = z.discriminatedUnion("kind", [
  descriptionPreview,
  pricePreview,
  handoffPreview,
  casePreview,
  offerPrefillPreview,
]);

export type DescriptionPreview = z.infer<typeof descriptionPreview>;
export type PricePreview = z.infer<typeof pricePreview>;
export type HandoffPreview = z.infer<typeof handoffPreview>;
export type CasePreview = z.infer<typeof casePreview>;
export type OfferPrefillPreview = z.infer<typeof offerPrefillPreview>;
export type ActionPreview = z.infer<typeof actionPreview>;

/** The gap of a price to a reference (the analysis of value, the price of a listing), in %, one decimal; null without one. */
export function gapPercent(priceEuros: number, valuationEuros: number | null): number | null {
  if (valuationEuros === null || valuationEuros <= 0) return null;
  return Math.round(((priceEuros - valuationEuros) / valuationEuros) * 1000) / 10;
}
