import "server-only";
import sharp from "sharp";

// A document sent as a proof (a letter of a bank, a certificate): a PDF kept
// as it is, or an image, read from its content (never from its name nor its
// declared type), turned upright, stripped of its metadata (the place of the
// shot) and kept as a JPEG. Generic: nothing here knows what the proof is of.

export type ProofFile = {
  kind: "pdf" | "image";
  mimeType: "application/pdf" | "image/jpeg";
  extension: "pdf" | "jpg";
  data: Buffer;
};

export type ProofFileResult =
  | { ok: true; data: ProofFile }
  | { ok: false; error: "unsupported" | "too_heavy" };

/** Longest side kept for an image: a page stays readable. */
const IMAGE_SIDE = 2400;
const IMAGE_FORMATS = ["jpeg", "png", "webp"];
/** A small file may hold a huge image. */
const MAX_PIXELS = 60_000_000;

/** « %PDF- » at the very start (a few bytes of padding are tolerated). */
function isPdf(input: Buffer): boolean {
  return input.subarray(0, 1024).includes("%PDF-");
}

export async function readProofFile(input: Buffer, maxBytes: number): Promise<ProofFileResult> {
  if (input.length === 0) return { ok: false, error: "unsupported" };
  if (isPdf(input)) {
    if (input.length > maxBytes) return { ok: false, error: "too_heavy" };
    return {
      ok: true,
      data: { kind: "pdf", mimeType: "application/pdf", extension: "pdf", data: input },
    };
  }
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
    if (!meta.format || !IMAGE_FORMATS.includes(meta.format)) {
      return { ok: false, error: "unsupported" };
    }
    const data = await sharp(input, { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: IMAGE_SIDE, height: IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    if (data.length > maxBytes) return { ok: false, error: "too_heavy" };
    return { ok: true, data: { kind: "image", mimeType: "image/jpeg", extension: "jpg", data } };
  } catch {
    return { ok: false, error: "unsupported" };
  }
}
