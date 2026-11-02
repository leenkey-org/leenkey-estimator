import "server-only";
import type { SellerListing, SellerProperty } from "@/leenkey/properties/queries";
import { propertyName } from "@/leenkey/properties/sheet";
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

export type ListingUpdate = { description: string } | { price_cents: number };

/** The update, with the session of the seller; false when nothing was written. */
export async function updateListing(
  profileId: string,
  listingId: string,
  values: ListingUpdate,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .update(values)
    .eq("id", listingId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[ai] listing update failed", {
      user_id: profileId,
      entity_id: listingId,
      code: error.code,
    });
    return { ok: false, error: "The listing could not be changed. Nothing was written." };
  }
  if (!data)
    return { ok: false, error: "The listing can no longer be changed. Nothing was written." };
  return { ok: true };
}
