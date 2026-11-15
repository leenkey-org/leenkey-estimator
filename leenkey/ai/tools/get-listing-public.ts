import "server-only";
import { z } from "zod";
import type { AiTool } from "@/core/ai/tools/types";
import { listingFacts } from "../buyer-data";

// get_listing_public (SPEC-V2 section 12, L2-06): a listing online as anyone
// reads it on its page: its characteristics, its price, its description, its
// energy classes, the first name of its seller. Never its address, never
// anything of its seller's file.

const input = z.object({ listingId: z.string().uuid() });
type Input = z.infer<typeof input>;

export const LISTING_NOT_FOUND =
  "No listing online has this id. Use an id given by search_listings or by the file of the buyer.";

export const getListingPublicTool: AiTool<Input, unknown> = {
  name: "get_listing_public",
  description:
    "Read one listing online, as its public page shows it: title, description written by its " +
    "seller, price, type, commune, surfaces, rooms, floor, features, energy classes (DPE, GES), " +
    "heating, charges, property tax, lots of the co-ownership, first name of the seller. Never " +
    "its address. Use it before answering a question about a listing.",
  input,
  inputSchema: {
    type: "object",
    properties: {
      listingId: {
        type: "string",
        description:
          "Id of a listing online (from search_listings, or the listing the buyer is reading " +
          "or made an offer on, in their file).",
      },
    },
    required: ["listingId"],
    additionalProperties: false,
  },
  requiresConfirmation: false,
  contexts: ["buyer"],
  async execute({ listingId }) {
    const found = await listingFacts(listingId, { withSummary: true });
    if (!found.ok) return { error: "The listing could not be read. Try again later." };
    if (!found.data) return { error: LISTING_NOT_FOUND };
    // Never an address of a page: the model writes plain text, a link would not open.
    const { slug: _slug, ...facts } = found.data;
    return facts;
  },
};
