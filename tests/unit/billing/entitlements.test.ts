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
  // Comparisons of a plan code that are not rights, counted per file: the
  // Stripe price of an order (one variable per plan), the price shown in the
  // savings simulator of the home page. Any other one fails.
  const ALLOWED: Record<string, number> = {
    "leenkey/billing/prices.ts": 3,
    "leenkey/site/components/home-sections.tsx": 1,
  };
  const PLAN = "(?:autonomie|accompagne|serenite)";
  const Q = "[\"'`]";
  const COMPARISONS = [
    // plan === "serenite", "serenite" != plan
    `[!=]=\\s*${Q}${PLAN}${Q}`,
    `${Q}${PLAN}${Q}\\s*[!=]=`,
    // case "accompagne":
    `case\\s+${Q}${PLAN}${Q}`,
    // ["accompagne", "serenite"].includes(plan), new Set([...]).has(plan)
    `\\[\\s*${Q}${PLAN}${Q}[^\\]]*\\]\\s*\\)?\\s*\\.(?:includes|has|indexOf)\\(`,
    // .includes("serenite")
    `\\.(?:includes|has)\\(\\s*${Q}${PLAN}${Q}`,
    // .eq("plan", "serenite"), .in("plan", ["serenite"])
    `\\.(?:eq|neq|in)\\(\\s*${Q}plan${Q}\\s*,\\s*\\[?\\s*${Q}${PLAN}${Q}`,
    // { serenite: true }[plan]
    `\\{\\s*${PLAN}\\s*:[^}]*\\}\\s*\\)?\\s*\\[`,
  ].map((source) => new RegExp(source, "g"));

  function count(text: string): number {
    return COMPARISONS.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0);
  }

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sources(path);
      return /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
  }

  it("in app, components, core, emails, leenkey, lib and the middleware", () => {
    const files = ["app", "components", "core", "emails", "leenkey", "lib"]
      .flatMap(sources)
      .concat("middleware.ts");
    const found = Object.fromEntries(
      files
        .map((file) => [file, count(readFileSync(file, "utf8"))] as const)
        .filter(([, n]) => n > 0),
    );
    expect(found).toEqual(ALLOWED);
  });

  it("the check finds the comparisons written in other ways", () => {
    for (const code of [
      'if (plan === "serenite") return true;',
      'if (plan == "serenite") return true;',
      "case 'accompagne':",
      '["accompagne", "serenite"].includes(plan)',
      'new Set(["accompagne"]).has(plan)',
      'supabase.from("subscriptions").eq("plan", "serenite")',
      '.in("plan", ["accompagne", "serenite"])',
      "({ serenite: true })[plan]",
    ]) {
      expect(count(code), code).toBeGreaterThan(0);
    }
    expect(count('hasEntitlement(property.id, "advisor")')).toBe(0);
    expect(count('.eq("plan", progress.plan)')).toBe(0);
    expect(count('z.enum(["autonomie", "accompagne", "serenite"])')).toBe(0);
  });
});

describe("the comparison table follows the rights of the plans", () => {
  it("each row with a feature is ticked from plan_entitlements of the seed", async () => {
    const { readFileSync: read } = await import("node:fs");
    const { fr } = await import("@/lib/i18n/fr");
    const { rowIncluded } = await import("@/leenkey/billing/components/plan-comparison");
    const seed = read("supabase/seed/01_plans.sql", "utf8");
    // The rights of the seed: plans × features, then Sérénité × its own.
    type Code = "autonomie" | "accompagne" | "serenite";
    const block = seed.slice(
      seed.indexOf("create temporary table seed_entitlements"),
      seed.indexOf("insert into public.plan_entitlements"),
    );
    const values = (text: string) => [...text.matchAll(/\('([a-z_]+)'\)/g)].map((m) => m[1]);
    const features = new Map<Code, Set<string>>();
    const add = (plan: string, list: string[]) =>
      features.set(plan as Code, new Set([...(features.get(plan as Code) ?? []), ...list]));
    for (const part of block.split("union all")) {
      const single = part.match(/select '([a-z]+)'::public\.plan_code/);
      if (single) {
        add(single[1], values(part));
      } else {
        const [plans, list] = part.split("as p(plan)");
        for (const plan of values(plans)) add(plan, values(list));
      }
    }
    expect(features.size).toBeGreaterThan(0);
    const ticks = (label: string) =>
      (["autonomie", "accompagne", "serenite"] as const satisfies readonly Code[]).map((plan) =>
        rowIncluded(
          fr.billing.comparison.rows.find((row) => row.label === label)!,
          plan,
          features as Map<Code, Set<never>>,
        ),
      );
    // SPEC-V2 11 bis, the table of the plans.
    expect(fr.billing.comparison.rows).toHaveLength(18);
    expect(ticks("Publication sur Leenkey")).toEqual([true, true, true]);
    expect(ticks("Conseiller dédié")).toEqual([false, true, true]);
    expect(ticks("Aide à la décision jusqu'à l'acceptation d'une offre")).toEqual([
      false,
      true,
      true,
    ]);
    expect(ticks("Préparation du dossier de vente")).toEqual([false, false, true]);
    expect(ticks("Suivi jusqu'à la signature")).toEqual([false, false, true]);
  });
});
