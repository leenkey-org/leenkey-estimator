import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// The rights of a plan (SPEC-V2 11 bis, CLAUDE.md 14): a right of the plan in
// force of a property is read in plan_entitlements, through has_entitlement
// (L1-33), never deduced from the name of the plan. The essential steps of a
// sale (publish, exchange, visit, receive, accept or refuse an offer,
// finalise) never depend on one.

export type PlanFeature = Database["public"]["Enums"]["plan_feature"];

/**
 * Whether the plan in force of a property includes `feature`, for its owner
 * or an admin (the session of the request); false for anyone else, and when
 * it cannot be read: a right is never granted on an error.
 */
export async function hasEntitlement(propertyId: string, feature: PlanFeature): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_entitlement", {
    p_property: propertyId,
    p_feature: feature,
  });
  if (error) {
    console.error("[billing] entitlement read failed", {
      entity_id: propertyId,
      feature,
      code: error.code,
    });
    return false;
  }
  return data === true;
}
