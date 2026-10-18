import { describe, expect, it } from "vitest";
import { priceGap } from "@/leenkey/properties/creation";
import {
  LISTING_DESCRIPTION_MAX,
  listingDraftSchema,
  listingIntentSchema,
  missingListing,
  submitListingSchema,
  textLength,
} from "@/lib/validations/listing";

// L1-13: step 3 of the creation, the price, the title and the description.

const propertyId = "623efc8b-97d4-4902-ac43-406417498893";
const draft = {
  propertyId,
  priceEuros: 239_000,
  title: "Appartement 3 pièces 68 m² · Savigny-sur-Orge",
  description: "Au 2e étage avec ascenseur, appartement traversant.",
};

describe("step 3 of the creation", () => {
  it("counts the characters as Postgres does", () => {
    expect(textLength("Séjour")).toBe(6);
    // An emoji is two UTF-16 units but one character for char_length.
    expect("🏡".length).toBe(2);
    expect(textLength("🏡")).toBe(1);
  });

  it("takes a whole price in euros, within reason", () => {
    expect(listingDraftSchema.safeParse(draft).success).toBe(true);
    expect(listingDraftSchema.safeParse({ ...draft, priceEuros: null }).success).toBe(true);
    for (const priceEuros of [0, -1, 239_000.5, 50_000_001]) {
      expect(
        listingDraftSchema.safeParse({ ...draft, priceEuros }).success,
        String(priceEuros),
      ).toBe(false);
    }
  });

  it("trims the title and keeps it between 3 and 120 characters", () => {
    const parsed = listingDraftSchema.parse({ ...draft, title: "  Maison 5 pièces  " });
    expect(parsed.title).toBe("Maison 5 pièces");
    expect(listingDraftSchema.safeParse({ ...draft, title: "  ab " }).success).toBe(false);
    expect(listingDraftSchema.safeParse({ ...draft, title: "x".repeat(120) }).success).toBe(true);
    expect(listingDraftSchema.safeParse({ ...draft, title: "x".repeat(121) }).success).toBe(false);
  });

  it("allows 1 200 characters of description, emoji counted once", () => {
    const max = "🏡".repeat(LISTING_DESCRIPTION_MAX);
    expect(listingDraftSchema.safeParse({ ...draft, description: max }).success).toBe(true);
    expect(listingDraftSchema.safeParse({ ...draft, description: `${max}a` }).success).toBe(false);
    expect(listingDraftSchema.parse({ ...draft, description: "  Lumineux.\n" }).description).toBe(
      "Lumineux.",
    );
  });

  it("asks for a price and a description to see the preview", () => {
    expect(missingListing(draft)).toEqual([]);
    expect(missingListing({ priceEuros: null, description: " " })).toEqual([
      "priceEuros",
      "description",
    ]);
  });

  it("knows the two saves of the step, and sends a property by its id", () => {
    expect(listingIntentSchema.options).toEqual(["save", "next"]);
    expect(submitListingSchema.safeParse({ propertyId }).success).toBe(true);
    expect(submitListingSchema.safeParse({ propertyId: "LK-0001" }).success).toBe(false);
  });
});

describe("gap of the price to the analysis of value", () => {
  it("gives whole percents, above and below", () => {
    expect(priceGap(35_000_000, 34_000_000)).toBe(3);
    expect(priceGap(32_300_000, 34_000_000)).toBe(-5);
    expect(priceGap(34_100_000, 34_000_000)).toBe(0);
    // Within half a percent: the same value, never « -0 % ».
    expect(Object.is(priceGap(33_900_000, 34_000_000), 0)).toBe(true);
  });
});
