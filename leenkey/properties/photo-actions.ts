"use server";

import { randomUUID } from "node:crypto";
import { getProfile } from "@/core/auth/session";
import { toWebp } from "@/core/images/webp";
import { createClient } from "@/lib/supabase/server";
import {
  addPhotoSchema,
  captionPhotoSchema,
  photoListSchema,
  photoRefSchema,
  reorderPhotosSchema,
} from "@/lib/validations/photos";
import { readDraft } from "./drafts";
import {
  MAX_PHOTOS,
  PHOTO_MINIMUM,
  PHOTO_UPLOAD_MAX_BYTES,
  PHOTO_WIDTHS,
  photoFile,
} from "./photo-files";
import { readPhotos, type SellerPhoto } from "./photos";

// Server actions of the photos of a property (L1-12), during its creation
// and once its listing is sent, from its page (L1-14b), with the seller's
// session: the RLS of public.photos and the policies of the bucket photos
// decide what they may write. Each one answers with the photos of the
// property, in their order. No revalidatePath: it would render the step
// again for each photo; « Ma vente », dynamic, is read again when it opens.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type PhotoError =
  | "auth"
  | "invalid"
  | "not_found"
  | "too_large"
  | "unsupported"
  | "too_small"
  | "full"
  | "unavailable";

export type PhotoActionResult =
  | { ok: true; data: SellerPhoto[] }
  | { ok: false; error: PhotoError };

/** Session, then the property of the seller: in its creation, in review, online or paused. */
async function draftOfSeller(
  propertyId: string,
): Promise<{ ok: true; supabase: Supabase; userId: string } | { ok: false; error: PhotoError }> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const supabase = await createClient();
  const draft = await readDraft(supabase, propertyId, profile.id, { sent: true });
  if (!draft.ok) return draft;
  return { ok: true, supabase, userId: profile.id };
}

function photosOf(supabase: Supabase, propertyId: string): Promise<PhotoActionResult> {
  return readPhotos(supabase, propertyId);
}

/** The photos of the property as they are (after a failed change). */
export async function listPhotos(input: unknown): Promise<PhotoActionResult> {
  const parsed = photoListSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const draft = await draftOfSeller(parsed.data.propertyId);
  if (!draft.ok) return draft;
  return photosOf(draft.supabase, parsed.data.propertyId);
}

/** Files of a photo, deleted quietly: a file left behind is never shown (storage policies). */
async function removeFiles(supabase: Supabase, names: string[], userId: string) {
  if (names.length === 0) return;
  const { error } = await supabase.storage.from("photos").remove(names);
  if (error) {
    console.error("[properties] photo files not removed", { user_id: userId, count: names.length });
  }
}

/**
 * A photo, in the FormData `propertyId` and `file` (reduced beforehand in
 * the browser when heavier than PHOTO_UPLOAD_MAX_BYTES): converted into its
 * three WebP files, uploaded, then declared at the end of the photos.
 */
export async function addPhoto(formData: FormData): Promise<PhotoActionResult> {
  const parsed = addPhotoSchema.safeParse({
    propertyId: formData.get("propertyId"),
    file: formData.get("file"),
  });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, file } = parsed.data;
  if (file.size > PHOTO_UPLOAD_MAX_BYTES) return { ok: false, error: "too_large" };
  const draft = await draftOfSeller(propertyId);
  if (!draft.ok) return draft;
  const { supabase, userId } = draft;

  const taken = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  if (taken.error) {
    console.error("[properties] photo count failed", {
      user_id: userId,
      entity_id: propertyId,
      code: taken.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if ((taken.count ?? 0) >= MAX_PHOTOS) return { ok: false, error: "full" };

  const image = await toWebp(Buffer.from(await file.arrayBuffer()), {
    widths: PHOTO_WIDTHS,
    minimum: PHOTO_MINIMUM,
    formats: ["jpeg", "png", "webp"],
  });
  if (!image.ok) return image;

  const path = `${propertyId}/${randomUUID()}`;
  const uploads = await Promise.all(
    PHOTO_WIDTHS.map(async (width) => {
      const data = image.data.files.find((entry) => entry.width === width)?.data;
      const name = photoFile(path, width);
      if (!data) return { name, ok: false };
      const { error } = await supabase.storage.from("photos").upload(name, data, {
        contentType: "image/webp",
        // As long as a signed URL lasts: a private photo does not stay in a browser.
        cacheControl: "3600",
        upsert: false,
      });
      return { name, ok: !error };
    }),
  );
  const uploaded = uploads.filter((upload) => upload.ok).map((upload) => upload.name);
  if (uploaded.length < PHOTO_WIDTHS.length) {
    console.error("[properties] photo upload failed", { user_id: userId, entity_id: propertyId });
    await removeFiles(supabase, uploaded, userId);
    return { ok: false, error: "unavailable" };
  }

  const { error } = await supabase.from("photos").insert({
    property_id: propertyId,
    storage_path: path,
    width: image.data.width,
    height: image.data.height,
  });
  if (error) {
    await removeFiles(supabase, uploaded, userId);
    // photos_before_insert. 23514: a 16th photo added at the same moment;
    // 42501: the listing sold or suspended meanwhile, as readDraft says.
    if (error.code === "23514") return { ok: false, error: "full" };
    if (error.code === "42501") return { ok: false, error: "not_found" };
    console.error("[properties] photo insert failed", {
      user_id: userId,
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return photosOf(supabase, propertyId);
}

/** A photo deleted, and its files; the next one becomes the cover if it was. */
export async function deletePhoto(input: unknown): Promise<PhotoActionResult> {
  const parsed = photoRefSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, photoId } = parsed.data;
  const draft = await draftOfSeller(propertyId);
  if (!draft.ok) return draft;
  const { supabase, userId } = draft;

  const { data, error } = await supabase
    .from("photos")
    .delete()
    .eq("id", photoId)
    .eq("property_id", propertyId)
    .select("storage_path")
    .maybeSingle();
  if (error) {
    console.error("[properties] photo delete failed", {
      user_id: userId,
      entity_id: photoId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };
  await removeFiles(
    supabase,
    PHOTO_WIDTHS.map((width) => photoFile(data.storage_path, width)),
    userId,
  );
  return photosOf(supabase, propertyId);
}

/** The order of the photos: those named first, the others after them; the first is the cover. */
export async function reorderPhotos(input: unknown): Promise<PhotoActionResult> {
  const parsed = reorderPhotosSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, photoIds } = parsed.data;
  const draft = await draftOfSeller(propertyId);
  if (!draft.ok) return draft;
  const { supabase, userId } = draft;

  const { error } = await supabase.rpc("photos_reorder", {
    p_property_id: propertyId,
    p_photo_ids: photoIds,
  });
  if (error) {
    console.error("[properties] photo reorder failed", {
      user_id: userId,
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return photosOf(supabase, propertyId);
}

/** The caption of a photo (« Séjour »), empty to remove it. */
export async function captionPhoto(input: unknown): Promise<PhotoActionResult> {
  const parsed = captionPhotoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, photoId, caption } = parsed.data;
  const draft = await draftOfSeller(propertyId);
  if (!draft.ok) return draft;
  const { supabase, userId } = draft;

  const { data, error } = await supabase
    .from("photos")
    .update({ caption })
    .eq("id", photoId)
    .eq("property_id", propertyId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[properties] photo caption failed", {
      user_id: userId,
      entity_id: photoId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };
  return photosOf(supabase, propertyId);
}
