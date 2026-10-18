import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Photos of a property of the seller (L1-12), with the seller's session: RLS
// shows only those of their own properties.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type SellerPhoto = {
  id: string;
  /** `{property_id}/{uuid}`, the base of its files (photo-files.ts). */
  path: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  isCover: boolean;
};

export type PhotosResult = { ok: true; data: SellerPhoto[] } | { ok: false; error: "unavailable" };

/** The photos of a property, in the order chosen; the first is the cover. */
export async function readPhotos(supabase: Supabase, propertyId: string): Promise<PhotosResult> {
  const { data, error } = await supabase
    .from("photos")
    .select("id, storage_path, width, height, caption, is_cover")
    .eq("property_id", propertyId)
    .order("position");
  if (error) {
    console.error("[properties] photos read failed", { entity_id: propertyId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.map((row) => ({
      id: row.id,
      path: row.storage_path,
      width: row.width,
      height: row.height,
      caption: row.caption,
      isCover: row.is_cover,
    })),
  };
}
