"use server";

import { createHmac } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getProfile } from "@/core/auth/session";
import { clientAddress } from "@/lib/client-address";
import { rateLimitKeys } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { issuePaths, offerAnswerSchema, offerPrecontractSchema } from "@/lib/validations/offer";

// What a seller does with an offer received (L2-04a, SPEC-V2 13): opening it
// (« Consultée »), accepting it (never in one click: the acceptance screen,
// its box ticked) or declining it, with an optional message. The database
// decides (offer_mark_viewed, offer_answer): the offer is theirs, still
// waiting, not expired at the moment of the click. No service role.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The first opening of an offer by its seller; a failure is logged, never shown. */
export async function markOfferViewed(offerId: string): Promise<{ ok: boolean }> {
  const profile = await getProfile();
  if (!profile || !UUID.test(offerId)) return { ok: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("offer_mark_viewed", { p_offer_id: offerId });
  if (error) {
    // 42501: not an offer of this seller (its buyer opened the page): nothing to do.
    if (error.code !== "42501") {
      console.error("[offers] offer not marked viewed", {
        user_id: profile.id,
        entity_id: offerId,
        code: error.code,
      });
    }
    return { ok: false };
  }
  if (data === "viewed") revalidatePath("/offres", "layout");
  return { ok: true };
}

/** The address of the seller when they accept, as a keyed hash; null without the key or the address. */
async function acceptanceAddressHash(): Promise<string | null> {
  const address = clientAddress(await headers());
  const keys = rateLimitKeys();
  if (!address || !keys) return null;
  return createHmac("sha256", keys.hashKey).update(`offer-acceptance:${address}`).digest("hex");
}

export type AnswerOfferResult =
  | { ok: true; data: { status: "accepted" | "declined" } }
  | {
      ok: false;
      error: "auth" | "invalid" | "expired" | "answered" | "off_sale" | "unavailable";
    };

export async function answerOffer(input: unknown): Promise<AnswerOfferResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = offerAnswerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { offerId, accept, message } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("offer_answer", {
    p_offer_id: offerId,
    p_accept: accept,
    p_confirmed_read: accept,
    p_message: message || undefined,
    p_ip_hash: accept ? ((await acceptanceAddressHash()) ?? undefined) : undefined,
  });
  if (error) {
    if (error.code === "22023") {
      return {
        ok: false,
        error: error.message.includes("not on sale")
          ? "off_sale"
          : error.message.startsWith("cannot")
            ? "answered"
            : "invalid",
      };
    }
    // 42501: not an offer of this seller, or a suspended account.
    if (error.code === "42501") return { ok: false, error: "answered" };
    console.error("[offers] offer not answered", {
      user_id: profile.id,
      entity_id: offerId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/offres", "layout");
  revalidatePath("/vendeur", "layout");
  // Past its validity at the moment of the click: written expired, no answer.
  if (data !== "accepted" && data !== "declined") return { ok: false, error: "expired" };
  return { ok: true, data: { status: data } };
}

export type RecordPrecontractResult =
  | { ok: true; data: null }
  | {
      ok: false;
      error: "auth" | "invalid" | "closed" | "unavailable";
      /** The field in error. */
      field?: "signedAt" | "notifiedAt";
    };

/**
 * The avant-contrat of an accepted offer (L2-04b, SPEC-V2 13): the day it was
 * signed and, when the seller knows it, the day it was notified or handed to
 * the buyer. Recorded again to correct it. The database checks that the offer
 * is theirs and accepted, and the dates (offer_record_precontract).
 */
export async function recordPrecontract(input: unknown): Promise<RecordPrecontractResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = offerPrecontractSchema.safeParse(input);
  if (!parsed.success) {
    const paths = issuePaths(parsed.error);
    return {
      ok: false,
      error: "invalid",
      field: paths.includes("signedAt")
        ? "signedAt"
        : paths.includes("notifiedAt")
          ? "notifiedAt"
          : undefined,
    };
  }
  const { offerId, signedAt, notifiedAt } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("offer_record_precontract", {
    p_offer_id: offerId,
    p_signed_at: signedAt,
    p_withdrawal_start: notifiedAt || undefined,
  });
  if (error) {
    if (error.code === "22023") {
      // « cannot record… »: no longer accepted; otherwise one of the two dates.
      if (error.message.startsWith("cannot")) return { ok: false, error: "closed" };
      return {
        ok: false,
        error: "invalid",
        field: error.message.includes("withdrawal period") ? "notifiedAt" : "signedAt",
      };
    }
    if (error.code === "42501") return { ok: false, error: "closed" };
    console.error("[offers] avant-contrat not recorded", {
      user_id: profile.id,
      entity_id: offerId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  revalidatePath("/offres", "layout");
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: null };
}
