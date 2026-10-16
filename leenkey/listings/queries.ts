import "server-only";
import { cache } from "react";
import type { DpeClass } from "@/components/shared/dpe-badge";
import { createClient } from "@/lib/supabase/server";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { Database } from "@/types/database";

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
};

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

// Every public column but the raw geography (public_location).
const COLUMNS =
  "id, slug, reference, title, description, price_cents, published_at, type, city, postal_code, district, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, charges_monthly_cents, property_tax_yearly_cents, copro_lots, seller_first_name, plan";

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
      const supabase = await createClient();
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
