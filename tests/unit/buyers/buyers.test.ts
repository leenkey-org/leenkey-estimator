import { describe, expect, it } from "vitest";
import { buyerFile } from "@/leenkey/buyers/file";
import type { BuyerProfile } from "@/leenkey/buyers/queries";
import { searchSummary } from "@/leenkey/search/filter-labels";
import { parseStoredSearch } from "@/leenkey/search/last-search";
import { fr } from "@/lib/i18n/fr";
import { buyerProfileSchema, parseCities } from "@/lib/validations/buyer";
import { parseSearchParams } from "@/lib/validations/search";

const PROFILE: BuyerProfile = {
  project: null,
  targetCities: [],
  budgetMaxEuros: null,
  downPaymentEuros: null,
  loanNeeded: null,
  loanAmountEuros: null,
  situationNote: "",
  financingStatus: "not_provided",
};

describe("parseCities", () => {
  it("splits on commas, semicolons and lines, once each, in the order typed", () => {
    expect(
      parseCities("Savigny-sur-Orge, Juvisy-sur-Orge;  Épinay-sur-Orge\nsavigny-sur-orge ,"),
    ).toEqual(["Savigny-sur-Orge", "Juvisy-sur-Orge", "Épinay-sur-Orge"]);
  });

  it("gives no city for an empty or blank text, and folds inner spaces", () => {
    expect(parseCities("")).toEqual([]);
    expect(parseCities(" , ; ")).toEqual([]);
    expect(parseCities("Viry   Châtillon")).toEqual(["Viry Châtillon"]);
  });
});

describe("buyerProfileSchema", () => {
  const input = {
    project: "investissement" as const,
    targetCities: ["Savigny-sur-Orge"],
    budgetMaxEuros: 300_000,
    downPaymentEuros: 50_000,
    loanNeeded: true,
    loanAmountEuros: 250_000,
    situationNote: "  CDI  ",
  };

  it("keeps a loan amount with a loan, trims the situation", () => {
    expect(buyerProfileSchema.parse(input)).toEqual({ ...input, situationNote: "CDI" });
  });

  it("drops a loan amount without a loan, never keeps it hidden", () => {
    expect(buyerProfileSchema.parse({ ...input, loanNeeded: false }).loanAmountEuros).toBeNull();
    expect(buyerProfileSchema.parse({ ...input, loanNeeded: null }).loanAmountEuros).toBeNull();
  });

  it("refuses cents, negative amounts, an unknown project and too many cities", () => {
    expect(buyerProfileSchema.safeParse({ ...input, budgetMaxEuros: 300_000.5 }).success).toBe(
      false,
    );
    expect(buyerProfileSchema.safeParse({ ...input, downPaymentEuros: -1 }).success).toBe(false);
    expect(buyerProfileSchema.safeParse({ ...input, project: "location" }).success).toBe(false);
    expect(
      buyerProfileSchema.safeParse({
        ...input,
        targetCities: Array.from({ length: 21 }, (_, index) => `Ville ${index}`),
      }).success,
    ).toBe(false);
    expect(buyerProfileSchema.safeParse({ ...input, situationNote: "x".repeat(281) }).success).toBe(
      false,
    );
  });
});

describe("buyerFile", () => {
  it("has nothing done for an account that never bought", () => {
    expect(buyerFile(null)).toEqual({
      steps: [
        { key: "project", done: false },
        { key: "financing", done: false },
      ],
      done: 0,
      total: 2,
      complete: false,
    });
  });

  it("needs a project and a city for its first step", () => {
    expect(buyerFile({ ...PROFILE, project: "residence_principale" }).done).toBe(0);
    expect(
      buyerFile({ ...PROFILE, project: "residence_principale", targetCities: ["Juvisy-sur-Orge"] })
        .done,
    ).toBe(1);
  });

  it("is complete once the financing is declared", () => {
    const file = buyerFile({
      ...PROFILE,
      project: "investissement",
      targetCities: ["Juvisy-sur-Orge"],
      financingStatus: "declared",
    });
    expect(file.complete).toBe(true);
    expect(file.done).toBe(2);
  });
});

describe("searchSummary", () => {
  it("lists the place, the category and the active filters, in that order", () => {
    const { filters } = parseSearchParams(
      new URLSearchParams("type=maison&budget_max=400000&pieces_min=4&parking=1"),
    );
    const summary = searchSummary(filters, "Savigny-sur-Orge");
    expect(summary[0]).toBe("Savigny-sur-Orge");
    expect(summary[1]).toBe(fr.search.categories.maison);
    expect(summary).toContain(fr.search.categories.parking);
    expect(summary.length).toBeGreaterThanOrEqual(5);
  });

  it("is empty for a search without criteria", () => {
    expect(searchSummary(parseSearchParams(new URLSearchParams("")).filters, null)).toEqual([]);
  });
});

describe("parseStoredSearch", () => {
  const at = "2026-10-30T09:00:00.000Z";

  it("reads a search of /acheter and when it was seen", () => {
    const raw = JSON.stringify({ href: "/acheter?type=maison", at });
    expect(parseStoredSearch(raw)).toEqual({ href: "/acheter?type=maison", at });
  });

  it("ignores anything else: no value, broken JSON, another page, a bad date", () => {
    expect(parseStoredSearch(null)).toBeNull();
    expect(parseStoredSearch("{")).toBeNull();
    expect(
      parseStoredSearch(JSON.stringify({ href: "https://evil.example/acheter?x", at })),
    ).toBeNull();
    expect(parseStoredSearch(JSON.stringify({ href: "/compte?x=1", at }))).toBeNull();
    expect(
      parseStoredSearch(JSON.stringify({ href: "/acheter?type=maison", at: "hier" })),
    ).toBeNull();
    expect(parseStoredSearch(JSON.stringify(["/acheter?type=maison", at]))).toBeNull();
  });
});

describe("buyer home texts", () => {
  const home = fr.buyerSpace.home;

  it("counts the new listings, capped at one page", () => {
    expect(home.lastSearch.newCount(1)).toBe("1 nouveau bien");
    expect(home.lastSearch.newCount(3)).toBe("3 nouveaux biens");
    expect(home.lastSearch.newCount(20)).toBe("20 nouveaux biens et plus");
  });

  it("says the steps of the file done, in the singular and the plural", () => {
    expect(home.file.countLabel(0, 2)).toBe("0 étape sur 2 faite");
    expect(home.file.countLabel(2, 2)).toBe("2 étapes sur 2 faites");
  });
});
