"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import {
  issuePaths,
  offerBuyerSchema,
  offerConditionsSchema,
  offerDeclarationsSchema,
  offerFinancingSchema,
  offerPriceSchema,
  offerValiditySchema,
  type OfferStep,
} from "@/lib/validations/offer";
import { writeIdentity, writeSci } from "./content";

// The draft of an offer saved step by step, then sent (L2-03, SPEC-V2 13),
// with the session of the buyer: RLS lets them write their own draft only,
// and only the columns of its content (column grants of `offers`); reference,
// version, seller and status belong to the database. Sending goes through
// offer_submit, which checks the whole offer again, photographs the property
// and freezes it (offers_freeze_after_submit). No service role.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OfferUpdate = Database["public"]["Tables"]["offers"]["Update"];
type OfferInsert = Database["public"]["Tables"]["offers"]["Insert"];

export type SaveOfferStepResult =
  | { ok: true; data: { offerId: string } }
  | {
      ok: false;
      error: "auth" | "invalid" | "closed" | "unavailable";
      /** Dotted paths of the fields in error (« coBuyers.0.email »). */
      fields?: string[];
    };

const cents = (euros: number | null) => (euros === null ? 0 : euros * 100);

/** The columns a step writes, or the paths of its fields in error. */
function columnsOf(step: OfferStep, input: unknown): OfferUpdate | { fields: string[] } {
  switch (step) {
    case "buyer": {
      const parsed = offerBuyerSchema.safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      const value = parsed.data;
      return {
        buyer_identity: writeIdentity(value.identity),
        co_buyers: value.coBuyers.map(writeIdentity),
        acquisition_mode: value.acquisitionMode,
        acquisition_mode_other:
          value.acquisitionMode === "other" ? value.acquisitionModeOther : null,
        sci_details: value.acquisitionMode === "sci" ? writeSci(value.sci) : null,
      };
    }
    case "price": {
      const parsed = offerPriceSchema.safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      return { price_cents: parsed.data.priceEuros * 100 };
    }
    case "financing": {
      const parsed = offerFinancingSchema.safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      const value = parsed.data;
      return {
        financing_mode: value.mode,
        down_payment_cents: cents(value.downPaymentEuros),
        loan_amount_cents: cents(value.loanAmountEuros),
        loan_duration_years: value.loanDurationYears,
        loan_rate_max_pct: value.loanRateMaxPct,
        lender_name: value.lenderName || null,
        financing_progress: value.progress,
        financing_progress_other: value.progress === "other" ? value.progressOther : null,
      };
    }
    case "conditions": {
      const parsed = offerConditionsSchema.safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      const value = parsed.data;
      return {
        condition_prior_sale: value.priorSale,
        condition_authorization: value.authorization,
        condition_other: value.other,
        conditions_details: value.details || null,
      };
    }
    case "validity": {
      const parsed = offerValiditySchema().safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      return { validity_until: parsed.data.validityUntil };
    }
    case "declarations": {
      const parsed = offerDeclarationsSchema.safeParse(input);
      if (!parsed.success) return { fields: issuePaths(parsed.error) };
      return {
        visited: parsed.data.visited,
        declarations: {
          accuracy: true,
          price_and_financing_checked: true,
          legal_effects_understood: true,
          info_read: true,
        },
      };
    }
    // The property is read from the listing: nothing to save.
    case "property":
      return { fields: [] };
  }
}

/**
 * Saves a step of the draft of the session on this listing. The first step
 * creates the draft, with its reference. A step changed after the
 * declarations unticks them: what was declared is no longer what is written.
 */
export async function saveOfferStep(
  listingId: string,
  step: OfferStep,
  input: unknown,
): Promise<SaveOfferStepResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(listingId)) return { ok: false, error: "invalid" };
  const columns = columnsOf(step, input);
  if ("fields" in columns) return { ok: false, error: "invalid", fields: columns.fields };
  const values: OfferUpdate = step === "declarations" ? columns : { ...columns, declarations: {} };

  const supabase = await createClient();
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

  if (!draft.data) {
    // Only the first step starts an offer.
    if (step !== "buyer") return { ok: false, error: "invalid" };
    // Reference and seller are written by the database (offers_before_insert):
    // a client has no right on these columns, which the generated type requires.
    const row: Omit<OfferInsert, "reference" | "seller_id"> = {
      ...values,
      listing_id: listingId,
      buyer_id: profile.id,
    };
    const created = await supabase
      .from("offers")
      .insert(row as OfferInsert)
      .select("id")
      .maybeSingle();
    if (created.error || !created.data) {
      // 42501: the policy said no (offer_can_draft): the listing is no longer
      // online, an offer was accepted meanwhile, the account is suspended.
      const refused = created.error?.code === "42501";
      if (!refused) {
        console.error("[offers] draft not created", {
          user_id: profile.id,
          entity_id: listingId,
          code: created.error?.code,
        });
      }
      return { ok: false, error: refused ? "closed" : "unavailable" };
    }
    revalidatePath("/offres/nouvelle");
    return { ok: true, data: { offerId: created.data.id } };
  }

  const saved = await supabase
    .from("offers")
    .update(values)
    .eq("id", draft.data.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data) {
    console.error("[offers] draft not saved", {
      user_id: profile.id,
      entity_id: draft.data.id,
      code: saved.error?.code,
    });
    return { ok: false, error: saved.error ? "unavailable" : "closed" };
  }
  revalidatePath("/offres/nouvelle");
  return { ok: true, data: { offerId: saved.data.id } };
}

export type SubmitOfferResult =
  | { ok: true; data: { offerId: string } }
  | { ok: false; error: "auth" | "incomplete" | "validity" | "closed" | "unavailable" };

/**
 * Sends the offer to the seller (offer_submit): from then on its content is
 * frozen. Refused when it is incomplete, when its validity is no longer from
 * 2 to 10 days, or when the listing no longer takes offers.
 */
export async function submitOffer(offerId: string): Promise<SubmitOfferResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(offerId)) return { ok: false, error: "closed" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_submit", { p_offer_id: offerId });
  if (error) {
    if (error.code === "22023") {
      return { ok: false, error: error.message.includes("validity") ? "validity" : "incomplete" };
    }
    if (error.code === "42501") return { ok: false, error: "closed" };
    console.error("[offers] offer not sent", {
      user_id: profile.id,
      entity_id: offerId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/offres", "layout");
  revalidatePath("/acquereur", "layout");
  return { ok: true, data: { offerId } };
}
