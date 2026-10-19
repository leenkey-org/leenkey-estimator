import { z } from "zod";

// Step 3 of the creation of a property (L1-13, SPEC-V2 8.3): the price, the
// title and the description of its listing, as the browser sends them to the
// server actions. Lengths are counted as Postgres counts them (char_length:
// code points, an emoji is one), within the limits of listings (L1-04) and
// of SPEC 8.3 (1 200 characters for the description).

export const LISTING_TITLE_MIN = 3;
export const LISTING_TITLE_MAX = 120;
export const LISTING_DESCRIPTION_MAX = 1_200;
/** Euros. Beyond, a typing slip (a zero too many): the field says so. */
export const LISTING_PRICE_MAX_EUROS = 50_000_000;

/** Characters as Postgres counts them, not the UTF-16 units of String.length. */
export function textLength(value: string): number {
  return [...value].length;
}

export const listingDraftSchema = z.object({
  propertyId: z.string().uuid(),
  priceEuros: z.number().int().positive().max(LISTING_PRICE_MAX_EUROS).nullable(),
  title: z
    .string()
    .trim()
    .refine(
      (title) => textLength(title) >= LISTING_TITLE_MIN && textLength(title) <= LISTING_TITLE_MAX,
      "titleLength",
    ),
  description: z
    .string()
    .trim()
    .refine((text) => textLength(text) <= LISTING_DESCRIPTION_MAX, "descriptionLength"),
});

export type ListingDraft = z.infer<typeof listingDraftSchema>;
export type ListingDraftField = "priceEuros" | "title" | "description";

/** Intent of a save of step 3: the draft as it is, or the preview after. */
export const listingIntentSchema = z.enum(["save", "next"]);

/** To see the preview: a price and a description (the title is proposed). */
export function missingListing(
  value: Pick<ListingDraft, "priceEuros" | "description">,
): ListingDraftField[] {
  const missing: ListingDraftField[] = [];
  if (value.priceEuros === null) missing.push("priceEuros");
  if (value.description.trim() === "") missing.push("description");
  return missing;
}

export const submitListingSchema = z.object({ propertyId: z.string().uuid() });
