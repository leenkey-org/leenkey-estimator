import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  toInterventionSummary,
  type InterventionReasonCode,
  type InterventionStatus,
  type InterventionSummary,
} from "./interventions";

// Interventions of the adviser, for the seller (DECISIONS.md 2026-11-23),
// with their session: the counter of a property (advisor_intervention_summary
// answers its owner and the team only) and their requests (RLS: the owner of
// the property). No service role.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

/** The counter of a property, with the name of its plan as the table plans gives it. */
export type PropertyInterventions = InterventionSummary & { planName: string | null };

/**
 * The counter of the interventions of a property of the account; null when
 * its plan sells none (no adviser, or a plan without interventions). Read
 * once per request.
 */
export const propertyInterventions = cache(
  async (propertyId: string): Promise<QueryResult<PropertyInterventions | null>> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("advisor_intervention_summary", {
      p_property: propertyId,
    });
    if (error) {
      console.error("[advisor] interventions summary read failed", {
        entity_id: propertyId,
        code: error.code,
      });
      return { ok: false, error: "unavailable" };
    }
    // Generated types declare the columns of a function result as never null.
    const row = data[0] as
      | (Parameters<typeof toInterventionSummary>[0] & { plan_name: string | null })
      | undefined;
    const summary = toInterventionSummary(row);
    return { ok: true, data: summary ? { ...summary, planName: row?.plan_name ?? null } : null };
  },
);

export type SellerIntervention = {
  id: string;
  reason: InterventionReasonCode;
  /** Null for the initial appointment, which the team plans. */
  message: string | null;
  status: InterventionStatus;
  requestedAt: string;
  doneAt: string | null;
};

/** The interventions of a property of the account, the latest first (never the note of the team). */
export async function sellerInterventions(
  propertyId: string,
): Promise<QueryResult<SellerIntervention[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advisor_interventions")
    .select("id, reason, message, status, requested_at, done_at")
    .eq("property_id", propertyId)
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[advisor] interventions read failed", {
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.map((row) => ({
      id: row.id,
      reason: row.reason,
      message: row.message,
      status: row.status,
      requestedAt: new Date(row.requested_at).toISOString(),
      doneAt: row.done_at ? new Date(row.done_at).toISOString() : null,
    })),
  };
}
