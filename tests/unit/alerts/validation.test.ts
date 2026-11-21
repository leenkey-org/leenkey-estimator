import { describe, expect, it } from "vitest";
import { alertSummary } from "@/leenkey/alerts/presentation";
import {
  ALERT_NAME_MAX,
  alertCriteriaSchema,
  createAlertSchema,
  defaultAlertName,
  hasCriterion,
  readAlertCriteria,
  renameAlertSchema,
} from "@/lib/validations/alert";
import { parseSearchParams } from "@/lib/validations/search";

// L3-06 (SPEC-V2 16): what an alert keeps. Its name, 1 to 80 characters
// trimmed; its criteria, the stored form of the filters of the search page,
// one at least.

const criteria = { location: "savigny-sur-orge", radiusKm: 5, priceMaxCents: 40_000_000 } as const;

describe("alert validation", () => {
  it("takes a name of 1 to 80 characters, trimmed", () => {
    const parse = (name: string) => createAlertSchema.safeParse({ name, criteria });
    expect(parse("  Savigny  ")).toMatchObject({ success: true, data: { name: "Savigny" } });
    expect(parse("x".repeat(ALERT_NAME_MAX)).success).toBe(true);
    expect(parse("x".repeat(ALERT_NAME_MAX + 1)).success).toBe(false);
    expect(parse("   ").success).toBe(false);
    expect(renameAlertSchema.safeParse({ id: "not-an-id", name: "Savigny" }).success).toBe(false);
  });

  it("takes the filters the search page reads from its address", () => {
    const { filters } = parseSearchParams({
      ville: "Savigny sur Orge",
      rayon: "5",
      budget_max: "400 000",
      exterieur: "jardin",
    });
    expect(alertCriteriaSchema.safeParse(filters)).toMatchObject({
      success: true,
      data: {
        location: "savigny-sur-orge",
        radiusKm: 5,
        priceMaxCents: 40_000_000,
        outdoor: ["jardin"],
      },
    });
    // Stored as JSON and read back: the same search.
    expect(readAlertCriteria(JSON.parse(JSON.stringify(filters)))).toEqual(filters);
  });

  it("refuses an alert without any criterion, and what is not a search", () => {
    expect(hasCriterion({})).toBe(false);
    expect(hasCriterion({ type: undefined })).toBe(false);
    expect(hasCriterion({ parking: true })).toBe(true);
    expect(createAlertSchema.safeParse({ name: "Tout", criteria: {} }).success).toBe(false);
    // A sort or a page are no criteria: not in the stored form.
    expect(alertCriteriaSchema.safeParse({ ...criteria, sort: "recent" }).success).toBe(false);
    expect(alertCriteriaSchema.safeParse({ radiusKm: 5 }).success).toBe(false);
    expect(alertCriteriaSchema.safeParse({ priceMinCents: 2, priceMaxCents: 1 }).success).toBe(
      false,
    );
    expect(readAlertCriteria({ city: "Effaceville" })).toBeNull();
    expect(readAlertCriteria(null)).toBeNull();
  });

  it("proposes a name from the criteria, 80 characters at most", () => {
    const summary = alertSummary({ ...criteria, type: "maison" });
    expect(summary).toEqual(["Savigny-sur-Orge", "5\u00A0km", "Maisons", "≤ 400\u202Fk€"]);
    expect(defaultAlertName(summary)).toBe(
      "Savigny-sur-Orge · 5\u00A0km · Maisons · ≤ 400\u202Fk€",
    );
    const long = defaultAlertName(Array.from({ length: 30 }, () => "Critère"));
    expect(long.length).toBeLessThanOrEqual(ALERT_NAME_MAX);
    expect(long.endsWith("…")).toBe(true);
    // A commune whose centre the site does not know is searched alone: no radius said.
    expect(alertSummary({ location: "trifouilly", radiusKm: 5 })).toEqual(["Trifouilly"]);
    expect(alertSummary({ parking: true })).toEqual(["Avec parking"]);
  });
});
