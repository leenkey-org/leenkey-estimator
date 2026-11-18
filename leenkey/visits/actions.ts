"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { visitBookSchema, visitInviteSchema, visitSlotSchema } from "@/lib/validations/visit";
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

export type InviteError = "auth" | "invalid" | "noRelation" | "offline" | "unavailable";
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
      return { ok: false, error: error.message.includes("not online") ? "offline" : "noRelation" };
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

export type BookError =
  | "auth"
  | "invalid"
  | "expired"
  | "full"
  | "tooLate"
  | "already"
  | "offline"
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
