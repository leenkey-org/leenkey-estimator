import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { addressLabel, editableOnceSent, inCreation } from "./creation";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type DraftResult =
  | { ok: true; label: string; status: ListingStatus | null }
  | { ok: false; error: "not_found" | "unavailable" };

/**
 * The property of the seller while the steps of the creation change it (a
 * draft, or a rejected listing), and its address. With `sent`, also once its
 * listing is sent for review, online or paused: its characteristics, photos,
 * price, title and description change from its page (L1-14b), its address
 * does not. Otherwise (suspended, sold, someone else's): « not found » here.
 */
export async function readDraft(
  supabase: Supabase,
  id: string,
  ownerId: string,
  options: { sent?: boolean } = {},
): Promise<DraftResult> {
  const { data, error } = await supabase
    .from("properties")
    .select("address_line, postal_code, city, listing:listings(status)")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[properties] draft read failed", {
      user_id: ownerId,
      entity_id: id,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };
  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing;
  const status = listing?.status ?? null;
  if (!inCreation(status) && !(options.sent && editableOnceSent(status))) {
    return { ok: false, error: "not_found" };
  }
  return {
    ok: true,
    label: addressLabel({ line: data.address_line, postalCode: data.postal_code, city: data.city }),
    status,
  };
}
