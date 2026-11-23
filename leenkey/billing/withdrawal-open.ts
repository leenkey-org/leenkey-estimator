import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { canWithdraw, withdrawalLastDay } from "./withdrawal";

// A paid plan of a property still inside its withdrawal period (L1-40, SPEC
// 11) and not renounced: deleting the listing waits for it (DECISIONS.md
// 2026-11-22), since « Renoncer au contrat » lives on the page of the plan of
// a property that is not deleted. The period is the one of L1-40
// (canWithdraw: 14 days, to the next working day), never a figure of its own.

/** The last day the plan may be renounced; null when no plan is in that case. */
export async function openWithdrawal(
  supabase: SupabaseClient<Database>,
  propertyId: string,
  now: Date = new Date(),
): Promise<{ lastDay: Date } | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("activated_at")
    .eq("property_id", propertyId)
    .is("refunded_at", null)
    .is("withdrawal_requested_at", null)
    .gt("amount_paid_cents", 0);
  if (error) throw new Error(`subscriptions: ${error.code}`);
  const open = data
    .filter((subscription) => canWithdraw(subscription.activated_at, now))
    .map((subscription) => withdrawalLastDay(subscription.activated_at))
    .sort((a, b) => b.getTime() - a.getTime());
  return open[0] ? { lastDay: open[0] } : null;
}
