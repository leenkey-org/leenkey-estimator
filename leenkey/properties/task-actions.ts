"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saleTaskSchema } from "@/lib/validations/sale-tasks";

// A task of the sale ticked by hand from « Ma vente » (L1-24, SPEC-V2 section
// 9), with the seller's session: RLS lets an active seller tick only the
// tasks without event of the plan of their sale where they act
// (sale_task_is_seller_manual), on a property they may still change. The
// database then moves the sale to its step (sale_task_status_refresh).

export type SaleTaskResult =
  | { ok: true; data: { done: boolean } }
  | { ok: false; error: "auth" | "invalid" | "forbidden" | "unavailable" };

export async function setSaleTaskDone(input: unknown): Promise<SaleTaskResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = saleTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, taskId, done } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("sale_task_status").upsert(
    {
      property_id: propertyId,
      task_id: taskId,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? profile.id : null,
    },
    { onConflict: "property_id,task_id" },
  );
  if (error) {
    // 42501: refused by RLS (not theirs, a task with an event, suspended).
    if (error.code === "42501") return { ok: false, error: "forbidden" };
    console.error("[properties] sale task failed", {
      user_id: profile.id,
      entity_id: propertyId,
      task_id: taskId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: { done } };
}
