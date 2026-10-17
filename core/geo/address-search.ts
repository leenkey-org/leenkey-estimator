import { z } from "zod";
import { ADDRESS_FIXTURES } from "./address-fixtures";

// Pure part of the address search (addresses.ts fetches): the query sent to
// the national address base and the reading of its answer, checked with Zod
// (outside data), and the search in the fixtures.

export type Address = {
  /** Number and street, or the place: « 12 Rue de la Gare ». */
  line: string;
  postalCode: string;
  city: string;
  /** « 12 Rue de la Gare 91360 Épinay-sur-Orge ». */
  label: string;
  lat: number;
  lng: number;
};

export type AddressQuery = {
  /** At least 3 characters (the service refuses less). */
  text: string;
  /** Results near this point first. */
  near?: { lat: number; lng: number };
  limit?: number;
};

export type AddressResult = { ok: true; data: Address[] } | { ok: false; error: "unavailable" };

export const DEFAULT_GEOCODER_URL = "https://data.geopf.fr/geocodage/search";

const featureSchema = z.object({
  geometry: z.object({
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  }),
  properties: z.object({
    // The bounds of the columns of properties and of addressChoiceSchema.
    label: z.string().min(5).max(200),
    name: z.string().min(3).max(200),
    postcode: z.string().regex(/^[0-9]{5}$/),
    city: z.string().min(1).max(100),
    type: z.string(),
  }),
});
const responseSchema = z.object({ features: z.array(z.unknown()) });

/** Letters without accents nor case, to compare what is typed and the fixtures. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Same address label, whatever the case and the spaces. */
export function sameAddressLabel(a: string, b: string): boolean {
  const compact = (label: string) => label.replace(/\s+/g, " ").trim().toLocaleLowerCase("fr-FR");
  return compact(a) === compact(b);
}

export function searchFixtures(text: string, limit: number): Address[] {
  const words = fold(text)
    .split(/[\s,]+/)
    .filter(Boolean);
  return ADDRESS_FIXTURES.filter((address) => {
    const label = fold(address.label);
    return words.every((word) => label.includes(word));
  }).slice(0, limit);
}

/**
 * Query of the Géoplateforme (same parameters as the former api-adresse;
 * the search completes the last word by default).
 */
export function addressSearchUrl(base: string, { text, near, limit = 5 }: AddressQuery): URL {
  const url = new URL(base);
  url.searchParams.set("q", text);
  url.searchParams.set("index", "address");
  url.searchParams.set("limit", String(limit));
  if (near) {
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  return url;
}

/**
 * Addresses of an answer (GeoJSON): an unreadable entry, one that the base
 * cannot store, or a town alone is left out.
 */
export function readAddresses(body: unknown): Address[] {
  const { features } = responseSchema.parse(body);
  return features.flatMap((feature) => {
    const parsed = featureSchema.safeParse(feature);
    // A town alone is not an address.
    if (!parsed.success || parsed.data.properties.type === "municipality") return [];
    const { properties, geometry } = parsed.data;
    const [lng, lat] = geometry.coordinates;
    return [
      {
        line: properties.name,
        postalCode: properties.postcode,
        city: properties.city,
        label: properties.label,
        lat,
        lng,
      },
    ];
  });
}
