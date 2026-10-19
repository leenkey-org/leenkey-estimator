import "server-only";
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

/**
 * Active plans in their order, or null when they cannot be read (database
 * unreachable, or not configured: CI build, PR previews).
 */
export async function activePlans(): Promise<ActivePlan[] | null> {
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
}
