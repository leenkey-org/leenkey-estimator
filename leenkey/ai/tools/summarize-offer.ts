import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { propertyOffers, type SellerOffer } from "@/leenkey/offers/seller";
import { buildOfferSynthesis } from "@/leenkey/offers/synthesis";
import { frFinancingStatus } from "@/lib/i18n/sections/financingStatus";
import { frOffer } from "@/lib/i18n/sections/offer";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { parisDay, propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { financingStatus: frFinancingStatus, offer: frOffer } as const;

// summarize_offer (SPEC-V2 sections 12 and 13, L2-07): the offers received
// on a property of the seller, each with the summary the seller reads on the
// site: the same templates (leenkey/offers/synthesis.ts), computed from the
// frozen offer, never written by a model. Read through the view of the
// seller (offer_for_seller): the first name and the town of a buyer only,
// until the offer is accepted. The model answers questions from it; it never
// says whether to accept or to decline (prompt).

const OFFERS_MAX = 10;

/** What the model reads of one offer received: the words of the site, no contact detail. */
export function offerSummary(item: SellerOffer) {
  const { offer } = item;
  const synthesis = buildOfferSynthesis(item);
  return {
    reference: offer.reference,
    version: offer.version,
    status: fr.offer.status[offer.status],
    buyerFirstName: offer.buyer.firstName || null,
    buyerTown: offer.buyer.city || null,
    sentOn: parisDay(offer.submittedAt),
    validUntil: offer.validityUntil,
    askingPrice: synthesis.askingPriceLabel,
    offerPrice: synthesis.offerPriceLabel,
    gap: synthesis.priceGapLabel,
    financingDeclared: synthesis.financingDeclared,
    proofOfFinancing: fr.financingStatus[synthesis.financingStatus],
    proofDetails: synthesis.financingLines,
    conditions: synthesis.conditions,
    conditionsDetails: offer.conditionsDetails || null,
    analysis: synthesis.analysis,
    answeredOn: parisDay(item.answeredAt),
    precontractSignedOn: item.precontractSignedAt,
    withdrawalPeriodStart: item.withdrawalPeriodStart,
  };
}

export const summarizeOfferTool: AiTool<PropertyInput, unknown> = {
  name: "summarize_offer",
  description:
    "Read the offers received on one property of the seller (10 most recent), each with the " +
    "summary the seller reads on the site: status, first name and town of the buyer, price of " +
    "the listing when the offer was sent, price offered, gap, financing declared in the offer, " +
    "status of the proof of financing (never a guarantee), conditions, end of validity, the " +
    "neutral « Analyse Leenkey », dates of the answer and of the avant-contrat. Use it to answer " +
    "a question of the seller about an offer; never say whether to accept or to decline it.",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    if (!found.data) return { error: PROPERTY_NOT_FOUND };
    const offers = await propertyOffers(propertyId);
    if (!offers.ok) return { error: "unavailable" };
    return {
      total: offers.data.length,
      offers: offers.data.slice(0, OFFERS_MAX).map(offerSummary),
    };
  },
};
