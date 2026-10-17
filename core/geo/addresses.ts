import "server-only";
import {
  addressSearchUrl,
  DEFAULT_GEOCODER_URL,
  readAddresses,
  searchFixtures,
  type AddressQuery,
  type AddressResult,
} from "./address-search";

export type { Address, AddressQuery, AddressResult } from "./address-search";

// Address search and geocoding, for France: the national address base (BAN),
// served by the Géoplateforme of IGN. Free, without key, and its results may
// be stored (the free geocoding of Mapbox forbids it). GEOCODER_URL changes
// the service, GEOCODER=fixtures answers from a short list instead
// (address-fixtures.ts): end-to-end tests, environment without access.

export async function searchAddresses(query: AddressQuery): Promise<AddressResult> {
  if (process.env.GEOCODER === "fixtures") {
    return { ok: true, data: searchFixtures(query.text, query.limit ?? 5) };
  }
  const url = addressSearchUrl(process.env.GEOCODER_URL || DEFAULT_GEOCODER_URL, query);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return { ok: true, data: readAddresses(await response.json()) };
  } catch (error) {
    console.error("[geo] address search failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
