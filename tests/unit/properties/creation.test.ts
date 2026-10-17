import { describe, expect, it } from "vitest";
import { addressSearchUrl, readAddresses, searchFixtures } from "@/core/geo/address-search";
import {
  addressChoiceSchema,
  addressQuerySchema,
  characteristicsSchema,
  missingCharacteristics,
  parseFrenchNumber,
  type Characteristics,
} from "@/lib/validations/property";

// L1-11: creation of a property, steps 1 (address) and 2 (characteristics).

const propertyId = "623efc8b-97d4-4902-ac43-406417498893";

const empty: Characteristics = {
  propertyId,
  type: null,
  surfaceM2: null,
  carrezM2: null,
  rooms: null,
  bedrooms: null,
  floor: null,
  floorsTotal: null,
  buildYear: null,
  isNewBuild: false,
  dpe: null,
  ges: null,
  heating: null,
  features: [],
  chargesMonthlyEuros: null,
  propertyTaxYearlyEuros: null,
  coproLots: null,
};

describe("parseFrenchNumber", () => {
  it("reads the numbers as they are typed in French", () => {
    expect(parseFrenchNumber("68")).toBe(68);
    expect(parseFrenchNumber("68,5")).toBe(68.5);
    expect(parseFrenchNumber(" 1 250 ")).toBe(1250);
    expect(parseFrenchNumber("1 250")).toBe(1250);
    expect(parseFrenchNumber("-1")).toBe(-1);
  });

  it("gives null for an empty field and NaN for anything else", () => {
    expect(parseFrenchNumber("")).toBeNull();
    expect(parseFrenchNumber("  ")).toBeNull();
    for (const text of ["abc", "68 m²", "1,2,3", "6e2"]) {
      expect(parseFrenchNumber(text), text).toBeNaN();
    }
  });
});

describe("characteristicsSchema", () => {
  it("saves a draft with nothing filled in, then a complete property", () => {
    expect(characteristicsSchema.parse(empty)).toEqual(empty);
    const complete = {
      ...empty,
      type: "appartement" as const,
      surfaceM2: 68.5,
      carrezM2: 66,
      rooms: 3,
      bedrooms: 2,
      floor: 3,
      floorsTotal: 5,
      dpe: "C" as const,
      heating: "Individuel gaz" as const,
      features: ["balcony" as const, "elevator" as const],
      chargesMonthlyEuros: 180,
    };
    expect(characteristicsSchema.parse(complete)).toEqual(complete);
    expect(missingCharacteristics(complete)).toEqual([]);
  });

  it("names what a listing still needs", () => {
    expect(missingCharacteristics(empty)).toEqual(["type", "surfaceM2", "rooms"]);
    expect(missingCharacteristics({ type: "terrain", surfaceM2: 500, rooms: 0 })).toEqual([]);
  });

  it("refuses impossible values, with the field", () => {
    const cases: [Partial<Characteristics>, string, string][] = [
      [{ surfaceM2: 0 }, "surfaceM2", "too_small"],
      [{ rooms: 2.5 }, "rooms", "invalid_type"],
      [{ floor: -6 }, "floor", "too_small"],
      [{ buildYear: 3000 }, "buildYear", "too_big"],
      [{ surfaceM2: 50, carrezM2: 60 }, "carrezM2", "custom"],
      [{ rooms: 2, bedrooms: 3 }, "bedrooms", "custom"],
      [{ floor: 6, floorsTotal: 5 }, "floor", "custom"],
    ];
    for (const [values, field, code] of cases) {
      const result = characteristicsSchema.safeParse({ ...empty, ...values });
      expect(result.success, JSON.stringify(values)).toBe(false);
      const issue = result.error?.issues.find((candidate) => candidate.path[0] === field);
      expect(issue?.code, JSON.stringify(values)).toBe(code);
    }
  });

  it("only knows the values of the lists", () => {
    for (const values of [
      { type: "chateau" },
      { dpe: "H" },
      { heating: "Charbon" },
      { features: ["piscine"] },
      { propertyId: "LK-0001" },
    ]) {
      expect(characteristicsSchema.safeParse({ ...empty, ...values }).success).toBe(false);
    }
  });
});

describe("address of step 1", () => {
  it("asks for 3 characters to search, a label to choose", () => {
    expect(addressQuerySchema.safeParse("12").success).toBe(false);
    expect(addressQuerySchema.parse("  12 rue  ")).toBe("12 rue");
    expect(
      addressChoiceSchema.safeParse({ label: "12 Rue de la Gare 91360 Épinay-sur-Orge" }).success,
    ).toBe(true);
    expect(addressChoiceSchema.safeParse({ label: "x", propertyId }).success).toBe(false);
    expect(
      addressChoiceSchema.safeParse({ label: "12 Rue de la Gare", propertyId: "1" }).success,
    ).toBe(false);
  });
});

describe("national address base", () => {
  it("asks for addresses near the launch zone, completed as typed", () => {
    const url = addressSearchUrl("https://data.geopf.fr/geocodage/search", {
      text: "12 rue de la gare",
      near: { lat: 48.6736, lng: 2.3256 },
      limit: 5,
    });
    expect(url.origin + url.pathname).toBe("https://data.geopf.fr/geocodage/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "12 rue de la gare",
      index: "address",
      autocomplete: "1",
      limit: "5",
      lat: "48.6736",
      lon: "2.3256",
    });
  });

  it("reads its answer: point, line, postal code, town; a town alone is left out", () => {
    const answer = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [2.3249, 48.6741] },
          properties: {
            label: "12 Rue de la Gare 91360 Épinay-sur-Orge",
            score: 0.97,
            housenumber: "12",
            name: "12 Rue de la Gare",
            postcode: "91360",
            citycode: "91216",
            city: "Épinay-sur-Orge",
            type: "housenumber",
          },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [2.33, 48.67] },
          properties: {
            label: "Épinay-sur-Orge",
            name: "Épinay-sur-Orge",
            postcode: "91360",
            city: "Épinay-sur-Orge",
            type: "municipality",
          },
        },
        { type: "Feature", geometry: null, properties: { label: "Sans point" } },
      ],
    };
    expect(readAddresses(answer)).toEqual([
      {
        line: "12 Rue de la Gare",
        postalCode: "91360",
        city: "Épinay-sur-Orge",
        label: "12 Rue de la Gare 91360 Épinay-sur-Orge",
        lat: 48.6741,
        lng: 2.3249,
      },
    ]);
    expect(() => readAddresses({ error: "bad request" })).toThrow();
  });

  it("finds the fixtures whatever the accents and the case", () => {
    expect(searchFixtures("12 rue de la gare epinay", 5).map((address) => address.label)).toEqual([
      "12 Rue de la Gare 91360 Épinay-sur-Orge",
    ]);
    expect(searchFixtures("gare", 1)).toHaveLength(1);
    expect(searchFixtures("rue inconnue", 5)).toEqual([]);
  });
});
