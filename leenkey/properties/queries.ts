import "server-only";
import { cache } from "react";
import { requireProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  HEATING_OPTIONS,
  missingCharacteristics,
  PROPERTY_FEATURES,
  type Characteristics,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";
import type { Database } from "@/types/database";

// Properties of the signed-in seller (L1-11), with their session: RLS only
// shows their own, not deleted.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type SellerProperty = {
  id: string;
  address: { line: string; postalCode: string; city: string };
  /** Values of the form of step 2 (amounts in euros). */
  characteristics: Omit<Characteristics, "propertyId">;
  listingStatus: ListingStatus | null;
  createdAt: string;
};

/** Where a draft resumes: the step after the last one filled. */
export type CreationStep = "caracteristiques" | "prix";

const COLUMNS =
  "id, type, address_line, postal_code, city, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, build_year, is_new_build, dpe_class, ges_class, heating, has_balcony, has_terrace, has_garden, has_parking, has_cellar, has_elevator, charges_monthly_cents, property_tax_yearly_cents, copro_lots, created_at, listing:listings(status)";

type Row = {
  id: string;
  type: Database["public"]["Enums"]["property_type"] | null;
  address_line: string;
  postal_code: string;
  city: string;
  surface_m2: number | null;
  carrez_m2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  floor: number | null;
  floors_total: number | null;
  build_year: number | null;
  is_new_build: boolean;
  dpe_class: string | null;
  ges_class: string | null;
  heating: string | null;
  has_balcony: boolean | null;
  has_terrace: boolean | null;
  has_garden: boolean | null;
  has_parking: boolean | null;
  has_cellar: boolean | null;
  has_elevator: boolean | null;
  charges_monthly_cents: number | null;
  property_tax_yearly_cents: number | null;
  copro_lots: number | null;
  created_at: string;
  listing: { status: ListingStatus } | { status: ListingStatus }[] | null;
};

const FEATURE_COLUMNS: Record<PropertyFeature, keyof Row> = {
  balcony: "has_balcony",
  terrace: "has_terrace",
  garden: "has_garden",
  parking: "has_parking",
  cellar: "has_cellar",
  elevator: "has_elevator",
};

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | null =>
  values.find((candidate) => candidate === value) ?? null;
const euros = (cents: number | null) => (cents === null ? null : Math.round(cents / 100));

function toSellerProperty(row: Row): SellerProperty {
  const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
  return {
    id: row.id,
    address: { line: row.address_line, postalCode: row.postal_code, city: row.city },
    characteristics: {
      type: oneOf(PROPERTY_TYPES, row.type),
      surfaceM2: row.surface_m2 === null ? null : Number(row.surface_m2),
      carrezM2: row.carrez_m2 === null ? null : Number(row.carrez_m2),
      rooms: row.rooms,
      bedrooms: row.bedrooms,
      floor: row.floor,
      floorsTotal: row.floors_total,
      buildYear: row.build_year,
      isNewBuild: row.is_new_build,
      dpe: oneOf(DPE_CLASSES, row.dpe_class),
      ges: oneOf(DPE_CLASSES, row.ges_class),
      heating: oneOf(HEATING_OPTIONS, row.heating),
      features: PROPERTY_FEATURES.filter((feature) => row[FEATURE_COLUMNS[feature]] === true),
      chargesMonthlyEuros: euros(row.charges_monthly_cents),
      propertyTaxYearlyEuros: euros(row.property_tax_yearly_cents),
      coproLots: row.copro_lots,
    },
    listingStatus: listing?.status ?? null,
    createdAt: row.created_at,
  };
}

/** Step where the creation of a draft resumes. */
export function creationStep(property: SellerProperty): CreationStep {
  return missingCharacteristics(property.characteristics).length > 0 ? "caracteristiques" : "prix";
}

/** A property of the seller; null when unknown, deleted or someone else's. */
export const sellerProperty = cache(async function sellerProperty(
  id: string,
): Promise<QueryResult<SellerProperty | null>> {
  const profile = await requireProfile();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select(COLUMNS)
      .eq("id", id)
      .eq("owner_id", profile.id)
      .is("deleted_at", null)
      .maybeSingle<Row>();
    if (error) throw new Error(`properties: ${error.code} ${error.message}`);
    return { ok: true, data: data ? toSellerProperty(data) : null };
  } catch (error) {
    console.error("[properties] read failed", {
      user_id: profile.id,
      entity_id: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
});

/** The properties of the seller, the most recent first (the seller home). */
export async function sellerProperties(profileId: string): Promise<QueryResult<SellerProperty[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select(COLUMNS)
      .eq("owner_id", profileId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Row[]>();
    if (error) throw new Error(`properties: ${error.code} ${error.message}`);
    return { ok: true, data: data.map(toSellerProperty) };
  } catch (error) {
    console.error("[properties] list failed", {
      user_id: profileId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
