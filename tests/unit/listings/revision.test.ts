import { describe, expect, it } from "vitest";
import { priceChangePct, toRevision, type RevisionRow } from "@/leenkey/listings/revision";

// L1-35: the lines of the history of a listing, as the database writes them.

const SELLER = "seller-1";

function row(overrides: Partial<RevisionRow>): RevisionRow {
  return {
    id: "r1",
    field: "price",
    old_value: 25000000,
    new_value: 23900000,
    created_at: "2026-11-13T09:00:00.000Z",
    changed_by: SELLER,
    ...overrides,
  };
}

describe("a line of the history of a listing", () => {
  it("the price: old and new value in cents, by the seller", () => {
    expect(toRevision(row({}), SELLER)).toEqual({
      id: "r1",
      at: "2026-11-13T09:00:00.000Z",
      byTeam: false,
      change: { kind: "price", oldCents: 25000000, newCents: 23900000 },
    });
  });

  it("the title and the description, as written", () => {
    expect(
      toRevision(row({ field: "title", old_value: "A", new_value: "B" }), SELLER)?.change,
    ).toEqual({
      kind: "title",
      old: "A",
      new: "B",
    });
    expect(
      toRevision(row({ field: "description", old_value: "Avant", new_value: "Après" }), SELLER)
        ?.change,
    ).toEqual({ kind: "description", old: "Avant", new: "Après" });
  });

  it("a photo added, removed, its caption changed (an empty caption is none)", () => {
    const photo = (caption: string | null) => ({ id: "p1", caption });
    expect(
      toRevision(row({ field: "photo", old_value: null, new_value: photo("Séjour") }), SELLER)
        ?.change,
    ).toEqual({ kind: "photoAdded", caption: "Séjour" });
    expect(
      toRevision(row({ field: "photo", old_value: photo(" "), new_value: null }), SELLER)?.change,
    ).toEqual({ kind: "photoRemoved", caption: null });
    expect(
      toRevision(
        row({ field: "photo", old_value: photo(null), new_value: photo("Jardin") }),
        SELLER,
      )?.change,
    ).toEqual({ kind: "caption", old: null, new: "Jardin" });
  });

  it("changed by someone else than the seller: the team", () => {
    expect(toRevision(row({ changed_by: "admin-1" }), SELLER)?.byTeam).toBe(true);
    expect(toRevision(row({ changed_by: "admin-1" }), null)?.byTeam).toBe(false);
  });

  it("a field or a value it does not know: left out, never a wrong line", () => {
    expect(toRevision(row({ field: "rooms" }), SELLER)).toBeNull();
    expect(
      toRevision(row({ field: "photo", old_value: null, new_value: null }), SELLER),
    ).toBeNull();
    expect(toRevision(row({ old_value: "250000" }), SELLER)?.change).toEqual({
      kind: "price",
      oldCents: null,
      newCents: 23900000,
    });
  });

  it("the change of the price in percent, rounded", () => {
    expect(priceChangePct(25000000, 23900000)).toBe(-4);
    expect(priceChangePct(20000000, 21000000)).toBe(5);
    expect(priceChangePct(null, 21000000)).toBeNull();
    expect(priceChangePct(0, 21000000)).toBeNull();
  });
});
