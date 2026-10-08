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
});
