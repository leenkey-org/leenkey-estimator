import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { addressLabel, inCreation } from "./creation";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type DraftResult =
  | { ok: true; label: string }
  | { ok: false; error: "not_found" | "unavailable" };

/**
 * The property of the seller while the steps of the creation change it (a
 * draft, or a rejected listing), and its address. Sent for review or
 * online, it changes from its page (L1-14): « not found » here.
 */
export async function readDraft(
  supabase: Supabase,
  id: string,
  ownerId: string,
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
  if (!inCreation(listing?.status ?? null)) return { ok: false, error: "not_found" };
  return {
    ok: true,
    label: addressLabel({ line: data.address_line, postalCode: data.postal_code, city: data.city }),
  };
}
