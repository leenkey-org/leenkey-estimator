import "server-only";
import type { AiTool } from "@/core/ai/tools/types";
import { placeLabel } from "@/leenkey/search/cards";
import { searchListings, type SearchListing } from "@/leenkey/search/queries";
import {
  appliedCriteria,
  searchParamsOf,
  searchQueryOf,
  searchRequest,
  searchRequestSchema,
  type SearchRequest,
} from "../search-request";
import { SHOWN_LISTINGS_MAX, shownListings, type ShownListings } from "../shown";
import { parisDay } from "./shared";

// search_listings (SPEC-V2 section 12, L2-06): what the buyer asks for in
// their own words becomes a search of the site (search-request.ts), run as
// the search page runs it (the SQL function search_listings: listings
// online, public columns, the session of the buyer). The model reads the 5
// first listings, their number and the criteria really applied; the buyer
// sees them as cards in the conversation, before what the model then says
// of them, with the way to the search page (`show`).

type Output =
  | { error: string }
  | {
      total: number;
      applied: Record<string, unknown>;
      /** The parameters of the search page, for the cards (never an address given by the model). */
      search: string;
      listings: Array<{
        listingId: string;
        slug: string;
        title: string;
        type: SearchListing["type"];
        place: string;
        postalCode: string;
        priceEuros: number;
        livingAreaM2: number;
        rooms: number;
        bedrooms: number | null;
        dpeClass: string | null;
        features: string[];
        publishedOn: string | null;
        cover: string | null;
      }>;
    };

const features = (listing: SearchListing) =>
  [
    listing.hasElevator ? "ascenseur" : null,
    listing.hasBalcony ? "balcon" : null,
    listing.hasTerrace ? "terrasse" : null,
    listing.hasGarden ? "jardin" : null,
    listing.hasParking ? "stationnement" : null,
    listing.hasCellar ? "cave" : null,
  ].filter((value): value is string => value !== null);

export const searchListingsTool: AiTool<SearchRequest, Output> = {
  name: "search_listings",
  description:
    "Search the listings online on Leenkey from what the buyer asks for: a place, a type, a " +
    "budget, surfaces, rooms, outdoor spaces, parking, elevator, energy class. Fill each field " +
    'from the words of the buyer only, and leave every other one empty (« any », "", 0, [], ' +
    "false): " +
    "never add a criterion they did not give. Returns the number of listings found, the criteria " +
    "really applied and the 5 first listings; the buyer sees these listings as cards in the " +
    "conversation, just before your answer, with a link to the whole search.",
  input: searchRequest,
  inputSchema: searchRequestSchema,
  requiresConfirmation: false,
  contexts: ["buyer"],
  async execute(request) {
    const query = searchQueryOf(request);
    const results = await searchListings(query);
    if (!results.ok) return { error: "The search could not be run. Try again later." };
    // Each listing comes with its main photo (searchListings).
    const first = results.data.items.slice(0, SHOWN_LISTINGS_MAX);
    return {
      total: results.data.total,
      applied: appliedCriteria(query, request),
      search: searchParamsOf(query),
      listings: first.map((listing) => ({
        listingId: listing.id,
        slug: listing.slug,
        title: listing.title,
        type: listing.type,
        place: placeLabel(listing.city, listing.district),
        postalCode: listing.postalCode,
        priceEuros: Math.round(listing.priceCents / 100),
        livingAreaM2: listing.surfaceM2,
        rooms: listing.rooms,
        bedrooms: listing.bedrooms,
        dpeClass: listing.dpe,
        features: features(listing),
        publishedOn: parisDay(listing.publishedAt),
        cover: listing.cover?.path ?? null,
      })),
    };
  },
  show(output): ShownListings | null {
    if ("error" in output || output.listings.length === 0) return null;
    const shown = shownListings.safeParse({
      kind: "listings",
      total: output.total,
      search: output.search,
      items: output.listings.map((listing) => ({
        slug: listing.slug,
        title: listing.title,
        place: listing.place,
        type: listing.type,
        priceCents: listing.priceEuros * 100,
        surfaceM2: listing.livingAreaM2,
        rooms: listing.rooms,
        cover: listing.cover,
      })),
    });
    return shown.success ? shown.data : null;
  },
};
