import { z } from "zod";
import type { ToolInputSchema } from "@/core/ai/tools/types";
import { locationFromText, resolveLocation } from "@/leenkey/search/location";
import {
  DPE_CLASSES,
  OUTDOOR_SPACES,
  PROPERTY_TYPES,
  SEARCH_SORTS,
  parseSearchParams,
  toSearchParams,
  type SearchQuery,
} from "@/lib/validations/search";

// search_listings (SPEC-V2 section 12, L2-06): what a buyer asks for in
// their own words, as the model writes it down, and the search of the site
// it becomes (SearchFilters, lib/validations/search.ts). The model fills
// every field (a strict schema has no optional one): « any », an empty
// string for the place, a zero, an empty list or false mean « no such
// criterion ». A place is a commune or a postal code of 5 digits, the only
// ones the search knows: a department number or a region is no place here. The search page
// reads its own address leniently (an out-of-range value is dropped, a
// minimum above its maximum swapped): the same reading here, so that a
// search of the assistant is always one the page can show.

/** « No such criterion », where the choices are a closed list. */
export const ANY = "any";

export const searchRequest = z.object({
  location: z.string().max(120),
  radiusKm: z.number().int().min(0).max(1_000),
  propertyType: z.enum([ANY, ...PROPERTY_TYPES]),
  budgetMinEuros: z.number().int().min(0),
  budgetMaxEuros: z.number().int().min(0),
  surfaceMinM2: z.number().int().min(0),
  surfaceMaxM2: z.number().int().min(0),
  roomsMin: z.number().int().min(0),
  bedroomsMin: z.number().int().min(0),
  outdoor: z.array(z.enum(OUTDOOR_SPACES)).max(OUTDOOR_SPACES.length),
  parking: z.boolean(),
  elevator: z.boolean(),
  dpeMax: z.enum([ANY, ...DPE_CLASSES]),
  sort: z.enum(SEARCH_SORTS),
});

export type SearchRequest = z.infer<typeof searchRequest>;

const none = "0 when the buyer gave none.";

export const searchRequestSchema: ToolInputSchema = {
  type: "object",
  properties: {
    location: {
      type: "string",
      description:
        "The commune as the buyer named it (« Savigny-sur-Orge ») or a 5-digit postal code; an " +
        "empty string when they named no place. Only a commune or a 5-digit postal code can be " +
        "searched: for a department (« le 91 », « l'Essonne »), a region or a country, leave it " +
        "empty and tell the buyer the search takes a commune. One place only: for several " +
        "communes, search the first one, with a radius when they are close.",
    },
    radiusKm: {
      type: "integer",
      enum: [0, 2, 5, 10, 20],
      description:
        "Radius around the commune, in km, when the buyer accepts the surroundings (« autour " +
        "de », « à 10 km », « et alentours »: 5 when no distance is given); 0 for the commune only.",
    },
    propertyType: {
      type: "string",
      enum: [ANY, ...PROPERTY_TYPES],
      description: "The type of property; « any » when the buyer named none.",
    },
    budgetMinEuros: { type: "integer", description: `Lowest price, in euros; ${none}` },
    budgetMaxEuros: {
      type: "integer",
      description: `Highest price, in euros (« 300 k€ », « 300 000 euros maximum », « jusqu'à 300 000 »); ${none}`,
    },
    surfaceMinM2: { type: "integer", description: `Smallest living area, in m²; ${none}` },
    surfaceMaxM2: { type: "integer", description: `Largest living area, in m²; ${none}` },
    roomsMin: {
      type: "integer",
      description: `Fewest main rooms (« pièces »; a T3 or F3 has 3 rooms, a studio 1); ${none}`,
    },
    bedroomsMin: { type: "integer", description: `Fewest bedrooms (« chambres »); ${none}` },
    outdoor: {
      type: "array",
      items: { type: "string", enum: [...OUTDOOR_SPACES] },
      description:
        "Outdoor spaces asked for: a listing with at least one of them is kept (« un " +
        "extérieur » is the three of them); an empty list when none is asked for.",
    },
    parking: {
      type: "boolean",
      description: "True when the buyer asks for a parking space or a garage.",
    },
    elevator: { type: "boolean", description: "True when the buyer asks for an elevator." },
    dpeMax: {
      type: "string",
      enum: [ANY, ...DPE_CLASSES],
      description:
        "The worst energy class (DPE) accepted: this class or a better one (« DPE C au " +
        "minimum », « pas de passoire thermique » is E); « any » when not asked.",
    },
    sort: {
      type: "string",
      enum: [...SEARCH_SORTS],
      description:
        "Order of the results: recent (the default), prix_asc (cheapest first), prix_desc, " +
        "surface (largest first), prix_m2 (lowest price per m² first).",
    },
  },
  required: [
    "location",
    "radiusKm",
    "propertyType",
    "budgetMinEuros",
    "budgetMaxEuros",
    "surfaceMinM2",
    "surfaceMaxM2",
    "roomsMin",
    "bedroomsMin",
    "outdoor",
    "parking",
    "elevator",
    "dpeMax",
    "sort",
  ],
  additionalProperties: false,
};

const positive = (value: number) => (value > 0 ? String(value) : undefined);
const chosen = (value: string) => (value === ANY ? undefined : value);

/**
 * The place of a request as the search takes it; undefined when it names
 * none the search knows: digits that are not a postal code (« 91 » would
 * otherwise be read as the first commune whose postal code starts with it).
 */
export function placeOf(location: string): string | undefined {
  const text = location.trim();
  if (/^[\d\s]+$/.test(text) && !/^\d{5}$/.test(text)) return undefined;
  return locationFromText(text);
}

/** The search of the site a request becomes: its first page, always a valid one. */
export function searchQueryOf(request: SearchRequest): SearchQuery {
  const location = placeOf(request.location);
  // The parameters of the search page, read as the page reads its address.
  const query = parseSearchParams({
    ville: location,
    rayon: location ? positive(request.radiusKm) : undefined,
    type: chosen(request.propertyType),
    budget_min: positive(request.budgetMinEuros),
    budget_max: positive(request.budgetMaxEuros),
    surface_min: positive(request.surfaceMinM2),
    surface_max: positive(request.surfaceMaxM2),
    pieces_min: positive(request.roomsMin),
    chambres_min: positive(request.bedroomsMin),
    exterieur: request.outdoor.length > 0 ? request.outdoor.join(",") : undefined,
    parking: request.parking ? "1" : undefined,
    ascenseur: request.elevator ? "1" : undefined,
    dpe_max: chosen(request.dpeMax),
    tri: request.sort,
  });
  return { ...query, page: 1 };
}

/** The parameters of the search page for a search (« ville=…&budget_max=… »). */
export function searchParamsOf(query: SearchQuery): string {
  return toSearchParams(query).toString();
}

/**
 * The criteria really applied, as the model reads them back: the place as
 * the site understood it (a commune of the launch zone, or the words of the
 * buyer as a commune), and what was dropped (a radius around a commune whose
 * centre the site does not know).
 */
export function appliedCriteria(
  query: SearchQuery,
  request?: Pick<SearchRequest, "location">,
): Record<string, unknown> {
  const { filters } = query;
  const place = filters.location ? resolveLocation(filters.location) : null;
  const radius = place?.centre ? filters.radiusKm : undefined;
  // A place given and not searched (a department number): said, never silent.
  const dropped = !place && request && request.location.trim() !== "";
  return {
    ...(place ? { place: place.label } : {}),
    ...(dropped
      ? {
          placeNote:
            "No place applied: the search takes a commune or a 5-digit postal code. Every " +
            "commune was searched.",
        }
      : {}),
    ...(radius ? { radiusKm: radius } : {}),
    ...(filters.radiusKm && !radius
      ? { radiusNote: "No radius applied: this commune is searched alone." }
      : {}),
    ...(filters.type ? { propertyType: filters.type } : {}),
    ...(filters.priceMinCents ? { budgetMinEuros: filters.priceMinCents / 100 } : {}),
    ...(filters.priceMaxCents ? { budgetMaxEuros: filters.priceMaxCents / 100 } : {}),
    ...(filters.surfaceMin ? { surfaceMinM2: filters.surfaceMin } : {}),
    ...(filters.surfaceMax ? { surfaceMaxM2: filters.surfaceMax } : {}),
    ...(filters.roomsMin ? { roomsMin: filters.roomsMin } : {}),
    ...(filters.bedroomsMin ? { bedroomsMin: filters.bedroomsMin } : {}),
    ...(filters.outdoor ? { outdoor: filters.outdoor } : {}),
    ...(filters.parking ? { parking: true } : {}),
    ...(filters.elevator ? { elevator: true } : {}),
    ...(filters.dpeMax ? { dpeMax: filters.dpeMax } : {}),
    sort: query.sort,
  };
}
