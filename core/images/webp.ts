import "server-only";
import sharp from "sharp";

// Images sent by users: read from their content (never from their name nor
// their declared type), turned upright, stripped of their metadata (the
// place of the shot, the camera) and converted into WebP files at the widths
// asked, never enlarged.

export type WebpOptions = {
  widths: readonly number[];
  /** Smallest image accepted, whatever its orientation. */
  minimum: { long: number; short: number };
  /** Formats read, by their sharp name (jpeg, png, webp…). */
  formats: readonly string[];
  quality?: number;
};

export type WebpImage = {
  /** Size of the largest file. */
  width: number;
  height: number;
  files: { width: number; data: Buffer }[];
};

export type WebpResult =
  | { ok: true; data: WebpImage }
  | { ok: false; error: "unsupported" | "too_small" };

/** A small file may hold a huge image: refused beyond 60 million pixels. */
export const MAX_PIXELS = 60_000_000;

export async function toWebp(input: Buffer, options: WebpOptions): Promise<WebpResult> {
  let width: number;
  let height: number;
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
    if (!meta.format || !options.formats.includes(meta.format) || !meta.width || !meta.height) {
      return { ok: false, error: "unsupported" };
    }
    // EXIF orientations 5 to 8: the picture is turned a quarter.
    const turned = (meta.orientation ?? 1) >= 5;
    width = turned ? meta.height : meta.width;
    height = turned ? meta.width : meta.height;
  } catch {
    return { ok: false, error: "unsupported" };
  }
  if (
    Math.max(width, height) < options.minimum.long ||
    Math.min(width, height) < options.minimum.short
  ) {
    return { ok: false, error: "too_small" };
  }
  try {
    const upright = sharp(input, { limitInputPixels: MAX_PIXELS }).rotate();
    const files = await Promise.all(
      options.widths.map(async (target) => ({
        width: target,
        data: await upright
          .clone()
          .resize({ width: target, withoutEnlargement: true })
          .webp({ quality: options.quality ?? 80 })
          .toBuffer(),
      })),
    );
    const largest = Math.min(width, Math.max(...options.widths));
    return {
      ok: true,
      data: { width: largest, height: Math.round((height * largest) / width), files },
    };
  } catch {
    return { ok: false, error: "unsupported" };
  }
}
