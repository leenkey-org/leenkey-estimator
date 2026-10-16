import { resolveLocation } from "./location";
import type { OutdoorSpace, SearchFilters, SearchSort } from "@/lib/validations/search";

// SearchFilters (app, French URL vocabulary) → p_filters of the SQL function
// search_listings (supabase/migrations/20261016100000_search_listings.sql).

export type SqlSearchFilters = {
  type?: SearchFilters["type"];
  price_min_cents?: number;
  price_max_cents?: number;
  surface_min?: number;
  surface_max?: number;
  rooms_min?: number;
  bedrooms_min?: number;
  outdoor?: Array<"balcony" | "terrace" | "garden">;
  parking?: boolean;
  elevator?: boolean;
  dpe_max?: SearchFilters["dpeMax"];
  city?: string;
  postal_code?: string;
  radius_km?: number;
  center_lat?: number;
  center_lng?: number;
};

const OUTDOOR: Record<OutdoorSpace, "balcony" | "terrace" | "garden"> = {
  balcon: "balcony",
  terrasse: "terrace",
  jardin: "garden",
};

export const SQL_SORT: Record<
  SearchSort,
  "recent" | "price_asc" | "price_desc" | "surface_desc" | "price_m2_asc"
> = {
  recent: "recent",
  prix_asc: "price_asc",
  prix_desc: "price_desc",
  surface: "surface_desc",
  prix_m2: "price_m2_asc",
};

export function toSqlFilters(filters: SearchFilters): SqlSearchFilters {
  const sql: SqlSearchFilters = {};
  if (filters.type) sql.type = filters.type;
  if (filters.priceMinCents !== undefined) sql.price_min_cents = filters.priceMinCents;
  if (filters.priceMaxCents !== undefined) sql.price_max_cents = filters.priceMaxCents;
  if (filters.surfaceMin !== undefined) sql.surface_min = filters.surfaceMin;
  if (filters.surfaceMax !== undefined) sql.surface_max = filters.surfaceMax;
  if (filters.roomsMin !== undefined) sql.rooms_min = filters.roomsMin;
  if (filters.bedroomsMin !== undefined) sql.bedrooms_min = filters.bedroomsMin;
  if (filters.outdoor?.length) sql.outdoor = filters.outdoor.map((space) => OUTDOOR[space]);
  if (filters.parking) sql.parking = true;
  if (filters.elevator) sql.elevator = true;
  if (filters.dpeMax) sql.dpe_max = filters.dpeMax;
  if (filters.location) {
    const place = resolveLocation(filters.location);
    if (place.citySlug) sql.city = place.citySlug;
    if (place.postalCode) sql.postal_code = place.postalCode;
    // Outside the launch zone the centre is unknown: the commune only.
    if (filters.radiusKm && place.centre) {
      sql.radius_km = filters.radiusKm;
      sql.center_lat = place.centre.lat;
      sql.center_lng = place.centre.lng;
    }
  }
  return sql;
}
