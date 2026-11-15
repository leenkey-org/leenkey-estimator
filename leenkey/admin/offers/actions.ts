"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { offerAnalysedSchema } from "@/lib/validations/admin";
import { moderationError, type ModerationError } from "../moderation";

// « Marquer comme analysée » (L2-07, SPEC-V2 section 17): the task « Offre
// analysée avec le conseiller » of the sale, ticked by the team from the
// sheet of an offer. The SQL function checks is_admin() and the right of the
// plan (plan_entitlements, never a plan name), refuses a second tick (a stale
// tab) and writes audit_log. No service role.

export type OfferAnalysedResult = { ok: true } | { ok: false; error: ModerationError };

export async function markOfferAnalysed(input: unknown): Promise<OfferAnalysedResult> {
  const profile = await getProfile();
  if (!profile?.roles.includes("admin")) return { ok: false, error: "forbidden" };
  const parsed = offerAnalysedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_offer_mark_analysed", {
    p_offer: parsed.data.offerId,
  });
  if (error) {
    const reason = moderationError(error.code);
    if (reason === "unavailable") {
      console.error("[admin] offer not marked as analysed", {
        user_id: profile.id,
        entity_id: parsed.data.offerId,
        code: error.code,
      });
    }
    return { ok: false, error: reason };
  }
  revalidatePath("/admin/offres", "layout");
  // The seller reads the task done on its sale.
  revalidatePath("/vendeur", "layout");
  return { ok: true };
}
