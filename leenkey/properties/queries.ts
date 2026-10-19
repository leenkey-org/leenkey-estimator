import "server-only";
import { cache } from "react";
import { requireProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  HEATING_OPTIONS,
  PROPERTY_FEATURES,
  type Characteristics,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";
import type { Database } from "@/types/database";
import { readPhotos, type SellerPhoto } from "./photos";

// Properties of the signed-in seller (L1-11), with their session: RLS only
// shows their own, not deleted.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

/** The listing of the property, created by step 3 (L1-13) with its price. */
export type SellerListing = {
  id: string;
  reference: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  /** Why Leenkey refused it (rejected), until it is sent again. */
  rejectionReason: string | null;
};

/** The analysis of value the property comes from (estimator, L1-13). */
export type SellerEstimation = {
  valueCents: number;
  lowCents: number | null;
  highCents: number | null;
  /** When the analysis was made; null when it cannot be read. */
  madeAt: string | null;
};

export type SellerProperty = {
  id: string;
  address: { line: string; postalCode: string; city: string };
  /** Values of the form of step 2 (amounts in euros). */
  characteristics: Omit<Characteristics, "propertyId">;
  listingStatus: ListingStatus | null;
  listing: SellerListing | null;
  estimation: SellerEstimation | null;
  /** When the analysis of value it was created from was made (L1-13b). */
  fromEstimation: string | null;
  /** Base of the files of the main photo (photo-files.ts), null without photos. */
  coverPath: string | null;
  createdAt: string;
};

const COLUMNS =
  "id, type, address_line, postal_code, city, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, build_year, is_new_build, dpe_class, ges_class, heating, has_balcony, has_terrace, has_garden, has_parking, has_cellar, has_elevator, charges_monthly_cents, property_tax_yearly_cents, copro_lots, created_at, estimation_value_cents, estimation_low_cents, estimation_high_cents, estimation:estimations(created_at), listing:listings(id, reference, title, description, price_cents, status, rejection_reason), photos(storage_path, is_cover)";

type Row = NonNullable<Awaited<ReturnType<typeof readOne>>["data"]>;

/** Typed by the select (types/database.ts): the row of one property. */
async function readOne(id: string, ownerId: string) {
  const supabase = await createClient();
  return supabase
    .from("properties")
    .select(COLUMNS)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();
}

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
const euros = (cents: number | null) => (cents === null ? null : cents / 100);

function toSellerProperty(row: Row): SellerProperty {
  const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
  const estimation = Array.isArray(row.estimation) ? row.estimation[0] : row.estimation;
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
    listing: listing
      ? {
          id: listing.id,
          reference: listing.reference,
          title: listing.title,
          description: listing.description,
          priceCents: Number(listing.price_cents),
          status: listing.status,
          rejectionReason: listing.rejection_reason,
        }
      : null,
    // An analysis at 0 € (Q29, the château of the V1) gives no value to recall.
    estimation:
      row.estimation_value_cents === null || Number(row.estimation_value_cents) <= 0
        ? null
        : {
            valueCents: Number(row.estimation_value_cents),
            lowCents: row.estimation_low_cents === null ? null : Number(row.estimation_low_cents),
            highCents:
              row.estimation_high_cents === null ? null : Number(row.estimation_high_cents),
            madeAt: estimation?.created_at ?? null,
          },
    fromEstimation: estimation?.created_at ?? null,
    coverPath: row.photos.find((photo) => photo.is_cover)?.storage_path ?? null,
    createdAt: row.created_at,
  };
}

/** A property of the seller; null when unknown, deleted or someone else's. */
export const sellerProperty = cache(async function sellerProperty(
  id: string,
): Promise<QueryResult<SellerProperty | null>> {
  const profile = await requireProfile();
  try {
    const { data, error } = await readOne(id, profile.id);
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
      .limit(50);
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

/** The photos of a property of the seller (step 2), in their order. */
export async function sellerPhotos(propertyId: string): Promise<QueryResult<SellerPhoto[]>> {
  await requireProfile();
  return readPhotos(await createClient(), propertyId);
}
