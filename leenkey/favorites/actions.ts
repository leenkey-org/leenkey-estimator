"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { favoriteSchema } from "@/lib/validations/favorites";

export type FavoriteResult =
  | { ok: true; data: { favorite: boolean } }
  | { ok: false; error: "invalid" | "auth" | "unavailable" };

/**
 * Adds or removes a favourite (L1-18), with the visitor's session: RLS only
 * lets an active account add a published listing to its own favourites.
 * Idempotent. No revalidatePath: the pages that show favourites are read
 * at each visit, and the favourites page keeps a removed card until then,
 * so that a mistaken tap can be undone.
 */
export async function setFavorite(input: unknown): Promise<FavoriteResult> {
  const parsed = favoriteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const { listingId, favorite } = parsed.data;
  const supabase = await createClient();
  const { error } = favorite
    ? await supabase.from("favorites").insert({ buyer_id: profile.id, listing_id: listingId })
    : await supabase
        .from("favorites")
        .delete()
        .eq("buyer_id", profile.id)
        .eq("listing_id", listingId);
  // 23505: already saved (a second tab, a double tap).
  if (error && error.code !== "23505") {
    console.error("[favorites] write failed", {
      user_id: profile.id,
      entity_id: listingId,
      favorite,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: { favorite } };
}

/**
 * Removes the favourites that are no longer online (sold, paused, suspended):
 * the favourites page cannot show them, only count them.
 */
export async function clearOfflineFavorites(): Promise<
  { ok: true; data: { removed: number } } | { ok: false; error: "auth" | "unavailable" }
> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  try {
    const saved = await supabase.from("favorites").select("listing_id").eq("buyer_id", profile.id);
    if (saved.error) throw new Error(`favorites: ${saved.error.code}`);
    const ids = saved.data.map((row) => row.listing_id);
    if (ids.length === 0) return { ok: true, data: { removed: 0 } };
    const online = await supabase.from("public_listings").select("id").in("id", ids);
    if (online.error) throw new Error(`public_listings: ${online.error.code}`);
    const onlineIds = new Set(online.data.map((row) => row.id));
    const offline = ids.filter((id) => !onlineIds.has(id));
    if (offline.length > 0) {
      const removed = await supabase
        .from("favorites")
        .delete()
        .eq("buyer_id", profile.id)
        .in("listing_id", offline);
      if (removed.error) throw new Error(`favorites delete: ${removed.error.code}`);
    }
    revalidatePath("/acquereur/favoris");
    return { ok: true, data: { removed: offline.length } };
  } catch (error) {
    console.error("[favorites] clearing offline favourites failed", {
      user_id: profile.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
