import "server-only";
import sharp from "sharp";
import { MAX_PIXELS } from "./webp";

// An image cropped around its centre to fill exactly the size asked, in
// JPEG: for the drawings that do not read WebP (next/og).

export async function coverJpeg(
  input: Buffer,
  size: { width: number; height: number },
  quality = 80,
): Promise<Buffer | null> {
  try {
    return await sharp(input, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize(size.width, size.height, { fit: "cover" })
      .jpeg({ quality })
      .toBuffer();
  } catch {
    return null;
  }
}
