import { describe, expect, it } from "vitest";
import {
  categoryFilters,
  HOME_CATEGORIES,
  isNewListing,
  listingCategories,
} from "@/leenkey/site/home-categories";
import {
  AGENCY_RATE_BASIS_POINTS,
  DEFAULT_SAVINGS_PRICE_EUROS,
  SAVINGS_PRICES_EUROS,
  savings,
} from "@/leenkey/site/savings";
import { departmentOf, readValuationAddress, valuationHref } from "@/leenkey/site/valuation-entry";
import { fr } from "@/lib/i18n/fr";
import { parseSearchParams, searchHref } from "@/lib/validations/search";

// The home page of direction C (docs/design-handoff/SPECS.md, DECISIONS 2026-10-26).

const home = fr.site.home;

describe("« Combien vous économisez avec Leenkey »", () => {
  it("5 % of the price, minus the Accompagné plan, the hypothesis said on the page", () => {
    expect(AGENCY_RATE_BASIS_POINTS).toBe(500);
    expect(savings(34_000_000, 99_000)).toEqual({
      agencyCents: 1_700_000,
      savedCents: 1_601_000,
      planBarPercent: (99_000 / 1_700_000) * 100,
    });
    expect(home.savings.agency).toContain("hypothèse");
    expect(home.savings.agency).toMatch(/5\u202f%/);
  });

  it("the four prices of the mock-up, 340 000 € first", () => {
    expect(SAVINGS_PRICES_EUROS).toEqual([250_000, 340_000, 450_000, 600_000]);
    expect(DEFAULT_SAVINGS_PRICE_EUROS).toBe(340_000);
  });

  it("never a negative saving, the bar of the plan visible but never wider than the agency", () => {
    expect(savings(1_000_000, 99_000).savedCents).toBe(0);
    expect(savings(1_000_000, 99_000).planBarPercent).toBe(100);
    expect(savings(1_000_000_000, 99_000).planBarPercent).toBe(2);
    expect(savings(0, 99_000)).toEqual({ agencyCents: 0, savedCents: 0, planBarPercent: 100 });
  });
});

describe("categories of the listings", () => {
  it("each a filter the search reads back from its address", () => {
    for (const category of HOME_CATEGORIES) {
      const filters = {
        location: "epinay-sur-orge",
        radiusKm: 10 as const,
        ...categoryFilters(category),
      };
      const href = searchHref({ filters });
      const params = Object.fromEntries(new URL(href, "https://leenkey.fr").searchParams);
      expect(parseSearchParams(params).filters, category).toEqual(filters);
    }
  });

  it("a listing in its type, and in « Avec jardin », « Avec parking » when it has them", () => {
    expect(listingCategories({ type: "maison", hasGarden: true, hasParking: null })).toEqual([
      "maison",
      "jardin",
    ]);
    expect(listingCategories({ type: "appartement", hasGarden: false, hasParking: true })).toEqual([
      "appartement",
      "parking",
    ]);
    expect(listingCategories({ type: "autre", hasGarden: null, hasParking: null })).toEqual([]);
  });

  it("« Nouveau »: online for less than seven days of Paris", () => {
    const now = new Date("2026-10-26T10:00:00Z");
    expect(isNewListing("2026-10-25T08:00:00Z", now)).toBe(true);
    // The days of Paris: 20 October at 00:30 there is six days back, the
    // 19th at 23:30 seven.
    expect(isNewListing("2026-10-19T22:30:00Z", now)).toBe(true);
    expect(isNewListing("2026-10-19T21:30:00Z", now)).toBe(false);
    expect(isNewListing(null, now)).toBe(false);
  });

  it("no category without its data (« Plain-pied », « Proche gare » wait)", () => {
    expect(Object.keys(home.listings.category)).toEqual([...HOME_CATEGORIES]);
  });
});

describe("the address of the « Valoriser » tab, into the estimator", () => {
  const chosen = {
    label: "12 Rue de la Gare 91360 Épinay-sur-Orge",
    postalCode: "91360",
    city: "Épinay-sur-Orge",
    department: "91",
  };

  it("goes through the address of /estimer and comes back the same", () => {
    const href = valuationHref(chosen);
    expect(href).toMatch(/^\/estimer\?adresse=/);
    expect(readValuationAddress(new URL(href, "https://leenkey.fr").searchParams)).toEqual(chosen);
  });

  it("a text typed without a suggestion chosen: the estimator alone, which asks it", () => {
    const typed = { label: "12 rue de la gare", postalCode: "", city: "", department: "" };
    expect(valuationHref(typed)).toBe("/estimer");
    expect(valuationHref(null)).toBe("/estimer");
  });

  it("an address that is not a whole one is not read", () => {
    const params = (values: Record<string, string>) => new URLSearchParams(values);
    const whole = { adresse: chosen.label, cp: "91360", ville: chosen.city };
    expect(readValuationAddress(params(whole))).toEqual(chosen);
    expect(readValuationAddress(params({ ...whole, cp: "9136" }))).toBeNull();
    expect(readValuationAddress(params({ ...whole, ville: "" }))).toBeNull();
    expect(readValuationAddress(params({ ...whole, adresse: "ab" }))).toBeNull();
    expect(readValuationAddress(params({ ...whole, adresse: "x".repeat(201) }))).toBeNull();
    expect(readValuationAddress(params({}))).toBeNull();
    // The label must end with its postal code and its city.
    expect(readValuationAddress(params({ ...whole, cp: "75011" }))).toBeNull();
  });

  it("the department comes from the postal code, never from the address of the page", () => {
    // A department given by a link is ignored: the prices of Paris never reach Épinay.
    const params = new URLSearchParams({
      adresse: chosen.label,
      cp: "91360",
      ville: chosen.city,
      dep: "75",
    });
    expect(readValuationAddress(params)?.department).toBe("91");
    expect(departmentOf("75011")).toBe("75");
    expect(departmentOf("20090")).toBe("2A");
    expect(departmentOf("20600")).toBe("2B");
    expect(departmentOf("97400")).toBe("974");
    expect(departmentOf("00100")).toBeNull();
    expect(departmentOf("9136")).toBeNull();
  });
});

describe("texts of the home page of direction C", () => {
  it("« Valoriser mon bien », never « Estimer mon bien » (CLAUDE.md section 16)", () => {
    expect(home.search.tabs.valuation).toBe("Valoriser mon bien");
    expect(JSON.stringify(home)).not.toMatch(/Estimer mon bien|Obtenir mon estimation/);
  });

  it("the badge and the sentence of the hero of the mock-up, the title of the site", () => {
    expect(home.hero.badge).toBe("Ni agence, ni seul · 0 € de commission");
    expect(home.hero.title).toBe("Leenkey vous donne les clés de votre vente.");
  });

  it("« Voir les 12 biens », one listing alone named as such", () => {
    expect(home.listings.all(12, "12")).toBe("Voir les 12 biens");
    expect(home.listings.all(1, "1")).toBe("Voir le bien");
    expect(home.listings.page(1, 3)).toBe("1 / 3");
  });
});
