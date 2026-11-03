import "server-only";
import { allPlans, type ActivePlan } from "@/core/billing/plans";
import { chooseProperty } from "@/leenkey/properties/dashboard";
import { sellerProperties } from "@/leenkey/properties/queries";
import { propertyName } from "@/leenkey/properties/sheet";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// Reads of /vendeur/formule (L1-26, SPEC-V2 8.8), with the seller's session:
// the RLS gives them their properties and their subscriptions; the plan in
// force is property_current_plan, as the rights read it (an ended plan is
// already back to Autonomie, before the cron of L1-40 moves the sale).

type PlanCode = Database["public"]["Enums"]["plan_code"];
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type PlanPage = {
  property: { id: string; name: string; reference: string | null; status: ListingStatus | null };
  /** The other properties of the seller, to choose the plan of another one. */
  others: { id: string; name: string }[];
  /** The plans on sale, and the one in force even when withdrawn from sale. */
  plans: ActivePlan[];
  /** The price of every plan, on sale or not: what a passage costs. */
  prices: { code: PlanCode; name: string; priceCents: number }[];
  current: PlanCode;
  /** The paid plan in force: since when, until when, immediate start asked. */
  active: {
    plan: PlanCode;
    activatedAt: string;
    endsAt: string | null;
    earlyStart: boolean;
  } | null;
};

/** The plans of a property of the seller: the one asked (?bien=), else the one of « Ma vente ». */
export async function planPage(
  profileId: string,
  requested: string | null,
): Promise<QueryResult<PlanPage | null>> {
  const [properties, plans] = await Promise.all([sellerProperties(profileId), allPlans()]);
  if (!properties.ok || !plans) return { ok: false, error: "unavailable" };
  const property = chooseProperty(properties.data, requested);
  if (!property) return { ok: true, data: null };
  try {
    const supabase = await createClient();
    const [progress, subscription] = await Promise.all([
      supabase.rpc("property_current_plan", { p: property.id }),
      supabase
        .from("subscriptions")
        .select("plan, activated_at, ends_at, early_start_requested_at")
        .eq("property_id", property.id)
        .is("replaced_by", null)
        .is("refunded_at", null)
        .gt("ends_at", new Date().toISOString())
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (progress.error) throw new Error(`property_current_plan: ${progress.error.code}`);
    if (subscription.error) throw new Error(`subscriptions: ${subscription.error.code}`);
    const current = progress.data ?? "autonomie";
    const active = subscription.data;
    return {
      ok: true,
      data: {
        property: {
          id: property.id,
          name: propertyName(property),
          reference: property.listing?.reference ?? null,
          status: property.listingStatus,
        },
        others: properties.data
          .filter((other) => other.id !== property.id && other.listingStatus !== "sold")
          .map((other) => ({ id: other.id, name: propertyName(other) })),
        plans: plans
          .filter((plan) => plan.active || plan.code === current)
          .map(({ active: _active, ...plan }) => plan),
        prices: plans.map((plan) => ({
          code: plan.code,
          name: plan.name,
          priceCents: plan.priceCents,
        })),
        current,
        active:
          active && active.plan === current
            ? {
                plan: active.plan,
                activatedAt: active.activated_at,
                endsAt: active.ends_at,
                earlyStart: active.early_start_requested_at !== null,
              }
            : null,
      },
    };
  } catch (error) {
    console.error("[billing] plan page read failed", {
      user_id: profileId,
      entity_id: property.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
