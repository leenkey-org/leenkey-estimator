import "server-only";
import { listConversations } from "@/leenkey/messaging/queries";
import type { ConversationSummary } from "@/leenkey/messaging/types";
import { createClient } from "@/lib/supabase/server";
import { propertyConversations, weekStart } from "./dashboard";
import type { SaleSituation } from "./next-action";
import type { QueryResult, SellerProperty } from "./queries";
import { saleSituation } from "./sale";

// What « Ma vente » reads of a sale (L1-24), with the session of its seller:
// the situation of the next action (sale.ts), the conversations about the
// property, and the views of its listing over seven days (listing_views,
// daily totals, RLS: its owner).

export type SaleDashboardData = {
  /** null: no progress for this property yet. */
  situation: SaleSituation | null;
  conversations: ConversationSummary[];
  views: { count: number }[];
};

export async function saleDashboard(
  property: SellerProperty,
  now = new Date(),
): Promise<QueryResult<SaleDashboardData>> {
  const supabase = await createClient();
  const [situation, conversations, views] = await Promise.all([
    saleSituation(property),
    listConversations(),
    property.listing
      ? supabase
          .from("listing_views")
          .select("count")
          .eq("listing_id", property.listing.id)
          .gte("day", weekStart(now))
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (!situation.ok || !conversations.ok) return { ok: false, error: "unavailable" };
  if (views.error) {
    console.error("[properties] listing views read failed", {
      entity_id: property.id,
      code: views.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: {
      situation: situation.data,
      conversations: propertyConversations(conversations.data, property.id),
      views: views.data,
    },
  };
}
