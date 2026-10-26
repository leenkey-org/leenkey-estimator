import { SHOWCASE_PHOTOS } from "@/components/shared/showcase-photos";

// The photos of the cards of the search (L1-55), grouped from the rows of
// public_listing_photos; apart from queries.ts (server only) to be tested.

/** The photos a card turns through (ShowcaseCard, its dots count them). */
export const CARD_PHOTOS = SHOWCASE_PHOTOS;

/** A row of public_listing_photos (its photos in their order, `total` per listing). */
export type PhotoRow = { listing_id: string; path: string; position: number; total: number };

/**
 * Up to CARD_PHOTOS photos per listing, the main one first (their order), and
 * how many it has (`total` of the function, never the rows received).
 */
export function groupPhotos(
  rows: readonly PhotoRow[],
): Map<string, { paths: string[]; total: number }> {
  const photos = new Map<string, { paths: string[]; total: number }>();
  for (const row of [...rows].sort((a, b) => a.position - b.position)) {
    const entry = photos.get(row.listing_id) ?? { paths: [], total: Number(row.total) };
    if (entry.paths.length < CARD_PHOTOS) entry.paths.push(row.path);
    photos.set(row.listing_id, entry);
  }
  return photos;
}
