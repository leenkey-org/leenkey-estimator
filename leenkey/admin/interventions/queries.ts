import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import type { InterventionReasonCode, InterventionStatus } from "@/leenkey/advisor/interventions";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { fullName, type QueryResult } from "../users/queries";

// The interventions of the adviser, for the team (DECISIONS.md 2026-11-23),
// with the admin's session: admin_advisor_interventions checks is_admin().
// What waits first (the oldest first), then the others (the latest first);
// the initial appointment of a plan in force that is neither scheduled nor
// done has no row yet (id null). Each read calls requireAdmin() too.

type Enums = Database["public"]["Enums"];

export type AdminIntervention = {
  /** Null: the initial appointment of the property, still to plan. */
  id: string | null;
  propertyId: string;
  reason: InterventionReasonCode;
  /** What the seller wrote; null for the initial appointment or an anonymised account. */
  message: string | null;
  status: InterventionStatus;
  /** When it was asked; for an initial appointment to plan, when the plan began. */
  requestedAt: string | null;
  doneAt: string | null;
  doneByFirstName: string | null;
  teamNote: string | null;
  sellerId: string;
  sellerName: string | null;
  reference: string | null;
  listingTitle: string | null;
  propertyType: Enums["property_type"] | null;
  rooms: number | null;
  city: string | null;
  coverPath: string | null;
  plan: Enums["plan_code"];
  /** Interventions the plan in force sells; null once it sells none (ended, refunded). */
  quota: number | null;
  used: number;
  /** The conversation with the seller, where the date is agreed. */
  conversationId: string | null;
  /**
   * The order of a plan without immediate start, whose adviser waits for the
   * end of the withdrawal (SPEC 11); null once started.
   */
  orderedAt: string | null;
};

const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);

/** Every intervention, for the list of the back office (cached for the request). */
export const adminInterventions = cache(async (): Promise<QueryResult<AdminIntervention[]>> => {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_advisor_interventions");
  if (error) {
    console.error("[admin] advisor interventions read failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  // Generated types declare the columns of a function result as never null.
  return {
    ok: true,
    data: data.map((row) => ({
      id: row.id as string | null,
      propertyId: row.property_id,
      reason: row.reason,
      message: row.message as string | null,
      status: row.status,
      requestedAt: iso(row.requested_at as string | null),
      doneAt: iso(row.done_at as string | null),
      doneByFirstName: (row.done_by_first_name as string | null)?.trim() || null,
      teamNote: row.team_note as string | null,
      sellerId: row.seller_id,
      sellerName: fullName(
        row.seller_first_name as string | null,
        row.seller_last_name as string | null,
      ),
      reference: row.reference as string | null,
      listingTitle: row.listing_title as string | null,
      propertyType: row.property_type as Enums["property_type"] | null,
      rooms: row.rooms as number | null,
      city: row.city as string | null,
      coverPath: row.cover_path as string | null,
      plan: row.plan,
      quota: row.quota as number | null,
      used: row.used ?? 0,
      conversationId: row.conversation_id as string | null,
      orderedAt: iso(row.advisor_ordered_at as string | null),
    })),
  };
});

/**
 * How many interventions wait for the team (the number of the tab
 * « Interventions »), counted by the database without reading the list;
 * null when it cannot be read.
 */
export const adminInterventionsOpen = cache(async (): Promise<number | null> => {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_advisor_interventions_open");
  if (error) {
    console.error("[admin] advisor interventions count failed", { code: error.code });
    return null;
  }
  return data;
});
