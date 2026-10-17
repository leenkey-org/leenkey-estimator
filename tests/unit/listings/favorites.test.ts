import { describe, expect, it } from "vitest";
import { favoriteSchema } from "@/lib/validations/favorites";

// L1-18: input of the setFavorite action.

describe("favoriteSchema", () => {
  const listingId = "623efc8b-97d4-4902-ac43-406417498893";

  it("accepts a listing id and the wanted state", () => {
    expect(favoriteSchema.parse({ listingId, favorite: true })).toEqual({
      listingId,
      favorite: true,
    });
    expect(favoriteSchema.parse({ listingId, favorite: false }).favorite).toBe(false);
  });

  it("refuses anything else", () => {
    for (const input of [
      null,
      {},
      { listingId, favorite: "true" },
      { listingId: "lk0005", favorite: true },
      { listingId: `${listingId} `, favorite: true },
      { favorite: true },
    ]) {
      expect(favoriteSchema.safeParse(input).success, JSON.stringify(input)).toBe(false);
    }
  });
});
