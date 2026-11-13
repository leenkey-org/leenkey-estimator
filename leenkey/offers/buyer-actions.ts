"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

// What a buyer does with an offer sent (L2-04b, SPEC-V2 13): withdrawing it
// while it waits for an answer, and starting a new one from its content
// (« Faire une nouvelle offre »: a new draft, the next version; the offer in
// progress is replaced when the new one is sent). With the session of the
// buyer: the database decides (offer_withdraw, the policies and the column
// grants of `offers`). No service role.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

export type WithdrawOfferResult =
  | { ok: true; data: { status: "withdrawn" } }
  | { ok: false; error: "auth" | "invalid" | "expired" | "answered" | "unavailable" };

/** Withdraws an offer sent and not yet answered; the seller is told at once. */
export async function withdrawOffer(offerId: string): Promise<WithdrawOfferResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(offerId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("offer_withdraw", { p_offer_id: offerId });
  if (error) {
    // 22023: accepted, declined or withdrawn meanwhile; 42501: not their offer.
    if (error.code === "22023" || error.code === "42501") return { ok: false, error: "answered" };
    console.error("[offers] offer not withdrawn", {
      user_id: profile.id,
      entity_id: offerId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/offres", "layout");
  revalidatePath("/acquereur", "layout");
  // Past its validity at the moment of the click: written expired, not withdrawn.
  if (data !== "withdrawn") return { ok: false, error: "expired" };
  return { ok: true, data: { status: "withdrawn" } };
}

/** What a new offer takes from the previous one: its content, never its validity nor its declarations. */
const COPIED =
  "listing_id, buyer_identity, co_buyers, acquisition_mode, acquisition_mode_other, sci_details, price_cents, financing_mode, down_payment_cents, loan_amount_cents, loan_duration_years, loan_rate_max_pct, lender_name, financing_progress, financing_progress_other, condition_prior_sale, condition_authorization, condition_other, conditions_details, visited" as const;

export type StartNewOfferResult =
  | { ok: true; data: { listingId: string } }
  | { ok: false; error: "auth" | "invalid" | "closed" | "unavailable" };

/**
 * « Faire une nouvelle offre »: a new draft on the same listing with the
 * content of this offer of the session. A draft already started on the
 * listing is kept as it is: what the buyer typed is never overwritten.
 */
export async function startNewOffer(offerId: string): Promise<StartNewOfferResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(offerId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const source = await supabase
    .from("offers")
    .select(`${COPIED}, status`)
    .eq("id", offerId)
    .eq("buyer_id", profile.id)
    .maybeSingle();
  if (source.error) {
    console.error("[offers] offer to copy not read", {
      user_id: profile.id,
      entity_id: offerId,
      code: source.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!source.data || source.data.status === "draft") return { ok: false, error: "invalid" };
  const { status: _status, ...content } = source.data;
  const listingId = content.listing_id;

  const draft = await supabase
    .from("offers")
    .select("id")
    .eq("buyer_id", profile.id)
    .eq("listing_id", listingId)
    .eq("status", "draft")
    .maybeSingle();
  if (draft.error) {
    console.error("[offers] draft read failed", {
      user_id: profile.id,
      entity_id: listingId,
      code: draft.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (draft.data) return { ok: true, data: { listingId } };

  // Reference, version and seller are written by the database
  // (offers_before_insert): a client has no right on these columns, which the
  // generated type requires.
  const row: Omit<OfferInsert, "reference" | "seller_id"> = { ...content, buyer_id: profile.id };
  const created = await supabase.from("offers").insert(row as OfferInsert);
  if (created.error) {
    // 42501: the policy said no (offer_can_draft): the listing is no longer
    // online, an offer was accepted meanwhile, the account is suspended.
    // 23505: a draft created by another tab at the same moment: it is there.
    if (created.error.code === "23505") return { ok: true, data: { listingId } };
    const refused = created.error.code === "42501";
    if (!refused) {
      console.error("[offers] new offer not started", {
        user_id: profile.id,
        entity_id: offerId,
        code: created.error.code,
      });
    }
    return { ok: false, error: refused ? "closed" : "unavailable" };
  }
  revalidatePath("/offres/nouvelle");
  revalidatePath("/acquereur", "layout");
  return { ok: true, data: { listingId } };
}
