"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  deleteDraftSchema,
  listingActionSchema,
  markSoldSchema,
} from "@/lib/validations/listing-status";
import type { Database } from "@/types/database";

// Actions of the page of a property (L1-14), with the seller's session: the
// SQL functions of L1-04 check the owner and the transition, and refuse a
// listing suspended by Leenkey (SPEC-V2 section 5). Never a free update of
// the status.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type StatusError =
  | "auth"
  | "invalid"
  | "not_found"
  | "suspended"
  | "conflict"
  | "unavailable";

export type StatusActionResult =
  | { ok: true; data: { status: ListingStatus } }
  | { ok: false; error: StatusError };

export type DeleteDraftResult = { ok: true; data: null } | { ok: false; error: StatusError };

/**
 * Errors of the SQL functions: 42501 for a listing that is not the seller's
 * or that Leenkey suspended, 22023 for a transition its status does not
 * allow (it changed meanwhile).
 */
function errorOf(error: { code: string; message: string }): StatusError {
  if (error.code === "42501") return /suspended/i.test(error.message) ? "suspended" : "not_found";
  if (error.code === "22023") return "conflict";
  return "unavailable";
}

function logFailure(action: string, userId: string, entityId: string, code: string) {
  console.error(`[properties] ${action} failed`, { user_id: userId, entity_id: entityId, code });
}

async function changeStatus(
  action: "listing_pause" | "listing_resume",
  input: unknown,
): Promise<StatusActionResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = listingActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(action, { p_listing_id: parsed.data.listingId });
  if (error) {
    logFailure(action, profile.id, parsed.data.listingId, error.code);
    return { ok: false, error: errorOf(error) };
  }
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: { status: data } };
}

/** « Mettre en pause »: an online listing leaves the search and its page. */
export async function pauseListing(input: unknown): Promise<StatusActionResult> {
  return changeStatus("listing_pause", input);
}

/** « Remettre en ligne »: a paused listing is online again, without a new review. */
export async function republishListing(input: unknown): Promise<StatusActionResult> {
  return changeStatus("listing_resume", input);
}

/** « Marquer comme vendu », with the final price when the seller gives it. */
export async function markListingSold(input: unknown): Promise<StatusActionResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = markSoldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { listingId, soldPriceEuros } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("listing_mark_sold", {
    p_listing_id: listingId,
    ...(soldPriceEuros === null ? {} : { p_sold_price_cents: soldPriceEuros * 100 }),
  });
  if (error) {
    logFailure("listing_mark_sold", profile.id, listingId, error.code);
    return { ok: false, error: errorOf(error) };
  }
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: { status: data } };
}

/** « Supprimer le brouillon » (SPEC-V2 8.3): the property, its photos and its draft, softly. */
export async function deleteDraft(input: unknown): Promise<DeleteDraftResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = deleteDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("property_soft_delete", {
    p_property_id: parsed.data.propertyId,
  });
  if (error) {
    logFailure("property_soft_delete", profile.id, parsed.data.propertyId, error.code);
    return { ok: false, error: errorOf(error) };
  }
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: null };
}
