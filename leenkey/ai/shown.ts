import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/validations/search";

// What a tool that read shows the person in the conversation (AiTool.show):
// the listings of a search (search_listings), as cards; the documents an
// answer was written from (summarize_shared_documents, L3-07), as its
// sources. Sent to the browser
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

/** Documents read for an answer: those of one property at most (25 analysed, L3-05). */
export const SHOWN_DOCUMENTS_MAX = 25;

/**
 * The documents shared with a buyer that the assistant read to answer
 * (summarize_shared_documents): their id and the name their seller gave
 * them, shown as plain text. No address: the list leads to « Documents
 * partagés », where the buyer opens each one with their own rights.
 */
export const shownDocuments = z.object({
  kind: z.literal("documents"),
  items: z
    .array(z.object({ id: z.string().uuid(), title: z.string().min(1).max(200) }))
    .min(1)
    .max(SHOWN_DOCUMENTS_MAX),
});

export type ShownDocuments = z.infer<typeof shownDocuments>;

/**
 * The sources of an answer go under it: a line « documents » is moved after
 * what the assistant then wrote, up to the next message of the person; one
 * no answer followed (the model declined, the turn failed) is not shown.
 */
export function sourcesAfterAnswer<Item extends { kind: string }>(items: readonly Item[]): Item[] {
  const result: Item[] = [];
  let held: Item[] = [];
  let answered = false;
  const flush = () => {
    if (answered) result.push(...held);
    held = [];
    answered = false;
  };
  for (const item of items) {
    if (item.kind === "documents") {
      held.push(item);
    } else {
      if (item.kind === "user") flush();
      else if (item.kind === "assistant" && held.length > 0) answered = true;
      result.push(item);
    }
  }
  flush();
  return result;
}
