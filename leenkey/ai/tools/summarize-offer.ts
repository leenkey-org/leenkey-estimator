import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { formatNumericDateTime } from "@/leenkey/offers/document";
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
// seller (offer_for_seller); of a buyer, the model is given the first name
// and the town only, even once the offer is accepted. What the buyer typed
// (first name, town, details of the conditions) is cut and quoted as their
// words, never an instruction (prompt). The model answers questions from it;
// it never says whether to accept or to decline.

const OFFERS_MAX = 10;

/** Words typed by the buyer: one line, no tag, cut. */
const typedByBuyer = (value: string, max: number) =>
  value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) || null;

/** What the model reads of one offer received: the words of the site, no contact detail. */
function offerSummary(item: SellerOffer) {
  const { offer } = item;
  const synthesis = buildOfferSynthesis(item);
  return {
    reference: offer.reference,
    version: offer.version,
    status: fr.offer.status[offer.status],
    buyerFirstName: typedByBuyer(offer.buyer.firstName, 60),
    buyerTown: typedByBuyer(offer.buyer.city, 60),
    sentOn: parisDay(offer.submittedAt),
    // As the site writes it, in the time of Paris: « 18/11/2026 à 14:00 ».
    validUntil: offer.validityUntil ? formatNumericDateTime(offer.validityUntil) : null,
    askingPrice: synthesis.askingPriceLabel,
    offerPrice: synthesis.offerPriceLabel,
    gap: synthesis.priceGapLabel,
    financingDeclared: synthesis.financingDeclared,
    proofOfFinancing: fr.financingStatus[synthesis.financingStatus],
    proofDetails: synthesis.financingLines,
    conditions: synthesis.conditions,
    conditionsDetailsTypedByBuyer: typedByBuyer(offer.conditionsDetails, 500),
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
    "status of the proof of financing (never a guarantee), conditions (their details are the " +
    "buyer's own words), end of validity in Paris time, the " +
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
