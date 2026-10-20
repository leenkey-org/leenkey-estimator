import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { galleryPhotos, photoAlt } from "@/leenkey/listings/presentation";
import {
  PHOTO_FILE,
  PHOTO_MINIMUM,
  PHOTO_WIDTHS,
  photoFile,
  photoUrl,
} from "@/leenkey/properties/photo-files";
import imageLoader from "@/lib/images/loader";
import { captionPhotoSchema, reorderPhotosSchema } from "@/lib/validations/photos";

// core/images/webp.ts is a server module.
vi.mock("server-only", () => ({}));
const { toWebp } = await import("@/core/images/webp");

// L1-12: photos of a property.

const property = "623efc8b-97d4-4902-ac43-406417498893";
const photo = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
const options = { widths: PHOTO_WIDTHS, minimum: PHOTO_MINIMUM, formats: ["jpeg", "png", "webp"] };

/** A picture of `width` × `height`, blue, in the format asked. */
function picture(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 17, g: 86, b: 252 } },
  });
}

describe("conversion into WebP", () => {
  it("makes the three widths, never enlarged, upright and without metadata", async () => {
    // A phone photo held upright: stored 1200 × 900, EXIF orientation 6.
    const input = await picture(1200, 900).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const result = await toWebp(input, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([result.data.width, result.data.height]).toEqual([900, 1200]);
    const files = await Promise.all(
      result.data.files.map(async ({ width, data }) => {
        const meta = await sharp(data).metadata();
        return [width, meta.format, meta.width, meta.height, meta.orientation, meta.exif];
      }),
    );
    expect(files).toEqual([
      [400, "webp", 400, 533, undefined, undefined],
      [800, "webp", 800, 1067, undefined, undefined],
      [1600, "webp", 900, 1200, undefined, undefined],
    ]);
  });

  it("reads PNG and WebP too, from their content", async () => {
    for (const input of [
      await picture(1600, 1200).png().toBuffer(),
      await picture(1600, 1200).webp().toBuffer(),
    ]) {
      expect((await toWebp(input, options)).ok).toBe(true);
    }
  });

  it("refuses another format, or what is not an image", async () => {
    const gif = await picture(1600, 1200).gif().toBuffer();
    expect(await toWebp(gif, options)).toEqual({ ok: false, error: "unsupported" });
    expect(await toWebp(Buffer.from("%PDF-1.7 pas une photo"), options)).toEqual({
      ok: false,
      error: "unsupported",
    });
  });

  it("asks for 800 × 600 pixels at least, whatever the orientation", async () => {
    const small = await picture(799, 600).jpeg().toBuffer();
    expect(await toWebp(small, options)).toEqual({ ok: false, error: "too_small" });
    const narrow = await picture(1600, 599).jpeg().toBuffer();
    expect(await toWebp(narrow, options)).toEqual({ ok: false, error: "too_small" });
    const portrait = await picture(600, 800).jpeg().toBuffer();
    expect((await toWebp(portrait, options)).ok).toBe(true);
  });
});

describe("files and addresses of a photo", () => {
  it("names the files of a photo and serves them through /img", () => {
    expect(photoFile(`${property}/${photo}`, 800)).toBe(`${property}/${photo}-800.webp`);
    expect(photoUrl(`${property}/${photo}`)).toBe(`/img/${property}/${photo}-1600.webp`);
  });

  it("knows only the three files of a photo", () => {
    expect(PHOTO_FILE.test(`${property}/${photo}-400.webp`)).toBe(true);
    for (const name of [
      `${property}/${photo}.webp`,
      `${property}/${photo}-500.webp`,
      `${property}/${photo}-400.jpg`,
      `${property}/../${photo}-400.webp`,
      `${photo}-400.webp`,
      `${property.toUpperCase()}/${photo}-400.webp`,
    ]) {
      expect(PHOTO_FILE.test(name), name).toBe(false);
    }
  });

  it("gives next/image the smallest width wide enough, other images as they are", () => {
    const src = `/img/${property}/${photo}-1600.webp`;
    const width = (asked: number) => imageLoader({ src, width: asked });
    expect(width(56)).toBe(`/img/${property}/${photo}-400.webp`);
    expect(width(400)).toBe(`/img/${property}/${photo}-400.webp`);
    expect(width(401)).toBe(`/img/${property}/${photo}-800.webp`);
    expect(width(1200)).toBe(`/img/${property}/${photo}-1600.webp`);
    expect(width(3840)).toBe(`/img/${property}/${photo}-1600.webp`);
    expect(imageLoader({ src: "/design/salon-epinay.jpg", width: 800 })).toBe(
      "/design/salon-epinay.jpg?w=800",
    );
    // The photos of the public pages (L1-46), in the same three widths.
    expect(imageLoader({ src: "/images/accueil/maison-1600.webp", width: 640 })).toBe(
      "/images/accueil/maison-800.webp",
    );
    expect(imageLoader({ src: "/images/accueil/maison-1600.webp", width: 380 })).toBe(
      "/images/accueil/maison-400.webp",
    );
  });
});

describe("alternative texts", () => {
  const listing = {
    type: "appartement" as const,
    rooms: 3,
    city: "Savigny-sur-Orge",
    photos: [
      { path: `${property}/${photo}`, width: 1600, height: 1200, caption: "Séjour" },
      { path: `${property}/${property}`, width: 1600, height: 1200, caption: null },
    ],
  };

  it("says the room, the property and the town (DESIGN 7.1)", () => {
    expect(photoAlt(listing, "Séjour", 0, 2)).toBe(
      "Séjour, appartement 3 pièces à Savigny-sur-Orge",
    );
    expect(photoAlt(listing, null, 1, 12)).toBe(
      "Photo 2 sur 12, appartement 3 pièces à Savigny-sur-Orge",
    );
    expect(photoAlt({ type: "terrain", rooms: 0, city: "Le Plessis-Pâté" }, null, 0, 1)).toBe(
      "Photo 1 sur 1, terrain au Plessis-Pâté",
    );
  });

  it("lists the photos of the gallery in their order", () => {
    expect(galleryPhotos(listing)).toEqual([
      {
        src: `/img/${property}/${photo}-1600.webp`,
        alt: "Séjour, appartement 3 pièces à Savigny-sur-Orge",
      },
      {
        src: `/img/${property}/${property}-1600.webp`,
        alt: "Photo 2 sur 2, appartement 3 pièces à Savigny-sur-Orge",
      },
    ]);
  });
});

describe("what the browser sends", () => {
  it("keeps a caption of 200 characters, an empty one is none", () => {
    const ref = { propertyId: property, photoId: photo };
    expect(captionPhotoSchema.parse({ ...ref, caption: "  Cuisine  " }).caption).toBe("Cuisine");
    expect(captionPhotoSchema.parse({ ...ref, caption: "   " }).caption).toBeNull();
    expect(captionPhotoSchema.safeParse({ ...ref, caption: "x".repeat(201) }).success).toBe(false);
  });

  it("orders 15 photos at most", () => {
    const ids = (count: number) => Array.from({ length: count }, () => photo);
    expect(reorderPhotosSchema.safeParse({ propertyId: property, photoIds: ids(15) }).success).toBe(
      true,
    );
    expect(reorderPhotosSchema.safeParse({ propertyId: property, photoIds: ids(16) }).success).toBe(
      false,
    );
  });
});
