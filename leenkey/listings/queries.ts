import "server-only";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { cache } from "react";
import type { DpeClass } from "@/components/shared/dpe-badge";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/public";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { Database } from "@/types/database";
import type { SitemapListing } from "./sitemap";

// Public listing page (SPEC-V2 8.5): reads public_listings only (published
// listings, public columns), with the visitor's session. Anything else is
// « not found ».

type PropertyType = Database["public"]["Enums"]["property_type"];

export type PublicListing = {
  id: string;
  slug: string;
  reference: string;
  title: string;
  description: string;
  priceCents: number;
  publishedAt: string | null;
  type: PropertyType;
  city: string;
  postalCode: string;
  district: string | null;
  surfaceM2: number;
  carrezM2: number | null;
  rooms: number;
  bedrooms: number | null;
  floor: number | null;
  floorsTotal: number | null;
  hasElevator: boolean | null;
  hasBalcony: boolean | null;
  hasTerrace: boolean | null;
  hasGarden: boolean | null;
  hasParking: boolean | null;
  hasCellar: boolean | null;
  orientation: string | null;
  buildYear: number | null;
  isNewBuild: boolean | null;
  dpe: DpeClass | null;
  ges: DpeClass | null;
  heating: string | null;
  chargesMonthlyCents: number | null;
  propertyTaxYearlyCents: number | null;
  coproLots: number | null;
  sellerFirstName: string | null;
  /** The plan of the sale includes a Leenkey adviser (plan_entitlements). */
  accompanied: boolean;
  /** In their order, the first is the main one (L1-12). */
  photos: ListingPhoto[];
  /**
   * The public location (about 200 m from the property, never its address),
   * for the map of the area (L1-16); read on the public page only.
   */
  location?: { lat: number; lng: number } | null;
};

export type ListingPhoto = {
  /** Base of its files (leenkey/properties/photo-files.ts). */
  path: string;
  width: number | null;
  height: number | null;
  caption: string | null;
};

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

// Every public column but the raw geography (public_location), read as
// public_lat and public_lng.
const COLUMNS =
  "id, slug, reference, title, description, price_cents, published_at, type, city, postal_code, district, public_lat, public_lng, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, charges_monthly_cents, property_tax_yearly_cents, copro_lots, seller_first_name, plan";

/** Same shape as listings.slug (L1-04). */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const energyClass = (value: string | null): DpeClass | null =>
  DPE_CLASSES.find((letter) => letter === value) ?? null;

/**
 * Published listing by its slug, null when there is none (unknown, draft,
 * paused, suspended, sold…). Cached for the request: generateMetadata and
 * the page share one read.
 */
export const getPublicListing = cache(
  async (slug: string): Promise<QueryResult<PublicListing | null>> => {
    if (slug.length > 200 || !SLUG.test(slug)) return { ok: true, data: null };
    try {
      // Public data, also read by the cached share image: no session cookie.
      const supabase = createPublicClient();
      const [listing, advisorPlans] = await Promise.all([
        supabase.from("public_listings").select(COLUMNS).eq("slug", slug).maybeSingle(),
        // « Vente accompagnée » is a right of the plan, never a plan name (CLAUDE.md 14).
        supabase.from("plan_entitlements").select("plan").eq("feature", "advisor"),
      ]);
      if (listing.error) throw new Error(`public_listings: ${listing.error.message}`);
      if (advisorPlans.error) throw new Error(`plan_entitlements: ${advisorPlans.error.message}`);
      const row = listing.data;
      if (
        !row?.id ||
        !row.slug ||
        !row.reference ||
        !row.title ||
        row.description === null ||
        row.price_cents === null ||
        !row.type ||
        !row.city ||
        !row.postal_code ||
        row.surface_m2 === null ||
        row.rooms === null
      ) {
        return { ok: true, data: null };
      }
      // Without its photos the page still shows: the gallery keeps the drawing.
      const photos = await supabase.rpc("public_listing_photos", { p_listing_ids: [row.id] });
      if (photos.error) {
        console.error("[listings] photos read failed", {
          entity_id: row.id,
          code: photos.error.code,
        });
      }
      return {
        ok: true,
        data: {
          id: row.id,
          slug: row.slug,
          reference: row.reference,
          title: row.title,
          description: row.description,
          priceCents: Number(row.price_cents),
          publishedAt: row.published_at,
          type: row.type,
          city: row.city,
          postalCode: row.postal_code,
          district: row.district,
          location:
            row.public_lat === null || row.public_lng === null
              ? null
              : { lat: row.public_lat, lng: row.public_lng },
          surfaceM2: Number(row.surface_m2),
          carrezM2: row.carrez_m2 === null ? null : Number(row.carrez_m2),
          rooms: row.rooms,
          bedrooms: row.bedrooms,
          floor: row.floor,
          floorsTotal: row.floors_total,
          hasElevator: row.has_elevator,
          hasBalcony: row.has_balcony,
          hasTerrace: row.has_terrace,
          hasGarden: row.has_garden,
          hasParking: row.has_parking,
          hasCellar: row.has_cellar,
          orientation: row.orientation,
          buildYear: row.build_year,
          isNewBuild: row.is_new_build,
          dpe: energyClass(row.dpe_class),
          ges: energyClass(row.ges_class),
          heating: row.heating,
          chargesMonthlyCents: row.charges_monthly_cents,
          propertyTaxYearlyCents: row.property_tax_yearly_cents,
          coproLots: row.copro_lots,
          sellerFirstName: row.seller_first_name,
          accompanied: (advisorPlans.data ?? []).some((entry) => entry.plan === row.plan),
          photos: (photos.data ?? []).map((photo) => ({
            path: photo.path,
            // Generated types declare the columns of a function result as never null.
            width: (photo.width as number | null) ?? null,
            height: (photo.height as number | null) ?? null,
            caption: (photo.caption as string | null) ?? null,
          })),
        },
      };
    } catch (error) {
      console.error("[listings] getPublicListing failed", {
        slug,
        error: error instanceof Error ? error.message : String(error),
      });
      return { ok: false, error: "unavailable" };
    }
  },
);

// PostgREST answers 1 000 rows at most per request (max_rows of Supabase).
const SITEMAP_PAGE = 1000;
const SITEMAP_MAX = 10_000;

/**
 * Published listings for /sitemap.xml (L1-20), most recent first, by pages
 * until the count read with the first one (a lower max_rows only adds pages),
 * each slug once (a listing published between two pages shifts them).
 * Without Supabase, or when the database cannot be read in time during the
 * build: none, the sitemap goes out with its other pages. At runtime, the
 * error goes up: Next keeps serving the last sitemap built (ISR) instead of
 * one without listings for an hour.
 */
export async function sitemapListings(): Promise<SitemapListing[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const client = createPublicClient();
    const listings: SitemapListing[] = [];
    const slugs = new Set<string>();
    let total = SITEMAP_MAX;
    for (let from = 0; from < Math.min(total, SITEMAP_MAX); ) {
      const { data, error, count } = await client
        .from("public_listings")
        .select("slug, published_at", { count: from === 0 ? "exact" : undefined })
        .order("published_at", { ascending: false })
        .order("slug")
        .range(from, from + SITEMAP_PAGE - 1)
        .abortSignal(AbortSignal.timeout(5_000));
      if (error) throw new Error(`public_listings: ${error.code} ${error.message}`);
      if (from === 0 && count !== null) total = count;
      if (data.length === 0) break;
      for (const row of data) {
        if (row.slug && !slugs.has(row.slug)) {
          slugs.add(row.slug);
          listings.push({ slug: row.slug, publishedAt: row.published_at });
        }
      }
      from += data.length;
    }
    return listings;
  } catch (error) {
    console.error("[sitemap] listings read failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return [];
    throw error;
  }
}
