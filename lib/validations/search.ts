import { z } from "zod";
import { slugify } from "@/lib/slug";
import type { Database } from "@/types/database";

// Search filters (SPEC-V2 8.4), shared by the search page and, later, the
// buyer alerts (alerts.criteria, L3-06) and the assistant (L2-06).
// SearchFilters is the stored form: amounts in cents (CLAUDE.md section 9).
// The URL form is French and in euros:
// /acheter?ville=savigny-sur-orge&rayon=5&budget_max=400000&pieces_min=3

type PropertyType = Database["public"]["Enums"]["property_type"];

export const PROPERTY_TYPES = [
  "appartement",
  "maison",
  "terrain",
  "autre",
] as const satisfies readonly PropertyType[];
export const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export const OUTDOOR_SPACES = ["balcon", "terrasse", "jardin"] as const;
export const SEARCH_RADII_KM = [2, 5, 10, 20] as const;
/** recent (default), price ascending, price descending, largest surface, price per m² ascending. */
export const SEARCH_SORTS = ["recent", "prix_asc", "prix_desc", "surface", "prix_m2"] as const;
export const SEARCH_PAGE_SIZE = 20;
/** « Voir plus » shows pages 1 to n: at most 50 pages, 1 000 listings. */
export const SEARCH_MAX_PAGE = 50;

export type OutdoorSpace = (typeof OUTDOOR_SPACES)[number];
export type SearchRadius = (typeof SEARCH_RADII_KM)[number];
export type SearchSort = (typeof SEARCH_SORTS)[number];
export type DpeMax = (typeof DPE_CLASSES)[number];

/** Commune slug (lib/config/launch-zone.ts, or any commune) or a 5-digit postal code. */
const LOCATION_PATTERN = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*|[0-9]{5})$/;
const MAX_PRICE_CENTS = 100_000_000_000;
const MAX_SURFACE_M2 = 100_000;

// A minimum or maximum of 0 means « no limit »: never stored.
const priceCents = z.number().int().min(1).max(MAX_PRICE_CENTS);
const surface = z.number().int().min(1).max(MAX_SURFACE_M2);
const count = z.number().int().min(1).max(20);
const radius = z.union([z.literal(2), z.literal(5), z.literal(10), z.literal(20)]);

export const SearchFilters = z
  .object({
    location: z.string().max(80).regex(LOCATION_PATTERN).optional(),
    radiusKm: radius.optional(),
    type: z.enum(PROPERTY_TYPES).optional(),
    priceMinCents: priceCents.optional(),
    priceMaxCents: priceCents.optional(),
    surfaceMin: surface.optional(),
    surfaceMax: surface.optional(),
    roomsMin: count.optional(),
    bedroomsMin: count.optional(),
    /** At least one of these outdoor spaces. */
    outdoor: z.array(z.enum(OUTDOOR_SPACES)).min(1).max(OUTDOOR_SPACES.length).optional(),
    parking: z.literal(true).optional(),
    elevator: z.literal(true).optional(),
    /** This energy class or a better one. */
    dpeMax: z.enum(DPE_CLASSES).optional(),
  })
  .strict()
  .superRefine((filters, ctx) => {
    if (
      filters.priceMinCents !== undefined &&
      filters.priceMaxCents !== undefined &&
      filters.priceMinCents > filters.priceMaxCents
    ) {
      ctx.addIssue({ code: "custom", path: ["priceMaxCents"], message: "max below min" });
    }
    if (
      filters.surfaceMin !== undefined &&
      filters.surfaceMax !== undefined &&
      filters.surfaceMin > filters.surfaceMax
    ) {
      ctx.addIssue({ code: "custom", path: ["surfaceMax"], message: "max below min" });
    }
    if (filters.radiusKm !== undefined && filters.location === undefined) {
      ctx.addIssue({ code: "custom", path: ["radiusKm"], message: "radius without location" });
    }
    if (filters.outdoor && new Set(filters.outdoor).size !== filters.outdoor.length) {
      ctx.addIssue({ code: "custom", path: ["outdoor"], message: "duplicate outdoor space" });
    }
  });

export type SearchFilters = z.infer<typeof SearchFilters>;

export type SearchQuery = {
  filters: SearchFilters;
  sort: SearchSort;
  /** « Voir plus »: pages 1 to page are shown. */
  page: number;
};

// ---------------------------------------------------------------------------
// URL form
// ---------------------------------------------------------------------------

/** URL keys, in the order they are written. */
const KEYS = {
  location: "ville",
  radiusKm: "rayon",
  type: "type",
  priceMin: "budget_min",
  priceMax: "budget_max",
  surfaceMin: "surface_min",
  surfaceMax: "surface_max",
  roomsMin: "pieces_min",
  bedroomsMin: "chambres_min",
  outdoor: "exterieur",
  parking: "parking",
  elevator: "ascenseur",
  dpeMax: "dpe_max",
  sort: "tri",
  page: "page",
} as const;

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function reader(raw: RawParams) {
  return (key: string): string | undefined => {
    const value = raw instanceof URLSearchParams ? raw.get(key) : raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    const trimmed = first?.trim();
    return trimmed ? trimmed : undefined;
  };
}

/** Whole number written with digits only (spaces allowed: « 400 000 »). */
function wholeNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const digits = value.replace(/[\s\u00A0\u202F]/g, "");
  if (!/^\d{1,12}$/.test(digits)) return undefined;
  return Number(digits);
}

function oneOf<T extends string>(values: readonly T[], value: string | undefined): T | undefined {
  return values.find((candidate) => candidate === value);
}

function inRange(value: number | undefined, schema: z.ZodNumber): number | undefined {
  return value !== undefined && schema.safeParse(value).success ? value : undefined;
}

const isFlag = (value: string | undefined) => value === "1" || value === "true" || value === "oui";

/**
 * Reads the search from the URL. Lenient: an invalid parameter is ignored
 * (never an error page for a hand-edited link), min and max are put back in
 * order, a radius without a commune is dropped. The result always satisfies
 * SearchFilters.
 */
export function parseSearchParams(raw: RawParams): SearchQuery {
  const get = reader(raw);
  const filters: SearchFilters = {};

  // « Savigny sur Orge » or « épinay-sur-orge » typed by hand still work.
  const rawLocation = get(KEYS.location);
  const location =
    rawLocation && (/^\d{5}$/.test(rawLocation) ? rawLocation : slugify(rawLocation));
  if (location && location.length <= 80 && LOCATION_PATTERN.test(location)) {
    filters.location = location;
    const radiusKm = radius.safeParse(wholeNumber(get(KEYS.radiusKm)));
    if (radiusKm.success) filters.radiusKm = radiusKm.data;
  }

  const type = oneOf(PROPERTY_TYPES, get(KEYS.type));
  if (type) filters.type = type;

  const euros = (key: string) => {
    const value = wholeNumber(get(key));
    return value === undefined ? undefined : inRange(value * 100, priceCents);
  };
  let priceMin = euros(KEYS.priceMin);
  let priceMax = euros(KEYS.priceMax);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }
  if (priceMin !== undefined) filters.priceMinCents = priceMin;
  if (priceMax !== undefined) filters.priceMaxCents = priceMax;

  let surfaceMin = inRange(wholeNumber(get(KEYS.surfaceMin)), surface);
  let surfaceMax = inRange(wholeNumber(get(KEYS.surfaceMax)), surface);
  if (surfaceMin !== undefined && surfaceMax !== undefined && surfaceMin > surfaceMax) {
    [surfaceMin, surfaceMax] = [surfaceMax, surfaceMin];
  }
  if (surfaceMin !== undefined) filters.surfaceMin = surfaceMin;
  if (surfaceMax !== undefined) filters.surfaceMax = surfaceMax;

  const roomsMin = inRange(wholeNumber(get(KEYS.roomsMin)), count);
  if (roomsMin !== undefined) filters.roomsMin = roomsMin;
  const bedroomsMin = inRange(wholeNumber(get(KEYS.bedroomsMin)), count);
  if (bedroomsMin !== undefined) filters.bedroomsMin = bedroomsMin;

  const outdoor = OUTDOOR_SPACES.filter((space) =>
    (get(KEYS.outdoor) ?? "").split(",").includes(space),
  );
  if (outdoor.length > 0) filters.outdoor = outdoor;

  if (isFlag(get(KEYS.parking))) filters.parking = true;
  if (isFlag(get(KEYS.elevator))) filters.elevator = true;

  const dpeMax = oneOf(DPE_CLASSES, get(KEYS.dpeMax)?.toUpperCase());
  if (dpeMax) filters.dpeMax = dpeMax;

  const sort = oneOf(SEARCH_SORTS, get(KEYS.sort)) ?? "recent";
  const page = Math.min(Math.max(wholeNumber(get(KEYS.page)) ?? 1, 1), SEARCH_MAX_PAGE);

  return { filters: SearchFilters.parse(filters), sort, page };
}

/** URL parameters of a search, in a fixed order; defaults are left out. */
export function toSearchParams(query: Partial<SearchQuery>): URLSearchParams {
  const params = new URLSearchParams();
  const filters = query.filters ?? {};
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined) params.set(key, String(value));
  };
  set(KEYS.location, filters.location);
  if (filters.location) set(KEYS.radiusKm, filters.radiusKm);
  set(KEYS.type, filters.type);
  const euros = (cents: number | undefined) =>
    cents === undefined ? undefined : Math.round(cents / 100);
  set(KEYS.priceMin, euros(filters.priceMinCents));
  set(KEYS.priceMax, euros(filters.priceMaxCents));
  set(KEYS.surfaceMin, filters.surfaceMin);
  set(KEYS.surfaceMax, filters.surfaceMax);
  set(KEYS.roomsMin, filters.roomsMin);
  set(KEYS.bedroomsMin, filters.bedroomsMin);
  if (filters.outdoor?.length) {
    set(KEYS.outdoor, OUTDOOR_SPACES.filter((space) => filters.outdoor?.includes(space)).join(","));
  }
  if (filters.parking) set(KEYS.parking, 1);
  if (filters.elevator) set(KEYS.elevator, 1);
  set(KEYS.dpeMax, filters.dpeMax);
  if (query.sort && query.sort !== "recent") set(KEYS.sort, query.sort);
  if (query.page && query.page > 1) set(KEYS.page, query.page);
  return params;
}

export const SEARCH_PATH = "/acheter";

/** « /acheter?ville=savigny-sur-orge&rayon=5 », or « /acheter » without parameters. */
export function searchHref(query: Partial<SearchQuery>): string {
  const params = toSearchParams(query).toString();
  return params ? `${SEARCH_PATH}?${params}` : SEARCH_PATH;
}

/**
 * Number of active criteria shown on the filters button: the commune and its
 * radius are in the search field, min and max of the same criterion count once.
 */
export function countActiveFilters(filters: SearchFilters): number {
  return [
    filters.type,
    filters.priceMinCents ?? filters.priceMaxCents,
    filters.surfaceMin ?? filters.surfaceMax,
    filters.roomsMin,
    filters.bedroomsMin,
    filters.outdoor,
    filters.parking,
    filters.elevator,
    filters.dpeMax,
  ].filter((value) => value !== undefined).length;
}
