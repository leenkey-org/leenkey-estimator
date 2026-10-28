"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saleTaskSchema } from "@/lib/validations/sale-tasks";
import { taskTickable } from "./dashboard";
import { saleProgress } from "./sale";

// A task of the sale ticked by hand from « Ma vente » (L1-24, SPEC-V2 section
// 9), with the seller's session. Here: a task of a step up to the current one,
// on a sale neither suspended nor sold (taskTickable). The RLS then lets an
// active seller write only the tasks without event of the plan of their sale
// where they act (sale_task_is_seller_manual), on a property they may still
// change; the database moves the sale to its step (sale_task_status_refresh).
//
// An update, then an insert when there is no row yet: not an upsert, whose
// ON CONFLICT would set every column it sends, and the seller may only change
// done_at and done_by (column grants of sale_task_status).

export type SaleTaskResult =
  | { ok: true; data: { done: boolean } }
  | { ok: false; error: "auth" | "invalid" | "forbidden" | "unavailable" };

export async function setSaleTaskDone(input: unknown): Promise<SaleTaskResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = saleTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, taskId, done } = parsed.data;
  const context = { user_id: profile.id, entity_id: propertyId, task_id: taskId };
  const supabase = await createClient();

  const [progress, listing] = await Promise.all([
    saleProgress(propertyId),
    supabase.from("listings").select("status").eq("property_id", propertyId).maybeSingle(),
  ]);
  if (!progress.ok || listing.error) {
    console.error("[properties] sale task read failed", { ...context, code: listing.error?.code });
    return { ok: false, error: "unavailable" };
  }
  // Not theirs (RLS shows nothing), or not a task to tick now.
  if (!progress.data || !taskTickable(progress.data, taskId, listing.data?.status ?? null)) {
    return { ok: false, error: "forbidden" };
  }

  const values = {
    done_at: done ? new Date().toISOString() : null,
    done_by: done ? profile.id : null,
  };
  const write = async () => {
    const updated = await supabase
      .from("sale_task_status")
      .update(values)
      .eq("property_id", propertyId)
      .eq("task_id", taskId)
      .select("task_id");
    if (updated.error || updated.data.length > 0) return updated.error;
    // No row yet: a task never ticked (unticking it changes nothing then).
    if (!done) return null;
    const inserted = await supabase
      .from("sale_task_status")
      .insert({ property_id: propertyId, task_id: taskId, ...values });
    return inserted.error;
  };
  let error = await write();
  // Ticked at the same moment in another tab: the row is there now.
  if (error?.code === "23505") error = await write();
  if (error) {
    console.error("[properties] sale task failed", { ...context, code: error.code });
    // 42501: refused by RLS (not theirs, a task with an event, suspended).
    return { ok: false, error: error.code === "42501" ? "forbidden" : "unavailable" };
  }
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: { done } };
}
