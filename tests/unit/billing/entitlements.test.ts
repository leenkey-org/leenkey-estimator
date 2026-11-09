import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-33: a right is read in plan_entitlements (hasEntitlement), never deduced
// from the name of a plan (CLAUDE.md 14), and never granted on an error.

const mocks = vi.hoisted(() => ({
  rpc: { data: true as unknown, error: null as { code: string } | null },
  args: [] as unknown[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, args: unknown) => {
      mocks.args.push([fn, args]);
      return mocks.rpc;
    },
  }),
}));

beforeEach(() => {
  mocks.rpc = { data: true, error: null };
  mocks.args = [];
});

describe("hasEntitlement", () => {
  it("asks has_entitlement for the property and the feature", async () => {
    const { hasEntitlement } = await import("@/leenkey/billing/entitlements");
    expect(await hasEntitlement("p1", "advisor")).toBe(true);
    expect(mocks.args).toEqual([["has_entitlement", { p_property: "p1", p_feature: "advisor" }]]);
  });

  it("never grants a right on an error or an unexpected answer", async () => {
    const { hasEntitlement } = await import("@/leenkey/billing/entitlements");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc = { data: null, error: { code: "42501" } };
    expect(await hasEntitlement("p1", "advisor")).toBe(false);
    mocks.rpc = { data: "true", error: null };
    expect(await hasEntitlement("p1", "advisor")).toBe(false);
    log.mockRestore();
  });
});

describe("no right compares the name of a plan", () => {
  // Places where a plan code is compared for something that is not a right:
  // the Stripe price of an order (one variable per plan), the price shown in
  // the savings simulator of the home page.
  const ALLOWED = new Set([
    "leenkey/billing/prices.ts",
    "leenkey/site/components/home-sections.tsx",
  ]);
  const PLAN = "(autonomie|accompagne|serenite)";
  const COMPARISON = new RegExp(
    `[!=]==\\s*["'\`]${PLAN}["'\`]|["'\`]${PLAN}["'\`]\\s*[!=]==|case\\s+["'\`]${PLAN}["'\`]|\\.includes\\(\\s*["'\`]${PLAN}["'\`]`,
  );

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("in app, components, core, leenkey and lib", () => {
    const found = ["app", "components", "core", "leenkey", "lib"]
      .flatMap(sources)
      .filter((file) => !ALLOWED.has(file) && COMPARISON.test(readFileSync(file, "utf8")));
    expect(found).toEqual([]);
  });

  it("the check finds a comparison", () => {
    expect(COMPARISON.test('if (plan === "serenite") return true;')).toBe(true);
    expect(COMPARISON.test("case 'accompagne':")).toBe(true);
    expect(COMPARISON.test('hasEntitlement(property.id, "advisor")')).toBe(false);
  });
});
