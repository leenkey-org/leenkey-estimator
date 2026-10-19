import type { PublicListing } from "./queries";
import type { DpeClass } from "@/components/shared/dpe-badge";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { Database } from "@/types/database";

// A listing read from its tables (not from public_listings), as its page
// shows it: the preview of the back office (L1-19) and the preview of the
// seller before sending (L1-13). The RLS of the reader decides who may.

type Tables = Database["public"]["Tables"];
type PlanCode = Database["public"]["Enums"]["plan_code"];

/** The property embedded under its listing: what the listing page shows of it. */
export const LISTING_PROPERTY_COLUMNS =
  "owner_id, type, city, postal_code, district, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, charges_monthly_cents, property_tax_yearly_cents, copro_lots, deleted_at, owner:profiles!properties_owner_id_fkey(first_name, last_name), progress:sale_progress(plan), photos(storage_path, width, height, caption, position)";

type ListingRow = Pick<
  Tables["listings"]["Row"],
  "id" | "slug" | "reference" | "title" | "description" | "price_cents" | "published_at"
>;

type PropertyRow = Pick<
  Tables["properties"]["Row"],
  | "type"
  | "city"
  | "postal_code"
  | "district"
  | "surface_m2"
  | "carrez_m2"
  | "rooms"
  | "bedrooms"
  | "floor"
  | "floors_total"
  | "has_elevator"
  | "has_balcony"
  | "has_terrace"
  | "has_garden"
  | "has_parking"
  | "has_cellar"
  | "orientation"
  | "build_year"
  | "is_new_build"
  | "dpe_class"
  | "ges_class"
  | "heating"
  | "charges_monthly_cents"
  | "property_tax_yearly_cents"
  | "copro_lots"
> & {
  owner: { first_name: string | null } | null;
  progress: { plan: PlanCode } | { plan: PlanCode }[] | null;
  photos: Pick<
    Tables["photos"]["Row"],
    "storage_path" | "width" | "height" | "caption" | "position"
  >[];
};

const energyClass = (value: string | null): DpeClass | null =>
  DPE_CLASSES.find((letter) => letter === value) ?? null;

/** The plan of the sale of the property (sale_progress), Autonomie by default. */
export function planOf(property: Pick<PropertyRow, "progress">): PlanCode {
  const progress = Array.isArray(property.progress) ? property.progress[0] : property.progress;
  return progress?.plan ?? "autonomie";
}

/**
 * The listing as its page shows it. `accompanied`: the plan includes an
 * adviser (plan_entitlements), never a comparison of plan names.
 */
export function listingForPage(
  listing: ListingRow,
  property: PropertyRow,
  accompanied: boolean,
): PublicListing {
  return {
    id: listing.id,
    slug: listing.slug,
    reference: listing.reference,
    title: listing.title,
    description: listing.description,
    priceCents: Number(listing.price_cents),
    publishedAt: listing.published_at,
    // A draft may still miss them (L1-11); listing_submit requires them.
    type: property.type ?? "autre",
    city: property.city,
    postalCode: property.postal_code,
    district: property.district,
    surfaceM2: Number(property.surface_m2 ?? 0),
    carrezM2: property.carrez_m2 === null ? null : Number(property.carrez_m2),
    rooms: property.rooms ?? 0,
    bedrooms: property.bedrooms,
    floor: property.floor,
    floorsTotal: property.floors_total,
    hasElevator: property.has_elevator,
    hasBalcony: property.has_balcony,
    hasTerrace: property.has_terrace,
    hasGarden: property.has_garden,
    hasParking: property.has_parking,
    hasCellar: property.has_cellar,
    orientation: property.orientation,
    buildYear: property.build_year,
    isNewBuild: property.is_new_build,
    dpe: energyClass(property.dpe_class),
    ges: energyClass(property.ges_class),
    heating: property.heating,
    chargesMonthlyCents: property.charges_monthly_cents,
    propertyTaxYearlyCents: property.property_tax_yearly_cents,
    coproLots: property.copro_lots,
    sellerFirstName: property.owner?.first_name ?? null,
    accompanied,
    photos: [...property.photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        path: photo.storage_path,
        width: photo.width,
        height: photo.height,
        caption: photo.caption,
      })),
  };
}
