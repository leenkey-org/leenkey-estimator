import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { splitDescription, type PlanView } from "./plan-text";

// Plans on sale (table plans, reference data of supabase/seed/01_plans.sql),
// readable by every visitor: the prices and the contents shown come from
// here, never from the code (CLAUDE.md section 5).

export type PlanCode = Database["public"]["Enums"]["plan_code"];

export type ActivePlan = PlanView;

/** A plan, on sale or withdrawn from sale (`active` false). */
export type AnyPlan = PlanView & { active: boolean };

/**
 * Active plans in their order, or null when they cannot be read (database
 * unreachable, or not configured: CI build, PR previews). Read once per
 * request, however many sections of a page ask for them.
 */
export const activePlans = cache(async function activePlans(): Promise<ActivePlan[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("code, name, price_cents, description, features")
      .eq("active", true)
      .order("position");
    if (error) {
      console.error("[billing] plans read failed", { code: error.code });
      return null;
    }
    return data.map((row) => ({
      code: row.code,
      name: row.name,
      priceCents: row.price_cents,
      ...splitDescription(row.description),
      features: row.features,
    }));
  } catch (error) {
    // The signals of Next.js (a page rendered at request time) go through.
    unstable_rethrow(error);
    console.error("[billing] plans read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
});

/**
 * Every plan, on sale or not, or null when they cannot be read. A plan
 * withdrawn from sale still counts for the sellers who hold it: the passage
 * to a dearer one costs the difference with its price (L1-26).
 */
export const allPlans = cache(async function allPlans(): Promise<AnyPlan[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("plans")
      .select("code, name, price_cents, description, features, active")
      .order("position");
    if (error) {
      console.error("[billing] plans read failed", { code: error.code });
      return null;
    }
    return data.map((row) => ({
      code: row.code,
      name: row.name,
      priceCents: row.price_cents,
      ...splitDescription(row.description),
      features: row.features,
      active: row.active,
    }));
  } catch (error) {
    unstable_rethrow(error);
    console.error("[billing] plans read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
});

export type PlanFeature = Database["public"]["Enums"]["plan_feature"];

/**
 * The rights of each plan (table plan_entitlements, reference data of the
 * seed, readable by every visitor): what the comparison table of the plans
 * shows (L1-33), so that it never says other than the rights. Null when they
 * cannot be read.
 */
export const planFeatures = cache(async function planFeatures(): Promise<Map<
  PlanCode,
  Set<PlanFeature>
> | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("plan_entitlements").select("plan, feature");
    if (error) {
      console.error("[billing] plan entitlements read failed", { code: error.code });
      return null;
    }
    const features = new Map<PlanCode, Set<PlanFeature>>();
    for (const row of data) {
      const set = features.get(row.plan) ?? new Set<PlanFeature>();
      set.add(row.feature);
      features.set(row.plan, set);
    }
    return features;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[billing] plan entitlements read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
});
