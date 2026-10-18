// Photos of a property (L1-12, SPEC-V2 sections 4 « Storage » and 8.3). Pure:
// shared by the browser, the server and the tests.

/** Widths of the WebP files of a photo, `{property_id}/{uuid}-{width}.webp`. */
export const PHOTO_WIDTHS = [400, 800, 1600] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

export const MAX_PHOTOS = 15;

/** The file chosen by the seller (SPEC 8.3): 10 MB, JPEG, PNG or WebP. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * What the server receives at most: a server function takes 4.5 MB on
 * Vercel. A heavier photo is first reduced in the browser to
 * PHOTO_REDUCED_SIDE pixels (DECISIONS, L1-12).
 */
export const PHOTO_UPLOAD_MAX_BYTES = 3.5 * 1024 * 1024;
export const PHOTO_REDUCED_SIDE = 2400;

/** Smallest photo accepted, whatever its orientation (provisional, DECISIONS). */
export const PHOTO_MINIMUM = { long: 800, short: 600 } as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** A file of the bucket photos: `{property_id}/{uuid}-{400|800|1600}.webp`. */
export const PHOTO_FILE = new RegExp(`^${UUID}/${UUID}-(400|800|1600)\\.webp$`);

/** File of a photo (`{property_id}/{uuid}`, its base in public.photos) at a width. */
export function photoFile(path: string, width: PhotoWidth): string {
  return `${path}-${width}.webp`;
}

/** URL of a photo, through the route /img; next/image picks the width (lib/images/loader.ts). */
export function photoUrl(path: string, width: PhotoWidth = 1600): string {
  return `/img/${photoFile(path, width)}`;
}
