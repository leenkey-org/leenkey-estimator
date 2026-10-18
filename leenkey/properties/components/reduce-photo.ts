import { PHOTO_REDUCED_SIDE, PHOTO_UPLOAD_MAX_BYTES } from "../photo-files";

// In the browser, before sending (L1-12): a photo heavier than what the
// server takes is redrawn at PHOTO_REDUCED_SIDE pixels at most, in JPEG, on
// white (a transparent PNG would turn black). The server converts it again
// (core/images/webp.ts), and drops what is left of its metadata.

const QUALITIES = [0.9, 0.8, 0.7];

export type ReducedPhoto =
  | { ok: true; blob: Blob }
  | { ok: false; error: "unreadable" | "too_heavy" };

/** Upright: the JPEG drawn here keeps no EXIF orientation. */
async function upright(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (error) {
    // Older browsers know « none » and « flipY » only: their own default then.
    if (error instanceof TypeError) return createImageBitmap(file);
    throw error;
  }
}

/** The file to send: as chosen when light enough, else redrawn. */
export async function reducePhoto(file: File): Promise<ReducedPhoto> {
  if (file.size <= PHOTO_UPLOAD_MAX_BYTES) return { ok: true, blob: file };
  let bitmap: ImageBitmap;
  try {
    bitmap = await upright(file);
  } catch {
    return { ok: false, error: "unreadable" };
  }
  const scale = Math.min(1, PHOTO_REDUCED_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, error: "unreadable" };
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= PHOTO_UPLOAD_MAX_BYTES) return { ok: true, blob };
  }
  return { ok: false, error: "too_heavy" };
}
