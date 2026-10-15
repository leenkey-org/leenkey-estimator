import { describe, expect, it } from "vitest";
import { computeEstimation } from "@/leenkey/estimator/estimation";
import { cases } from "./cases";

// Frozen outputs of the V1 engine. A diff here means the valuation changed:
// never update the snapshot without explaining the difference in the PR.
describe("estimation engine non-regression", () => {
  it("covers every property type", () => {
    const types = new Set<string>(cases.map((c) => c.form.type ?? "none"));
    for (const t of [
      "appartement",
      "maison",
      "terrain",
      "local_commercial",
      "immeuble",
      "atypique",
    ]) {
      expect(types.has(t)).toBe(true);
    }
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  it.each(cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    expect(computeEstimation(c.form, c.dvfPrixM2)).toMatchSnapshot();
  });

  // DECISIONS Q29: the works budget of an atypical property is deducted up to
  // 70 % of its value before works, so no budget brings it down to 0 €.
  it("an atypical property to restore keeps a value whatever the works budget", () => {
    const chateau = cases.find((c) => c.name.startsWith("atypique château"));
    expect(chateau).toBeDefined();
    if (!chateau) return;
    const declared = computeEstimation(chateau.form, chateau.dvfPrixM2);
    const huge = computeEstimation(
      { ...chateau.form, travaux_budget: 10_000_000 },
      chateau.dvfPrixM2,
    );
    expect(huge.prixEstime).toBeGreaterThan(0);
    expect(huge.prixEstime).toBe(declared.prixEstime);
  });
});
