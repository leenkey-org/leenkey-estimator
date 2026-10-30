"use server";

import { revalidatePath } from "next/cache";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buyerProfileSchema, type BuyerProfileField } from "@/lib/validations/buyer";

// The buying project saved by the buyer (L1-25, SPEC-V2 8.9), with their
// session: they may change only the columns of their project (column grants
// of buyer_profiles), never the status, which the database derives
// (buyer_profiles_compute_status). An account that never bought gets the
// role and its row first (profile_add_role): filling a project is buying.

export type SaveBuyerProfileResult =
  | { ok: true; data: { financingStatus: FinancingStatus } }
  | {
      ok: false;
      error: "auth" | "invalid" | "unavailable";
      fields?: BuyerProfileField[];
    };

const cents = (euros: number | null) => (euros === null ? null : euros * 100);

export async function saveBuyerProfile(input: unknown): Promise<SaveBuyerProfileResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = buyerProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0] as BuyerProfileField)),
    ];
    return { ok: false, error: "invalid", fields };
  }
  const supabase = await createClient();
  if (!profile.roles.includes("buyer")) {
    const role = await supabase.rpc("profile_add_role", { p_role: "buyer" });
    if (role.error) {
      console.error("[buyers] buyer role failed", { user_id: profile.id, code: role.error.code });
      return { ok: false, error: "unavailable" };
    }
  }
  const value = parsed.data;
  const { data, error } = await supabase
    .from("buyer_profiles")
    .update({
      project: value.project,
      target_cities: value.targetCities,
      budget_max_cents: cents(value.budgetMaxEuros),
      down_payment_cents: cents(value.downPaymentEuros),
      loan_needed: value.loanNeeded,
      loan_amount_cents: cents(value.loanAmountEuros),
      situation_note: value.situationNote || null,
    })
    .eq("profile_id", profile.id)
    .select("financing_status")
    .maybeSingle();
  if (error || !data) {
    console.error("[buyers] profile save failed", { user_id: profile.id, code: error?.code });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/acquereur", "layout");
  return { ok: true, data: { financingStatus: data.financing_status } };
}
