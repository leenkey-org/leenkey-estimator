"use server";

import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { claimEstimationSchema } from "@/lib/validations/estimation";

export type ClaimEstimationResult =
  | { ok: true }
  | { ok: false; error: "auth" | "invalid" | "used" | "unavailable" };

/**
 * Attaches an anonymous analysis of value to the signed-in account, with the
 * token this browser kept (estimation_claim, L1-13b). A token works once.
 */
export async function claimEstimation(input: unknown): Promise<ClaimEstimationResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = claimEstimationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("estimation_claim", { p_token: parsed.data.token });
  if (error) {
    // 22023: already attached, or unknown.
    if (error.code === "22023") return { ok: false, error: "used" };
    console.error("[properties] estimation claim failed", {
      user_id: profile.id,
      entity_id: parsed.data.estimationId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // The token of another analysis of this browser: attached, but not this one.
  return data === parsed.data.estimationId ? { ok: true } : { ok: false, error: "used" };
}
