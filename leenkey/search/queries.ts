import "server-only";
import { unstable_rethrow } from "next/navigation";
import { groupPhotos, type PhotoRow } from "./photos";
import { SQL_SORT, toSqlFilters } from "./sql-filters";
import type { DpeClass } from "@/components/shared/dpe-badge";
import { isSupabaseConfigured } from "@/lib/supabase/config";
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
  /** Up to five photos, the main one first, for the photos of a card (search, L1-55). */
  photos?: string[];
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

/**
 * Listings per call of public_listing_photos with all their photos: 15 each
 * at most (MAX_PHOTOS of leenkey/properties/photo-files.ts), under the 1 000
 * rows of a PostgREST answer.
 */
const PHOTO_BATCH = 60;

/**
 * The photos of listings shown as cards that turn through them (L1-55): up
 * to five each, the main one first, and their number. Without them the cards
 * keep their drawing: a list never fails for a photo.
 */
export async function withPhotos(items: SearchListing[]): Promise<SearchListing[]> {
  if (items.length === 0) return items;
  const supabase = await createClient();
  const answers = await Promise.all(
    chunk(
      items.map((item) => item.id),
      PHOTO_BATCH,
    ).map((ids) =>
      supabase.rpc("public_listing_photos", { p_listing_ids: ids, p_cover_only: false }),
    ),
  );
  const rows: PhotoRow[] = [];
  for (const { data, error } of answers) {
    if (error) {
      console.error("[search] photos failed", { code: error.code });
      return items;
    }
    rows.push(...data);
  }
  const photos = groupPhotos(rows);
  return items.map((item) => {
    const entry = photos.get(item.id);
    const first = entry?.paths[0];
    return {
      ...item,
      cover: entry && first ? { path: first, total: entry.total } : null,
      photos: entry?.paths ?? [],
    };
  });
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
    const items = await withPhotos([first, ...others].flat().map(toListing));
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

export type HomeListings = {
  items: SearchListing[];
  /** Up to five photos per listing, the main one first. */
  photos: Record<string, Array<{ path: string; caption: string }>>;
  total: number;
};

/** Where the home page looks: around Épinay-sur-Orge, 10 km (docs/design-handoff/SPECS.md 3). */
export const HOME_LISTINGS_FILTERS = { location: "epinay-sur-orge", radiusKm: 10 } as const;

/**
 * « Biens à vendre près de chez vous » of the home page of direction C
 * (docs/design-handoff/SPECS.md 3, item 7): the listings online around
 * Épinay-sur-Orge within 10 km, the most recent first, two pages at most,
 * their photos (five each at most) and how many there are. Without a
 * database (CI build, previews), nothing: the section is left out.
 */
export async function homeListings(): Promise<QueryResult<HomeListings>> {
  if (!isSupabaseConfigured()) return { ok: false, error: "unavailable" };
  try {
    const first = await fetchPage(HOME_LISTINGS_FILTERS, "recent", 1);
    const total = Number(first[0]?.total_count ?? 0);
    const second =
      total > SEARCH_PAGE_SIZE ? await fetchPage(HOME_LISTINGS_FILTERS, "recent", 2) : [];
    const items = [...first, ...second].map(toListing);
    const supabase = await createClient();
    const photos: HomeListings["photos"] = {};
    for (const ids of chunk(
      items.map((item) => item.id),
      100,
    )) {
      const { data, error } = await supabase.rpc("public_listing_photos", {
        p_listing_ids: ids,
        p_cover_only: false,
      });
      // Without them the cards keep their drawing: a list never fails for a photo.
      if (error) {
        console.error("[search] home photos failed", { code: error.code });
        break;
      }
      for (const row of [...data].sort((a, b) => a.position - b.position)) {
        const list = (photos[row.listing_id] ??= []);
        if (list.length < 5) list.push({ path: row.path, caption: row.caption });
      }
    }
    return { ok: true, data: { items, photos, total } };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[search] homeListings failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
