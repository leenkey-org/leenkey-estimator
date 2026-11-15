import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/validations/search";

// What a tool that read shows the person in the conversation (AiTool.show):
// the listings of a search (search_listings), as cards. Sent to the browser
// as data and read again from the log, which the person may write: checked
// here whoever reads it. The addresses are built by who shows them, from a
// slug and from search parameters, never taken as written.

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** The base of the files of a photo (leenkey/properties/photo-files.ts). */
const PHOTO_BASE = new RegExp(`^${UUID}/${UUID}$`);

/** Listings shown of a search: 5 (SPEC-V2 section 12). */
export const SHOWN_LISTINGS_MAX = 5;

export const shownListing = z.object({
  slug: z.string().max(200).regex(SLUG),
  title: z.string().max(200),
  place: z.string().max(200),
  type: z.enum(PROPERTY_TYPES),
  priceCents: z.number().int().positive(),
  surfaceM2: z.number().nonnegative(),
  rooms: z.number().int().nonnegative(),
  cover: z.string().regex(PHOTO_BASE).nullable(),
});

export const shownListings = z.object({
  kind: z.literal("listings"),
  /** Every listing the search finds. */
  total: z.number().int().nonnegative(),
  /** The parameters of the search page (« ville=…&budget_max=… »), read leniently there. */
  search: z.string().max(600),
  items: z.array(shownListing).max(SHOWN_LISTINGS_MAX),
});

export type ShownListing = z.infer<typeof shownListing>;
export type ShownListings = z.infer<typeof shownListings>;
