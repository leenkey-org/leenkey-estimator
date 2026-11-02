import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { LISTING_PRICE_MAX_EUROS } from "@/lib/validations/listing";
import { gapPercent, type PricePreview } from "../previews";
import { editableListing, updateListing, type UpdateOutput } from "./listing-edit";
import { withProperty } from "./shared";

// update_listing_price (SPEC-V2 section 12): changes the price of the
// listing, once the seller has seen the old one, the new one and its gap to
// the analysis of value, and confirmed. Whole euros, 50 000 000 at most, as on
// step 3.

const input = z.object({
  propertyId: z.string().uuid(),
  priceEuros: z.number().int().positive().max(LISTING_PRICE_MAX_EUROS),
});

type Input = z.infer<typeof input>;

export const updateListingPriceTool: AiTool<Input, UpdateOutput, PricePreview> = {
  name: "update_listing_price",
  description:
    "Change the price of the listing of one property, in whole euros. The seller sees the current " +
    "and the new price and the gap to the analysis of value, and must confirm before anything changes.",
  input,
  inputSchema: withProperty(
    {
      priceEuros: {
        type: "integer",
        description: `The new price in whole euros, ${LISTING_PRICE_MAX_EUROS} at most.`,
      },
    },
    ["priceEuros"],
  ),
  requiresConfirmation: true,
  contexts: ["seller"],
  async preview({ propertyId, priceEuros }, ctx) {
    const target = await editableListing(ctx.profileId, propertyId);
    if (!target.ok) return target;
    const before = target.data.listing.priceCents / 100;
    if (before === priceEuros) {
      return { ok: false, error: "The new price is the current one: nothing to change." };
    }
    const valuation = target.data.property.estimation
      ? target.data.property.estimation.valueCents / 100
      : null;
    return {
      ok: true,
      data: {
        kind: "listing_price",
        propertyName: target.data.name,
        beforeEuros: before,
        afterEuros: priceEuros,
        valuationEuros: valuation,
        gapPercent: gapPercent(priceEuros, valuation),
      },
    };
  },
  async execute({ propertyId, priceEuros }, ctx) {
    const target = await editableListing(ctx.profileId, propertyId);
    if (!target.ok) return { updated: false, error: target.error };
    return updateListing(ctx, target.data.listing.id, { priceCents: priceEuros * 100 });
  },
};
