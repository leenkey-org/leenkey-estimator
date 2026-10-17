import { describe, expect, it } from "vitest";
import { chunk } from "@/lib/utils";
import { favoriteSchema } from "@/lib/validations/favorites";

// L1-18: input of the setFavorite action, ids split for the `.in()` filters.

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

describe("chunk", () => {
  it("splits in parts of the given size, in order, the last one shorter", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(
      chunk(
        Array.from({ length: 250 }, (_, i) => i),
        100,
      ).map((part) => part.length),
    ).toEqual([100, 100, 50]);
  });

  it("gives no part for an empty list", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
