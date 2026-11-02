import "server-only";
import type { SellerListing, SellerProperty } from "@/leenkey/properties/queries";
import { propertyName } from "@/leenkey/properties/sheet";
import type { ToolContext } from "@/core/ai/tools/types";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_NOT_FOUND, sellerPropertyById } from "../seller-data";

// The listing a tool of the assistant changes (update_listing_description,
// update_listing_price): the seller's own, neither sold nor suspended by
// Leenkey (SPEC-V2 section 4); a listing in review, online or paused stays as
// it is (DECISIONS L1-14b). The RLS and the triggers of the database check
// it again on the update.

export type EditableListing = { property: SellerProperty; listing: SellerListing; name: string };

export async function editableListing(
  profileId: string,
  propertyId: string,
): Promise<{ ok: true; data: EditableListing } | { ok: false; error: string }> {
  const found = await sellerPropertyById(profileId, propertyId);
  if (!found.ok) return { ok: false, error: "The property could not be read. Try again later." };
  const property = found.data;
  if (!property) return { ok: false, error: PROPERTY_NOT_FOUND };
  const listing = property.listing;
  if (!listing) {
    return {
      ok: false,
      error: "This property has no listing yet: the seller writes it at step 3 of its creation.",
    };
  }
  if (listing.status === "sold")
    return { ok: false, error: "This listing is sold: it no longer changes." };
  if (listing.status === "suspended") {
    return {
      ok: false,
      error:
        "This listing is suspended by Leenkey: it does not change until Leenkey lifts the suspension.",
    };
  }
  return { ok: true, data: { property, listing, name: propertyName(property) } };
}

export type ListingUpdate = { description: string } | { priceCents: number };

/** What a tool that changes the listing answers. */
export type UpdateOutput =
  | { updated: true }
  | { updated: false; error: string }
  /** The call was already answered (cancelled, replaced, confirmed elsewhere): nothing written. */
  | { updated: false; answered: true };

/**
 * The change confirmed by the seller, with their session, and its result in
 * the log, in one transaction (SQL ai_listing_update): the listing changes
 * only with its result logged, once. Without the call confirmed
 * (ToolContext.call), nothing is written.
 */
export async function updateListing(
  ctx: ToolContext,
  listingId: string,
  values: ListingUpdate,
): Promise<UpdateOutput> {
  if (!ctx.call)
    return { updated: false, error: "Not confirmed by the seller: nothing was written." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ai_listing_update", {
    p_conversation_id: ctx.call.conversationId,
    p_tool_use_id: ctx.call.toolUseId,
    p_tool_name: ctx.call.name,
    p_listing_id: listingId,
    ...("description" in values
      ? { p_description: values.description }
      : { p_price_cents: values.priceCents }),
  });
  if (!error) return { updated: true };
  if (error.code === "23505") return { updated: false, answered: true };
  if (error.code !== "P0002" && error.code !== "42501") {
    console.error("[ai] listing update failed", {
      user_id: ctx.profileId,
      entity_id: listingId,
      code: error.code,
    });
    return { updated: false, error: "The listing could not be changed. Nothing was written." };
  }
  return { updated: false, error: "The listing can no longer be changed. Nothing was written." };
}
