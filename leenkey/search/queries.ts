import "server-only";
import { SQL_SORT, toSqlFilters } from "./sql-filters";
import type { DpeClass } from "@/components/shared/dpe-badge";
import { createClient } from "@/lib/supabase/server";
import { chunk } from "@/lib/utils";
import {
  DPE_CLASSES,
  SEARCH_PAGE_SIZE,
  type SearchFilters,
  type SearchQuery,
} from "@/lib/validations/search";
import type { Database } from "@/types/database";

// Reads of the search page (Server Components). Public data through the SQL
// function search_listings (published listings, public columns only), with
// the visitor's session: no service role.

type PropertyType = Database["public"]["Enums"]["property_type"];
type SearchRow = Database["public"]["Functions"]["search_listings"]["Returns"][number];

export type SearchListing = {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  publishedAt: string | null;
  type: PropertyType;
  city: string;
  postalCode: string;
  district: string | null;
  lat: number | null;
  lng: number | null;
  surfaceM2: number;
  rooms: number;
  bedrooms: number | null;
  floor: number | null;
  hasElevator: boolean | null;
  hasBalcony: boolean | null;
  hasTerrace: boolean | null;
  hasGarden: boolean | null;
  hasParking: boolean | null;
  hasCellar: boolean | null;
  dpe: DpeClass | null;
  /** Main photo (base of its files, photo-files.ts) and number of photos; null without. */
  cover: { path: string; total: number } | null;
};

export type SearchResults = { items: SearchListing[]; total: number };
export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

// The generated types declare the columns of a function result as never
// null: the nullable ones are read as such here.
type Nullable<T, K extends keyof T> = Omit<T, K> & { [P in K]: T[P] | null };
type Row = Nullable<
  SearchRow,
  | "published_at"
  | "district"
  | "public_lat"
  | "public_lng"
  | "bedrooms"
  | "floor"
  | "has_elevator"
  | "has_balcony"
  | "has_terrace"
  | "has_garden"
  | "has_parking"
  | "has_cellar"
  | "dpe_class"
>;

function toListing(row: Row): SearchListing {
  const dpe = DPE_CLASSES.find((letter) => letter === row.dpe_class) ?? null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    priceCents: Number(row.price_cents),
    publishedAt: row.published_at,
    type: row.type,
    city: row.city,
    postalCode: row.postal_code,
    district: row.district,
    lat: row.public_lat,
    lng: row.public_lng,
    surfaceM2: Number(row.surface_m2),
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    floor: row.floor,
    hasElevator: row.has_elevator,
    hasBalcony: row.has_balcony,
    hasTerrace: row.has_terrace,
    hasGarden: row.has_garden,
    hasParking: row.has_parking,
    hasCellar: row.has_cellar,
    dpe,
    cover: null,
  };
}

/**
 * Main photos of listings shown as cards (L1-12), 100 listings per call (the
 * bound of public_listing_photos). Without them the cards keep their
 * drawing: a list never fails for a photo.
 */
export async function withCovers(items: SearchListing[]): Promise<SearchListing[]> {
  if (items.length === 0) return items;
  const supabase = await createClient();
  const answers = await Promise.all(
    chunk(
      items.map((item) => item.id),
      100,
    ).map((ids) =>
      supabase.rpc("public_listing_photos", { p_listing_ids: ids, p_cover_only: true }),
    ),
  );
  const covers = new Map<string, { path: string; total: number }>();
  for (const { data, error } of answers) {
    if (error) {
      console.error("[search] covers failed", { code: error.code });
      return items;
    }
    for (const row of data) covers.set(row.listing_id, { path: row.path, total: row.total });
  }
  return items.map((item) => ({ ...item, cover: covers.get(item.id) ?? null }));
}

async function fetchPage(filters: SearchFilters, sort: SearchQuery["sort"], page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_listings", {
    p_filters: toSqlFilters(filters),
    p_sort: SQL_SORT[sort],
    p_page: page,
  });
  if (error) throw new Error(`search_listings: ${error.code} ${error.message}`);
  const rows: Row[] = data ?? [];
  return rows;
}

/**
 * Listings of pages 1 to query.page (« Voir plus » keeps the previous pages),
 * and the total number of matches.
 */
export async function searchListings(query: SearchQuery): Promise<QueryResult<SearchResults>> {
  try {
    const first = await fetchPage(query.filters, query.sort, 1);
    const total = Number(first[0]?.total_count ?? 0);
    const lastPage = Math.min(query.page, Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)));
    const others = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, index) =>
        fetchPage(query.filters, query.sort, index + 2),
      ),
    );
    const items = await withCovers([first, ...others].flat().map(toListing));
    return { ok: true, data: { items, total } };
  } catch (error) {
    console.error("[search] searchListings failed", {
      filters: query.filters,
      sort: query.sort,
      page: query.page,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}

/** Number of listings matching filters (« Voir N biens » of the filters panel). */
export async function countListings(filters: SearchFilters): Promise<QueryResult<number>> {
  try {
    const rows = await fetchPage(filters, "recent", 1);
    return { ok: true, data: Number(rows[0]?.total_count ?? 0) };
  } catch (error) {
    console.error("[search] countListings failed", {
      filters,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
