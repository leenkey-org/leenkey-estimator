import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  parseSearchParams,
  SearchFilters,
  searchHref,
  toSearchParams,
  type SearchQuery,
} from "@/lib/validations/search";

describe("SearchFilters", () => {
  it("accepts a complete set of filters", () => {
    const filters = {
      location: "savigny-sur-orge",
      radiusKm: 5,
      type: "appartement",
      priceMinCents: 20_000_000,
      priceMaxCents: 40_000_000,
      surfaceMin: 50,
      surfaceMax: 90,
      roomsMin: 3,
      bedroomsMin: 2,
      outdoor: ["balcon", "jardin"],
      parking: true,
      elevator: true,
      dpeMax: "D",
    };
    expect(SearchFilters.parse(filters)).toEqual(filters);
  });

  it("accepts a postal code as the place", () => {
    expect(SearchFilters.safeParse({ location: "91600", radiusKm: 10 }).success).toBe(true);
  });

  it("refuses incoherent or unknown values", () => {
    const invalid = [
      { priceMinCents: 40_000_000, priceMaxCents: 20_000_000 },
      { surfaceMin: 100, surfaceMax: 50 },
      { radiusKm: 5 },
      { location: "savigny-sur-orge", radiusKm: 7 },
      { location: "Savigny sur Orge" },
      { type: "chateau" },
      { dpeMax: "H" },
      { outdoor: ["piscine"] },
      { outdoor: ["balcon", "balcon"] },
      { outdoor: [] },
      { roomsMin: 0 },
      { priceMaxCents: 0 },
      { priceMaxCents: 1.5 },
      { parking: false },
      { unknown: 1 },
    ];
    for (const filters of invalid) {
      expect(SearchFilters.safeParse(filters).success, JSON.stringify(filters)).toBe(false);
    }
  });
});

describe("search URL", () => {
  it("reads the example of SPEC 8.4", () => {
    expect(
      parseSearchParams(
        new URLSearchParams("ville=savigny-sur-orge&rayon=5&budget_max=400000&pieces_min=3"),
      ),
    ).toEqual({
      filters: {
        location: "savigny-sur-orge",
        radiusKm: 5,
        priceMaxCents: 40_000_000,
        roomsMin: 3,
      },
      sort: "recent",
      page: 1,
    });
  });

  it("reads every parameter, from a Next.js searchParams object too", () => {
    const query = parseSearchParams({
      ville: "91600",
      rayon: "10",
      type: "maison",
      budget_min: "200 000",
      budget_max: ["500000", "600000"],
      surface_min: "80",
      surface_max: "200",
      pieces_min: "4",
      chambres_min: "3",
      exterieur: "jardin,terrasse",
      parking: "1",
      ascenseur: "1",
      dpe_max: "c",
      tri: "prix_asc",
      page: "3",
    });
    expect(query).toEqual({
      filters: {
        location: "91600",
        radiusKm: 10,
        type: "maison",
        priceMinCents: 20_000_000,
        priceMaxCents: 50_000_000,
        surfaceMin: 80,
        surfaceMax: 200,
        roomsMin: 4,
        bedroomsMin: 3,
        outdoor: ["terrasse", "jardin"],
        parking: true,
        elevator: true,
        dpeMax: "C",
      },
      sort: "prix_asc",
      page: 3,
    });
  });

  it("ignores what it cannot read instead of failing", () => {
    const query = parseSearchParams(
      new URLSearchParams(
        "ville=%%%&rayon=7&type=chateau&budget_max=abc&pieces_min=0&exterieur=piscine&dpe_max=Z&tri=random&page=-2&parking=0",
      ),
    );
    expect(query).toEqual({ filters: {}, sort: "recent", page: 1 });
  });

  it("puts min and max back in order and drops a radius without a commune", () => {
    expect(
      parseSearchParams(
        new URLSearchParams(
          "budget_min=500000&budget_max=300000&surface_min=90&surface_max=40&rayon=5",
        ),
      ).filters,
    ).toEqual({
      priceMinCents: 30_000_000,
      priceMaxCents: 50_000_000,
      surfaceMin: 40,
      surfaceMax: 90,
    });
  });

  it("turns a typed commune name into its slug", () => {
    expect(parseSearchParams(new URLSearchParams("ville=Épinay sur Orge")).filters.location).toBe(
      "epinay-sur-orge",
    );
  });

  it("caps the number of pages shown", () => {
    expect(parseSearchParams(new URLSearchParams("page=9999")).page).toBe(50);
  });

  it("writes the parameters in a fixed order, defaults left out", () => {
    const query: SearchQuery = {
      filters: {
        dpeMax: "D",
        location: "savigny-sur-orge",
        radiusKm: 5,
        priceMaxCents: 40_000_000,
        roomsMin: 3,
        outdoor: ["jardin", "balcon"],
      },
      sort: "recent",
      page: 1,
    };
    expect(toSearchParams(query).toString()).toBe(
      "ville=savigny-sur-orge&rayon=5&budget_max=400000&pieces_min=3&exterieur=balcon%2Cjardin&dpe_max=D",
    );
    expect(searchHref({ filters: {} })).toBe("/acheter");
    expect(searchHref({ filters: {}, sort: "surface", page: 2 })).toBe(
      "/acheter?tri=surface&page=2",
    );
  });

  it("reads back what it writes", () => {
    const queries: SearchQuery[] = [
      { filters: {}, sort: "recent", page: 1 },
      {
        filters: {
          location: "91360",
          radiusKm: 20,
          type: "terrain",
          priceMinCents: 5_000_000,
          priceMaxCents: 100_000_000,
          surfaceMin: 300,
          surfaceMax: 1_000,
          roomsMin: 1,
          bedroomsMin: 1,
          outdoor: ["balcon", "terrasse", "jardin"],
          parking: true,
          elevator: true,
          dpeMax: "A",
        },
        sort: "prix_m2",
        page: 4,
      },
    ];
    for (const query of queries) {
      expect(parseSearchParams(toSearchParams(query))).toEqual(query);
    }
  });

  it("counts the active criteria, place and radius aside", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters({ location: "savigny-sur-orge", radiusKm: 5 })).toBe(0);
    expect(
      countActiveFilters({
        type: "appartement",
        priceMinCents: 1,
        priceMaxCents: 2,
        roomsMin: 3,
        outdoor: ["jardin"],
        parking: true,
        dpeMax: "C",
      }),
    ).toBe(6);
  });
});
