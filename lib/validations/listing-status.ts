import { z } from "zod";
import { LISTING_PRICE_MAX_EUROS } from "./listing";

// Actions of the page of a property (L1-14): the status of its listing
// changes through the SQL functions of L1-04, never by a free update.

export const listingActionSchema = z.object({ listingId: z.string().uuid() });

/** « Marquer comme vendu »: the final price is optional, in whole euros (SPEC-V2 section 4). */
export const markSoldSchema = z.object({
  listingId: z.string().uuid(),
  soldPriceEuros: z.number().int().positive().max(LISTING_PRICE_MAX_EUROS).nullable(),
});

/** « Supprimer le brouillon » (SPEC-V2 8.3): a draft only. */
export const deleteDraftSchema = z.object({ propertyId: z.string().uuid() });
