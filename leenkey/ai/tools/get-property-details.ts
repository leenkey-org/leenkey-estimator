import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { frListingStatus } from "@/lib/i18n/sections/listingStatus";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";
import { parisDay, propertyInput, propertyInputSchema, type PropertyInput } from "./shared";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { listingStatus: frListingStatus } as const;

// get_property_details (SPEC-V2 section 12): a property of the seller, its
// characteristics, its listing and its analysis of value.

const euros = (cents: number | null) => (cents === null ? null : cents / 100);

export const getPropertyDetailsTool: AiTool<PropertyInput, unknown> = {
  name: "get_property_details",
  description:
    "Read one property of the seller: address, characteristics (type, surfaces, rooms, floor, " +
    "energy classes, heating, features, charges), its listing (reference, title, full description, " +
    "price, status, refusal reason) and its analysis of value (value and range, in euros).",
  input: propertyInput,
  inputSchema: propertyInputSchema,
  requiresConfirmation: false,
  contexts: ["seller"],
  async execute({ propertyId }, ctx) {
    const found = await sellerPropertyById(ctx.profileId, propertyId);
    if (!found.ok) return { error: "unavailable" };
    const property = found.data;
    if (!property) return { error: PROPERTY_NOT_FOUND };
    const { characteristics: c, listing, estimation } = property;
    return {
      propertyId: property.id,
      address: property.address,
      characteristics: {
        type: c.type,
        livingAreaM2: c.surfaceM2,
        carrezM2: c.carrezM2,
        rooms: c.rooms,
        bedrooms: c.bedrooms,
        floor: c.floor,
        floorsTotal: c.floorsTotal,
        buildYear: c.buildYear,
        isNewBuild: c.isNewBuild,
        dpeClass: c.dpe,
        gesClass: c.ges,
        heating: c.heating,
        features: c.features,
        orientation: property.orientation,
        chargesMonthlyEuros: c.chargesMonthlyEuros,
        propertyTaxYearlyEuros: c.propertyTaxYearlyEuros,
        coproLots: c.coproLots,
      },
      listing: listing
        ? {
            reference: listing.reference,
            title: listing.title,
            description: listing.description,
            priceEuros: listing.priceCents / 100,
            status: fr.listingStatus[listing.status],
            publishedOn: parisDay(listing.publishedAt),
            refusalReason: listing.rejectionReason,
          }
        : null,
      valuation: estimation
        ? {
            valueEuros: euros(estimation.valueCents),
            lowEuros: euros(estimation.lowCents),
            highEuros: euros(estimation.highCents),
            madeOn: parisDay(estimation.madeAt),
          }
        : null,
    };
  },
};
