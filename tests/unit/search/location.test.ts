import { describe, expect, it } from "vitest";
import { LAUNCH_ZONE } from "@/lib/config/launch-zone";
import { slugify } from "@/lib/slug";
import {
  COMMUNES,
  locationFromText,
  resolveLocation,
  suggestCommunes,
} from "@/leenkey/search/location";
import { SQL_SORT, toSqlFilters } from "@/leenkey/search/sql-filters";
import { SEARCH_SORTS } from "@/lib/validations/search";

describe("slugify", () => {
  it("gives the same slugs as the SQL function public.slugify", () => {
    expect(slugify("Viry-Châtillon")).toBe("viry-chatillon");
    expect(slugify("Sainte-Geneviève-des-Bois")).toBe("sainte-genevieve-des-bois");
    expect(slugify("La Ville-du-Bois")).toBe("la-ville-du-bois");
    expect(slugify("Saint-Œuvre")).toBe("saint-oeuvre");
    expect(slugify("  Épinay-sur-Orge  ")).toBe("epinay-sur-orge");
  });
});

describe("launch zone", () => {
  it("lists the 20 communes of SPEC section 20, 8 in zone 1", () => {
    expect(LAUNCH_ZONE).toHaveLength(20);
    expect(LAUNCH_ZONE.filter((commune) => commune.zone === 1)).toHaveLength(8);
    expect(new Set(COMMUNES.map((commune) => commune.slug)).size).toBe(20);
  });

  it("has postal codes of the Essonne and centres around Épinay-sur-Orge", () => {
    for (const commune of LAUNCH_ZONE) {
      expect(
        commune.postalCodes.every((code) => /^91\d{3}$/.test(code)),
        commune.name,
      ).toBe(true);
      expect(Math.abs(commune.centre.lat - 48.6736), commune.name).toBeLessThan(0.1);
      expect(Math.abs(commune.centre.lng - 2.3256), commune.name).toBeLessThan(0.15);
    }
  });
});

describe("resolveLocation", () => {
  it("names a commune of the zone and gives its centre", () => {
    expect(resolveLocation("savigny-sur-orge")).toEqual({
      value: "savigny-sur-orge",
      label: "Savigny-sur-Orge",
      kind: "commune",
      citySlug: "savigny-sur-orge",
      centre: { lat: 48.6769, lng: 2.3486 },
    });
  });

  it("takes the middle of the communes sharing a postal code", () => {
    const place = resolveLocation("91360");
    expect(place).toMatchObject({ kind: "postal_code", label: "91360", postalCode: "91360" });
    expect(place.centre?.lat).toBeCloseTo((48.6736 + 48.6663) / 2, 6);
  });

  it("keeps a commune outside the zone, without a centre", () => {
    expect(resolveLocation("saulx-les-chartreux").centre).toBeDefined();
    expect(resolveLocation("saint-denis")).toEqual({
      value: "saint-denis",
      label: "Saint-Denis",
      kind: "commune",
      citySlug: "saint-denis",
      centre: undefined,
    });
    expect(resolveLocation("paris").label).toBe("Paris");
    expect(resolveLocation("ferte-sous-jouarre").label).toBe("Ferte-sous-Jouarre");
  });
});

describe("suggestCommunes", () => {
  const names = (input: string) => suggestCommunes(input).map((commune) => commune.name);

  it("puts the names that start with the text first, then those that contain it", () => {
    expect(names("sa")).toEqual([
      "Sainte-Geneviève-des-Bois",
      "Savigny-sur-Orge",
      "Saulx-les-Chartreux",
      "Morsang-sur-Orge",
    ]);
  });

  it("ignores case and accents, and matches a word of the name", () => {
    expect(names("EPINAY")).toEqual(["Épinay-sur-Orge"]);
    expect(names("chatillon")).toEqual(["Viry-Châtillon"]);
    expect(names("orge")[0]).toBe("Épinay-sur-Orge");
    expect(names("orge")).toHaveLength(7);
  });

  it("matches postal codes", () => {
    expect(names("91360")).toEqual(["Épinay-sur-Orge", "Villemoisson-sur-Orge"]);
    expect(names("913")).toHaveLength(8);
  });

  it("lists every commune, core market first, when nothing is typed", () => {
    expect(suggestCommunes("")).toHaveLength(20);
    expect(suggestCommunes("")[0].zone).toBe(1);
    expect(suggestCommunes("").at(-1)?.zone).toBe(2);
  });
});

describe("locationFromText", () => {
  it("takes the best suggestion, a postal code or the slug of the text", () => {
    expect(locationFromText("savi")).toBe("savigny-sur-orge");
    expect(locationFromText("91600")).toBe("91600");
    expect(locationFromText("Évry-Courcouronnes")).toBe("evry-courcouronnes");
    expect(locationFromText("   ")).toBeUndefined();
  });
});

describe("toSqlFilters", () => {
  it("maps the app filters to the keys of search_listings", () => {
    expect(
      toSqlFilters({
        location: "savigny-sur-orge",
        radiusKm: 5,
        type: "appartement",
        priceMinCents: 10_000_000,
        priceMaxCents: 40_000_000,
        surfaceMin: 40,
        surfaceMax: 90,
        roomsMin: 3,
        bedroomsMin: 2,
        outdoor: ["balcon", "jardin"],
        parking: true,
        elevator: true,
        dpeMax: "D",
      }),
    ).toEqual({
      type: "appartement",
      price_min_cents: 10_000_000,
      price_max_cents: 40_000_000,
      surface_min: 40,
      surface_max: 90,
      rooms_min: 3,
      bedrooms_min: 2,
      outdoor: ["balcony", "garden"],
      parking: true,
      elevator: true,
      dpe_max: "D",
      city: "savigny-sur-orge",
      radius_km: 5,
      center_lat: 48.6769,
      center_lng: 2.3486,
    });
  });

  it("sends a postal code, and no radius without a known centre", () => {
    expect(toSqlFilters({ location: "91600" })).toEqual({ postal_code: "91600" });
    expect(toSqlFilters({ location: "saint-denis", radiusKm: 10 })).toEqual({
      city: "saint-denis",
    });
    expect(toSqlFilters({})).toEqual({});
  });

  it("has an SQL sort for every sort of the page", () => {
    expect(SEARCH_SORTS.map((sort) => SQL_SORT[sort])).toEqual([
      "recent",
      "price_asc",
      "price_desc",
      "surface_desc",
      "price_m2_asc",
    ]);
  });
});
