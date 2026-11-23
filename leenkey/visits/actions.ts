"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  visitBookSchema,
  visitBuyerFeedbackSchema,
  visitInviteSchema,
  visitSellerFeedbackSchema,
  visitSlotSchema,
} from "@/lib/validations/visit";
import { parisInstant } from "./dates";

// What a seller and a buyer do about a visit (L3-02, SPEC-V2 14). The
// database decides (visit_slot_add, visit_invite, visit_book, visit_cancel,
// with the session of the user): the property is theirs, the buyer has a
// relation with it, the slot is free. The notices, notifications and emails
// follow from its triggers. No service role.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidateVisits(propertyId?: string) {
  if (propertyId) revalidatePath(`/vendeur/biens/${propertyId}/visites`);
  revalidatePath("/visites", "layout");
  revalidatePath("/acquereur");
}

export type SlotError = "auth" | "invalid" | "tooSoon" | "overlap" | "offline" | "unavailable";
export type AddSlotResult =
  | { ok: true; data: { slotId: string } }
  | { ok: false; error: SlotError };

export async function addVisitSlot(input: unknown): Promise<AddSlotResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = visitSlotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, day, time, minutes } = parsed.data;
  const startsAt = parisInstant(day, time);
  if (!startsAt) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visit_slot_add", {
    p_property: propertyId,
    p_starts_at: startsAt.toISOString(),
    p_minutes: minutes,
  });
  if (error) {
    if (error.code === "23P01") return { ok: false, error: "overlap" };
    if (error.code === "22023") {
      return {
        ok: false,
        error: error.message.includes("not online")
          ? "offline"
          : error.message.includes("starts between")
            ? "tooSoon"
            : "invalid",
      };
    }
    if (error.code !== "42501") {
      console.error("[visits] slot not added", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateVisits(propertyId);
  return { ok: true, data: { slotId: data } };
}

export type RemoveSlotResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "booked" | "unavailable" };

export async function removeVisitSlot(
  propertyId: string,
  slotId: string,
): Promise<RemoveSlotResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(slotId) || !UUID.test(propertyId)) return { ok: false, error: "unavailable" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("visit_slot_remove", { p_slot: slotId });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "booked" };
    if (error.code !== "42501") {
      console.error("[visits] slot not removed", {
        user_id: profile.id,
        entity_id: slotId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateVisits(propertyId);
  return { ok: true, data: null };
}

export type InviteError = "auth" | "invalid" | "noRelation" | "offline" | "noSlot" | "unavailable";
export type InviteResult =
  | { ok: true; data: { expiresAt: string } }
  | { ok: false; error: InviteError };

/** Invites a buyer in relation with the property; asked again, a new link replaces the old one. */
export async function inviteToVisit(input: unknown): Promise<InviteResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = visitInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, buyerId } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visit_invite", {
    p_property: propertyId,
    p_buyer: buyerId,
  });
  if (error || !data?.[0]) {
    if (error?.code === "22023") {
      return {
        ok: false,
        error: error.message.includes("not online")
          ? "offline"
          : error.message.includes("no free slot")
            ? "noSlot"
            : "noRelation",
      };
    }
    if (error?.code !== "42501") {
      console.error("[visits] buyer not invited", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error?.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateVisits(propertyId);
  revalidatePath("/messages", "layout");
  // The token stays on the server: the buyer reads their link themselves.
  return { ok: true, data: { expiresAt: data[0].expires_at } };
}

/**
 * The calendar button of a conversation (SPEC-V2 14): invites its buyer to
 * visit the property it is about. The conversation is read with the session
 * of the caller (a participant only); visit_invite checks the seller.
 */
export async function inviteFromConversation(conversationId: string): Promise<InviteResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(conversationId)) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("property_id, buyer_id, seller_id, kind")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) {
    console.error("[visits] conversation read failed", {
      user_id: profile.id,
      entity_id: conversationId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (
    !conversation?.property_id ||
    !conversation.buyer_id ||
    conversation.kind !== "listing" ||
    conversation.seller_id !== profile.id
  ) {
    return { ok: false, error: "invalid" };
  }
  return inviteToVisit({ propertyId: conversation.property_id, buyerId: conversation.buyer_id });
}

export type BookError =
  | "auth"
  | "invalid"
  | "expired"
  | "full"
  | "tooLate"
  | "already"
  | "offline"
  | "identity"
  | "unavailable";
export type BookResult = { ok: true; data: { visitId: string } } | { ok: false; error: BookError };

export async function bookVisit(input: unknown): Promise<BookResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = visitBookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visit_book", {
    p_token: parsed.data.token,
    p_slot: parsed.data.slotId,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "expired" };
    if (error.code === "23P01") return { ok: false, error: "full" };
    if (error.code === "23505") return { ok: false, error: "already" };
    // No identity document deposited (DECISIONS.md 2026-11-23): the form leads to the deposit.
    if (error.code === "55000") return { ok: false, error: "identity" };
    if (error.code === "22023") {
      return {
        ok: false,
        error: error.message.includes("not online")
          ? "offline"
          : error.message.includes("too late")
            ? "tooLate"
            : "full",
      };
    }
    console.error("[visits] visit not booked", { user_id: profile.id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  revalidateVisits();
  return { ok: true, data: { visitId: data } };
}

export type CancelResult =
  | { ok: true; data: null }
  | { ok: false; error: "auth" | "tooLate" | "unavailable" };

/** The buyer until 2 hours before the start, the seller until the start. */
export async function cancelVisit(visitId: string, propertyId?: string): Promise<CancelResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  if (!UUID.test(visitId)) return { ok: false, error: "unavailable" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("visit_cancel", { p_visit: visitId });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "tooLate" };
    if (error.code !== "42501") {
      console.error("[visits] visit not cancelled", {
        user_id: profile.id,
        entity_id: visitId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidateVisits(propertyId && UUID.test(propertyId) ? propertyId : undefined);
  return { ok: true, data: null };
}

export type FeedbackError = "auth" | "invalid" | "notYet" | "closed" | "unavailable";
export type FeedbackResult = { ok: true; data: null } | { ok: false; error: FeedbackError };

/** What visit_feedback_buyer and visit_feedback_seller refuse, in the words of the form. */
function feedbackError(
  error: { code: string; message: string },
  context: { user_id: string; entity_id: string },
): FeedbackError {
  if (error.code === "22023") {
    return error.message.includes("did not take place")
      ? "notYet"
      : error.message.includes("too late")
        ? "closed"
        : "invalid";
  }
  if (error.code !== "42501") {
    console.error("[visits] feedback not saved", { ...context, code: error.code });
  }
  return "unavailable";
}

/**
 * The feedback of the buyer after their visit (L3-03, SPEC-V2 14): an interest
 * from 1 to 5 and a comment, written or changed for 7 days after the visit.
 */
export async function giveBuyerFeedback(input: unknown): Promise<FeedbackResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = visitBuyerFeedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { visitId, interest, comment } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("visit_feedback_buyer", {
    p_visit: visitId,
    p_interest: interest,
    p_comment: comment,
  });
  if (error) {
    return { ok: false, error: feedbackError(error, { user_id: profile.id, entity_id: visitId }) };
  }
  revalidateVisits();
  return { ok: true, data: null };
}

/** The note of the seller about a visit of their property: never shown to the buyer. */
export async function giveSellerFeedback(input: unknown): Promise<FeedbackResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = visitSellerFeedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { visitId, comment } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("visit_feedback_seller", {
    p_visit: visitId,
    p_comment: comment,
  });
  if (error) {
    return { ok: false, error: feedbackError(error, { user_id: profile.id, entity_id: visitId }) };
  }
  revalidateVisits();
  return { ok: true, data: null };
}
