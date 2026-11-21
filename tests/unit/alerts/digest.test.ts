import { describe, expect, it } from "vitest";
import {
  DIGEST_LISTINGS_MAX,
  composeDigest,
  freshListings,
  groupByBuyer,
  isSimilar,
  similarListings,
  similarSqlFilters,
  type DigestListing,
} from "@/leenkey/alerts/digest";

// L3-06 (SPEC-V2 16): what the daily digest says. The listings of an alert
// published since its last digest; one email per buyer for all their alerts,
// 6 listings at most, the most recent first, each once; the listings similar
// to one sold (same commune, price within 20 %, rooms within 1).

const listing = (id: string, publishedAt: string | null, more: Partial<DigestListing> = {}) => ({
  id,
  slug: `bien-${id}`,
  title: `Bien ${id}`,
  city: "Savigny-sur-Orge",
  priceCents: 30_000_000,
  surfaceM2: 80,
  rooms: 4,
  publishedAt,
  ...more,
});

const NOW = new Date("2026-11-21T05:00:00Z");
const SINCE = "2026-11-20T05:00:00+00:00";

describe("freshListings", () => {
  it("keeps the listings published after the last digest and not after this run", () => {
    const kept = freshListings(
      [
        listing("before", "2026-11-20T04:59:59Z"),
        listing("at", "2026-11-20T05:00:00Z"),
        listing("after", "2026-11-20T05:00:01Z"),
        listing("now", "2026-11-21T05:00:00Z"),
        // Published while the run reads: told by the next run, whose date starts at NOW.
        listing("later", "2026-11-21T05:00:01Z"),
        listing("never", null),
      ],
      SINCE,
      NOW,
    );
    expect(kept.map((item) => item.id)).toEqual(["after", "now"]);
    const next = freshListings(
      [listing("later", "2026-11-21T05:00:01Z")],
      NOW.toISOString(),
      new Date(NOW.getTime() + 86_400_000),
    );
    expect(next.map((item) => item.id)).toEqual(["later"]);
  });

  it("never tells a buyer of a listing of their own", () => {
    const items = [
      listing("mine", "2026-11-20T12:00:00Z"),
      listing("other", "2026-11-20T12:00:00Z"),
    ];
    expect(freshListings(items, SINCE, NOW, new Set(["mine"])).map((item) => item.id)).toEqual([
      "other",
    ]);
  });
});

describe("composeDigest", () => {
  const alert = (alertId: string, listings: DigestListing[]) => ({
    alertId,
    name: `Alerte ${alertId}`,
    href: `/acheter?ville=${alertId}`,
    listings,
  });

  it("sends nothing when no alert matched", () => {
    expect(composeDigest([])).toBeNull();
    expect(composeDigest([alert("a", []), alert("b", [])])).toBeNull();
  });

  it("gathers the alerts of a buyer: each listing once, the most recent first", () => {
    const shared = listing("shared", "2026-11-20T10:00:00Z");
    const digest = composeDigest([
      alert("a", [listing("old", "2026-11-20T06:00:00Z"), shared]),
      alert("quiet", []),
      alert("b", [shared, listing("new", "2026-11-20T18:00:00Z")]),
    ]);
    expect(digest?.listings.map((item) => item.id)).toEqual(["new", "shared", "old"]);
    expect(digest?.total).toBe(3);
    // The searches of the alerts that matched only, each with its own count.
    expect(digest?.alerts).toEqual([
      { alertId: "a", name: "Alerte a", href: "/acheter?ville=a", count: 2 },
      { alertId: "b", name: "Alerte b", href: "/acheter?ville=b", count: 2 },
    ]);
  });

  it("shows 6 listings at most, and counts them all", () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      listing(`l${index}`, `2026-11-20T${String(10 + index).padStart(2, "0")}:00:00Z`),
    );
    const digest = composeDigest([alert("a", many.slice(0, 5)), alert("b", many.slice(3))]);
    expect(DIGEST_LISTINGS_MAX).toBe(6);
    expect(digest?.listings.map((item) => item.id)).toEqual(["l8", "l7", "l6", "l5", "l4", "l3"]);
    expect(digest?.total).toBe(9);
  });
});

describe("groupByBuyer", () => {
  it("one group per buyer, in the order of the queue", () => {
    const rows = [
      { buyerId: "c", alertId: "1" },
      { buyerId: "d", alertId: "2" },
      { buyerId: "c", alertId: "3" },
    ];
    expect(groupByBuyer(rows).map((group) => group.map((row) => row.alertId))).toEqual([
      ["1", "3"],
      ["2"],
    ]);
    expect(groupByBuyer([])).toEqual([]);
  });
});

describe("similar listings after a sale", () => {
  const sold = { city: "Savigny-sur-Orge", priceCents: 30_000_000, rooms: 4 };

  it("same commune, price within 20 %, rooms within 1", () => {
    const candidate = (more: Partial<DigestListing>) => listing("x", "2026-11-01T00:00:00Z", more);
    expect(isSimilar(sold, candidate({}))).toBe(true);
    // The commune, whatever its case and its accents.
    expect(isSimilar(sold, candidate({ city: "SAVIGNY SUR ORGE" }))).toBe(true);
    expect(isSimilar(sold, candidate({ city: "Juvisy-sur-Orge" }))).toBe(false);
    expect(isSimilar(sold, candidate({ priceCents: 24_000_000 }))).toBe(true);
    expect(isSimilar(sold, candidate({ priceCents: 23_999_999 }))).toBe(false);
    expect(isSimilar(sold, candidate({ priceCents: 36_000_000 }))).toBe(true);
    expect(isSimilar(sold, candidate({ priceCents: 36_000_001 }))).toBe(false);
    expect(isSimilar(sold, candidate({ rooms: 3 }))).toBe(true);
    expect(isSimilar(sold, candidate({ rooms: 5 }))).toBe(true);
    expect(isSimilar(sold, candidate({ rooms: 2 }))).toBe(false);
    expect(isSimilar(sold, candidate({ rooms: 6 }))).toBe(false);
    expect(isSimilar(sold, candidate({ rooms: null }))).toBe(false);
    // A plot has no room: the commune and the price only.
    expect(isSimilar({ ...sold, rooms: null }, candidate({ rooms: null }))).toBe(true);
  });

  it("asks the search for the commune, the price range and the fewest rooms", () => {
    expect(similarSqlFilters(sold)).toEqual({
      city: "savigny-sur-orge",
      price_min_cents: 24_000_000,
      price_max_cents: 36_000_000,
      rooms_min: 3,
    });
    expect(similarSqlFilters({ ...sold, rooms: 1 })).not.toHaveProperty("rooms_min");
    expect(similarSqlFilters({ ...sold, rooms: null })).not.toHaveProperty("rooms_min");
  });

  it("6 at most, the most recent first, never the buyer's own", () => {
    const candidates = [
      ...Array.from({ length: 8 }, (_, index) =>
        listing(`s${index}`, `2026-11-0${index + 1}T00:00:00Z`),
      ),
      listing("big", "2026-11-19T00:00:00Z", { rooms: 7 }),
      listing("mine", "2026-11-18T00:00:00Z"),
    ];
    expect(similarListings(sold, candidates, new Set(["mine"])).map((item) => item.id)).toEqual([
      "s7",
      "s6",
      "s5",
      "s4",
      "s3",
      "s2",
    ]);
    expect(similarListings(sold, [])).toEqual([]);
  });
});
