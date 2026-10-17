import "server-only";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { chunk } from "@/lib/utils";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { SearchListing } from "@/leenkey/search/queries";

// Favourites of the signed-in account (L1-18), with the visitor's session:
// RLS only shows their own rows, and public_listings only published ones.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type FavoriteListings = {
  /** Still published, most recently saved first. */
  items: SearchListing[];
  /** Saved listings that are no longer online (sold, paused, suspended…). */
  offline: number;
};

/** Ids per `.in()` filter (lib/utils.ts, chunk). */
export const IDS_PER_REQUEST = 100;

// Columns of the cards (leenkey/search/cards.ts).
const CARD_COLUMNS =
  "id, slug, title, price_cents, published_at, type, city, postal_code, district, public_lat, public_lng, surface_m2, rooms, bedrooms, floor, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, dpe_class";

/**
 * Whether the signed-in account saved this listing; null without a session
 * (the heart then leads to the sign-up).
 */
export async function favoriteState(listingId: string): Promise<boolean | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("buyer_id", profile.id)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (error) {
    console.error("[favorites] read failed", {
      user_id: profile.id,
      entity_id: listingId,
      code: error.code,
    });
    return false;
  }
  return data !== null;
}

/** The favourites page: saved listings still online, as search cards. */
export async function listFavorites(profileId: string): Promise<QueryResult<FavoriteListings>> {
  try {
    const supabase = await createClient();
    const saved = await supabase
      .from("favorites")
      .select("listing_id, created_at")
      .eq("buyer_id", profileId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (saved.error) throw new Error(`favorites: ${saved.error.code} ${saved.error.message}`);
    const ids = saved.data.map((row) => row.listing_id);
    if (ids.length === 0) return { ok: true, data: { items: [], offline: 0 } };

    const pages = await Promise.all(
      chunk(ids, IDS_PER_REQUEST).map((part) =>
        supabase.from("public_listings").select(CARD_COLUMNS).in("id", part),
      ),
    );
    const rows = pages.flatMap((page) => {
      if (page.error) throw new Error(`public_listings: ${page.error.code} ${page.error.message}`);
      return page.data;
    });
    const byId = new Map<string, SearchListing>();
    for (const row of rows) {
      if (
        !row.id ||
        !row.slug ||
        !row.title ||
        row.price_cents === null ||
        !row.type ||
        !row.city ||
        !row.postal_code ||
        row.surface_m2 === null ||
        row.rooms === null
      ) {
        continue;
      }
      byId.set(row.id, {
        id: row.id,
        slug: row.slug,
        title: row.title,
        priceCents: Number(row.price_cents),
        publishedAt: row.published_at,
        type: row.type,
        city: row.city,
        postalCode: row.postal_code,
        district: row.district,
        lat: row.public_lat,
        lng: row.public_lng,
        surfaceM2: Number(row.surface_m2),
        rooms: row.rooms,
        bedrooms: row.bedrooms,
        floor: row.floor,
        hasElevator: row.has_elevator,
        hasBalcony: row.has_balcony,
        hasTerrace: row.has_terrace,
        hasGarden: row.has_garden,
        hasParking: row.has_parking,
        hasCellar: row.has_cellar,
        dpe: DPE_CLASSES.find((letter) => letter === row.dpe_class) ?? null,
      });
    }
    const items = ids.flatMap((id) => byId.get(id) ?? []);
    return { ok: true, data: { items, offline: ids.length - items.length } };
  } catch (error) {
    console.error("[favorites] list failed", {
      user_id: profileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
