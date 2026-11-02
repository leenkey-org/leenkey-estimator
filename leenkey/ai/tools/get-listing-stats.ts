import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { daysOnSale, saleFigures } from "@/leenkey/properties/dashboard";
import { saleDashboard } from "@/leenkey/properties/dashboard-data";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { parisDay, propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// get_listing_stats (SPEC-V2 section 12): the figures of « Ma vente » for one
// listing: views over seven days, contacts, qualified contacts, buyers
// waiting for an answer. The offers come with lot 2.

export const getListingStatsTool: AiTool<PropertyInput, unknown> = {
  name: "get_listing_stats",
  description:
    "Read the figures of the listing of one property: views over the last 7 days, buyers who " +
    "contacted the seller, those whose financing is at least declared, conversations waiting for " +
    "an answer of the seller, days on sale.",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    const property = found.data;
    if (!property) return { error: PROPERTY_NOT_FOUND };
    if (!property.listing) return { error: "This property has no listing yet." };
    const dashboard = await saleDashboard(property);
    if (!dashboard.ok) return { error: "unavailable" };
    const figures = saleFigures(dashboard.data.conversations, dashboard.data.views);
    return {
      viewsLast7Days: figures.views,
      buyerContacts: figures.contacts,
      buyersWithFinancingDeclared: figures.qualified,
      conversationsWaitingForSeller: dashboard.data.situation?.waitingBuyers.length ?? 0,
      publishedOn: parisDay(property.listing.publishedAt),
      daysOnSale: daysOnSale(property.listing.publishedAt, property.listing.soldAt),
    };
  },
};
