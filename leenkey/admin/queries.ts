import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import type { DpeClass } from "@/components/shared/dpe-badge";
import type { PublicListing } from "@/leenkey/listings/queries";
import { createClient } from "@/lib/supabase/server";
import type { AdminListingsQuery } from "@/lib/validations/admin";
import { DPE_CLASSES } from "@/lib/validations/search";
import type { Database } from "@/types/database";

// Reads of the back office of the listings (L1-19), with the admin's session:
// the SQL functions and the RLS check is_admin() themselves, and each read
// calls requireAdmin() too (a 404 for anyone else).

type ListingStatus = Database["public"]["Enums"]["listing_status"];
type PlanCode = Database["public"]["Enums"]["plan_code"];

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type AdminListingRow = {
  id: string;
  reference: string;
  slug: string;
  title: string;
  status: ListingStatus;
  priceCents: number;
  submittedAt: string | null;
  publishedAt: string | null;
  city: string;
  postalCode: string;
  sellerName: string | null;
  plan: PlanCode;
  /** Base of the files of the main photo, null without photos (L1-12). */
  coverPath: string | null;
};

/** The rows, and whether more listings match than the page shows. */
export type AdminListingList = { rows: AdminListingRow[]; limited: boolean };

/** Rows of /admin/annonces at most (admin_listings). */
export const ADMIN_LISTINGS_LIMIT = 200;

export type AdminListingCounts = Record<ListingStatus, number>;

export type AdminHistoryEntry = {
  id: number;
  action: string;
  at: string;
  actorName: string | null;
  reason: string | null;
};

export type AdminListingDetail = {
  listing: PublicListing;
  status: ListingStatus;
  createdAt: string;
  submittedAt: string | null;
  suspendedAt: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  sellerName: string | null;
  plan: PlanCode;
  history: AdminHistoryEntry[];
};

const EMPTY_COUNTS: AdminListingCounts = {
  draft: 0,
  pending: 0,
  published: 0,
  paused: 0,
  suspended: 0,
  sold: 0,
  rejected: 0,
};

const fullName = (first: string | null, last: string | null) =>
  [first, last].filter(Boolean).join(" ") || null;

function logFailure(read: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[admin] ${read} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Rows of /admin/annonces: pending first, oldest first; ADMIN_LISTINGS_LIMIT
 * at most, one more read to know whether the list is cut.
 */
export async function adminListings(
  filter: AdminListingsQuery,
): Promise<QueryResult<AdminListingList>> {
  const admin = await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_listings", {
      p_status: filter.status,
      p_query: filter.query,
      p_limit: ADMIN_LISTINGS_LIMIT + 1,
    });
    if (error) throw new Error(`admin_listings: ${error.code} ${error.message}`);
    const rows: AdminListingRow[] = data.slice(0, ADMIN_LISTINGS_LIMIT).map((row) => ({
      id: row.id,
      reference: row.reference,
      slug: row.slug,
      title: row.title,
      status: row.status,
      priceCents: Number(row.price_cents),
      // Generated types declare the columns of a function result as never null.
      submittedAt: (row.submitted_at as string | null) ?? null,
      publishedAt: (row.published_at as string | null) ?? null,
      city: row.city,
      postalCode: row.postal_code,
      sellerName: fullName(row.seller_first_name, row.seller_last_name),
      plan: row.plan,
      coverPath: null,
    }));
    // Main photos: the admin reads every photo (RLS). Without them, the drawing.
    if (rows.length > 0) {
      const covers = await supabase
        .from("listings")
        .select("id, property:properties!inner(photos(storage_path, is_cover))")
        .in(
          "id",
          rows.map((row) => row.id),
        );
      if (covers.error) {
        logFailure("covers", covers.error, { user_id: admin.id });
      } else {
        const byListing = new Map(
          covers.data.map((entry) => [
            entry.id,
            entry.property.photos.find((photo) => photo.is_cover)?.storage_path ?? null,
          ]),
        );
        for (const row of rows) row.coverPath = byListing.get(row.id) ?? null;
      }
    }
    return { ok: true, data: { rows, limited: data.length > ADMIN_LISTINGS_LIMIT } };
  } catch (error) {
    // Not the search itself: it may be the name of a person.
    logFailure("listings", error, {
      user_id: admin.id,
      status: filter.status,
      search: Boolean(filter.query),
    });
    return { ok: false, error: "unavailable" };
  }
}

/** Number of listings by status (pills and summary). */
export async function adminListingCounts(): Promise<QueryResult<AdminListingCounts>> {
  const admin = await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_listing_counts");
    if (error) throw new Error(`admin_listing_counts: ${error.code} ${error.message}`);
    const counts = { ...EMPTY_COUNTS };
    for (const row of data) counts[row.status] = Number(row.total);
    return { ok: true, data: counts };
  } catch (error) {
    logFailure("counts", error, { user_id: admin.id });
    return { ok: false, error: "unavailable" };
  }
}

const DETAIL_COLUMNS =
  "id, reference, slug, title, description, price_cents, status, created_at, submitted_at, published_at, suspended_at, rejection_reason, suspension_reason, property:properties!inner(owner_id, type, city, postal_code, district, surface_m2, carrez_m2, rooms, bedrooms, floor, floors_total, has_elevator, has_balcony, has_terrace, has_garden, has_parking, has_cellar, orientation, build_year, is_new_build, dpe_class, ges_class, heating, charges_monthly_cents, property_tax_yearly_cents, copro_lots, deleted_at, owner:profiles!properties_owner_id_fkey(first_name, last_name), progress:sale_progress(plan), photos(storage_path, width, height, caption, position))";

const energyClass = (value: string | null): DpeClass | null =>
  DPE_CLASSES.find((letter) => letter === value) ?? null;

/**
 * One listing with its seller, plan and decisions; null when unknown or
 * deleted. Cached for the request: generateMetadata and the page share it.
 */
export const adminListing = cache(async function adminListing(
  id: string,
): Promise<QueryResult<AdminListingDetail | null>> {
  const admin = await requireAdmin();
  try {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("listings")
      .select(DETAIL_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`listings: ${error.code} ${error.message}`);
    if (!row || row.property.deleted_at) return { ok: true, data: null };

    const [audit, advisorPlans] = await Promise.all([
      supabase
        .from("audit_log")
        .select("id, action, actor_id, created_at, meta")
        .eq("entity", "listing")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      // « Vente accompagnée » is a right of the plan, never a plan name (CLAUDE.md 14).
      supabase.from("plan_entitlements").select("plan").eq("feature", "advisor"),
    ]);
    if (audit.error) throw new Error(`audit_log: ${audit.error.code} ${audit.error.message}`);
    if (advisorPlans.error) {
      throw new Error(
        `plan_entitlements: ${advisorPlans.error.code} ${advisorPlans.error.message}`,
      );
    }
    const actorIds = [...new Set(audit.data.flatMap((entry) => entry.actor_id ?? []))];
    const actors = new Map<string, string | null>();
    if (actorIds.length) {
      const names = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", actorIds);
      if (names.error) throw new Error(`profiles: ${names.error.code} ${names.error.message}`);
      for (const profile of names.data) {
        actors.set(profile.id, fullName(profile.first_name, profile.last_name));
      }
    }

    const property = row.property;
    const progress = Array.isArray(property.progress) ? property.progress[0] : property.progress;
    const sellerName = fullName(
      property.owner?.first_name ?? null,
      property.owner?.last_name ?? null,
    );
    const plan = progress?.plan ?? "autonomie";
    return {
      ok: true,
      data: {
        listing: {
          id: row.id,
          slug: row.slug,
          reference: row.reference,
          title: row.title,
          description: row.description,
          priceCents: Number(row.price_cents),
          publishedAt: row.published_at,
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
          accompanied: advisorPlans.data.some((entitlement) => entitlement.plan === plan),
          photos: [...property.photos]
            .sort((a, b) => a.position - b.position)
            .map((photo) => ({
              path: photo.storage_path,
              width: photo.width,
              height: photo.height,
              caption: photo.caption,
            })),
        },
        status: row.status,
        createdAt: row.created_at,
        submittedAt: row.submitted_at,
        suspendedAt: row.suspended_at,
        rejectionReason: row.rejection_reason,
        suspensionReason: row.suspension_reason,
        sellerName,
        plan,
        history: audit.data.map((entry) => {
          const meta = entry.meta as { reason?: unknown } | null;
          return {
            id: entry.id,
            action: entry.action,
            at: entry.created_at,
            actorName: entry.actor_id ? (actors.get(entry.actor_id) ?? null) : null,
            reason: typeof meta?.reason === "string" ? meta.reason : null,
          };
        }),
      },
    };
  } catch (error) {
    logFailure("listing", error, { user_id: admin.id, entity_id: id });
    return { ok: false, error: "unavailable" };
  }
});
