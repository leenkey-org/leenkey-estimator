import { PHOTO_REDUCED_SIDE, PHOTO_UPLOAD_MAX_BYTES } from "../photo-files";

// In the browser, before sending (L1-12): a photo heavier than what the
// server takes is redrawn at PHOTO_REDUCED_SIDE pixels at most, in JPEG.
// The server converts it again (core/images/webp.ts), and drops what is left
// of its metadata.

const QUALITIES = [0.9, 0.8, 0.7];

/** The file to send: as chosen when light enough; null when it cannot be read or reduced. */
export async function reducePhoto(file: File): Promise<Blob | null> {
  if (file.size <= PHOTO_UPLOAD_MAX_BYTES) return file;
  try {
    // Upright: current browsers apply the EXIF orientation here.
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_REDUCED_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= PHOTO_UPLOAD_MAX_BYTES) return blob;
    }
    return null;
  } catch {
    return null;
  }
}
