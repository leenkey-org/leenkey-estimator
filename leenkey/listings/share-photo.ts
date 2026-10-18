import "server-only";
import { coverJpeg } from "@/core/images/cover";
import { photoFile } from "@/leenkey/properties/photo-files";
import { createPublicClient } from "@/lib/supabase/public";

/** Photo area of the share image: 60 % of 1200 × 630 (docs/DESIGN.md 14). */
export const SHARE_PHOTO = { width: 720, height: 630 } as const;

/**
 * The main photo of a published listing for its share image: its largest
 * file, read as a visitor, cropped to the photo area and turned into JPEG
 * (next/og does not read WebP), as a data URL. Null when it cannot be read
 * within 3 seconds, signature included: the image keeps the drawing.
 */
export async function sharePhoto(path: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.error("[listings] share photo too slow", { entity_id: path });
      resolve(null);
    }, 3_000);
  });
  try {
    return await Promise.race([readPhoto(path), late]);
  } finally {
    clearTimeout(timer);
  }
}

async function readPhoto(path: string): Promise<string | null> {
  try {
    const signed = await createPublicClient()
      .storage.from("photos")
      .createSignedUrl(photoFile(path, 1600), 60);
    if (signed.error || !signed.data) {
      console.error("[listings] share photo not signed", {
        entity_id: path,
        error: signed.error?.message,
      });
      return null;
    }
    const response = await fetch(signed.data.signedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      console.error("[listings] share photo not read", {
        entity_id: path,
        status: response.status,
      });
      return null;
    }
    const jpeg = await coverJpeg(Buffer.from(await response.arrayBuffer()), SHARE_PHOTO);
    return jpeg ? `data:image/jpeg;base64,${jpeg.toString("base64")}` : null;
  } catch (error) {
    console.error("[listings] share photo failed", {
      entity_id: path,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
