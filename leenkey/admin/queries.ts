import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { LISTING_PROPERTY_COLUMNS, listingForPage, planOf } from "@/leenkey/listings/listing-row";
import type { PublicListing } from "@/leenkey/listings/queries";
import { getDpeSettings } from "@/leenkey/properties/dpe-rules";
import { createClient } from "@/lib/supabase/server";
import { chunk } from "@/lib/utils";
import type { AdminListingsQuery } from "@/lib/validations/admin";
import {
  PROPERTY_DPE_COLUMNS,
  propertyDpeIssue,
  type DpeIssue,
  type DpeRules,
} from "@/lib/validations/property";
import type { Database } from "@/types/database";
import { listingReview, type ListingReview, type ReviewDpe } from "./review";

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
  /** The pre-analysis (L1-30d); null when it could not be read. */
  review: ListingReview | null;
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
  /** The motive of an exemption of DPE read at the publication (L1-66). */
  dpeExemption: string | null;
};

export type AdminListingDetail = {
  listing: PublicListing;
  status: ListingStatus;
  createdAt: string;
  submittedAt: string | null;
  suspendedAt: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  /**
   * The DPE as the team checks it before publishing (L1-65, L1-66): what the
   * rules still miss (null: nothing, or the rules could not be read), the
   * motive of an exemption, the number to compare with the register of ADEME
   * and what the seller entered.
   */
  dpe: {
    issue: DpeIssue | null;
    exemptionReason: string | null;
    number: string | null;
    date: string | null;
    /** The figures the seller entered, whether the listing shows them or not. */
    kwhM2Year: number | null;
    gesKgM2Year: number | null;
  };
  sellerName: string | null;
  plan: PlanCode;
  /** The pre-analysis (L1-30d); null when the rules of the DPE could not be read. */
  review: ListingReview | null;
  /** The value of the analysis of value of the property, to compare the price. */
  valueCents: number | null;
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

/** The DPE as the pre-analysis reads it: what the rules of publication say. */
function reviewDpe(property: Parameters<typeof propertyDpeIssue>[0], rules: DpeRules): ReviewDpe {
  if (propertyDpeIssue(property, rules)) return "missing";
  if (property.type === null || property.type === "terrain") return "none";
  return property.dpe_exempt ? "exempt" : "ok";
}

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
      review: null,
    }));
    // Main photo and pre-analysis, 100 listings per read (length of the
    // address): the admin reads every listing, property and photo (RLS).
    // Without them, the drawing and « Pré-analyse indisponible ».
    const [details, dpeSettings] = await Promise.all([
      Promise.all(
        chunk(
          rows.map((row) => row.id),
          100,
        ).map((ids) =>
          supabase
            .from("listings")
            .select(
              `id, description, property:properties!inner(estimation_value_cents, ${PROPERTY_DPE_COLUMNS}, photos(storage_path, is_cover))`,
            )
            .in("id", ids),
        ),
      ),
      getDpeSettings(),
    ]);
    const byListing = new Map(rows.map((row) => [row.id, row]));
    for (const answer of details) {
      if (answer.error) {
        logFailure("details", answer.error, { user_id: admin.id });
        continue;
      }
      for (const entry of answer.data) {
        const row = byListing.get(entry.id);
        if (!row) continue;
        const { photos } = entry.property;
        row.coverPath = photos.find((photo) => photo.is_cover)?.storage_path ?? null;
        row.review = dpeSettings
          ? listingReview({
              priceCents: row.priceCents,
              valueCents: entry.property.estimation_value_cents,
              photosCount: photos.length,
              description: entry.description,
              dpe: reviewDpe(entry.property, dpeSettings.rules),
            })
          : null;
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
  `id, reference, slug, title, description, price_cents, status, created_at, submitted_at, published_at, suspended_at, rejection_reason, suspension_reason, property:properties!inner(${LISTING_PROPERTY_COLUMNS}, dpe_date, dpe_number, estimation_value_cents)` as const;

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

    const [audit, advisorPlans, dpeSettings] = await Promise.all([
      supabase
        .from("audit_log")
        .select("id, action, actor_id, created_at, meta")
        .eq("entity", "listing")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      // « Vente accompagnée » is a right of the plan, never a plan name (CLAUDE.md 14).
      supabase.from("plan_entitlements").select("plan").eq("feature", "advisor"),
      getDpeSettings(),
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
    const sellerName = fullName(
      property.owner?.first_name ?? null,
      property.owner?.last_name ?? null,
    );
    const plan = planOf(property);
    const accompanied = advisorPlans.data.some((entitlement) => entitlement.plan === plan);
    return {
      ok: true,
      data: {
        listing: listingForPage(row, property, accompanied, dpeSettings?.rules ?? null),
        status: row.status,
        createdAt: row.created_at,
        submittedAt: row.submitted_at,
        suspendedAt: row.suspended_at,
        rejectionReason: row.rejection_reason,
        suspensionReason: row.suspension_reason,
        dpe: {
          issue: dpeSettings ? propertyDpeIssue(property, dpeSettings.rules) : null,
          exemptionReason: property.dpe_exempt ? property.dpe_exemption_reason : null,
          number: property.dpe_number,
          date: property.dpe_date,
          kwhM2Year: property.energy_kwh_m2_year,
          gesKgM2Year: property.ges_kg_m2_year,
        },
        sellerName,
        plan,
        review: dpeSettings
          ? listingReview({
              priceCents: row.price_cents,
              valueCents: property.estimation_value_cents,
              photosCount: property.photos.length,
              description: row.description,
              dpe: reviewDpe(property, dpeSettings.rules),
            })
          : null,
        valueCents: property.estimation_value_cents,
        history: audit.data.map((entry) => {
          const meta = entry.meta as { reason?: unknown; dpe_exemption?: unknown } | null;
          return {
            id: entry.id,
            action: entry.action,
            at: entry.created_at,
            actorName: entry.actor_id ? (actors.get(entry.actor_id) ?? null) : null,
            reason: typeof meta?.reason === "string" ? meta.reason : null,
            dpeExemption: typeof meta?.dpe_exemption === "string" ? meta.dpe_exemption : null,
          };
        }),
      },
    };
  } catch (error) {
    logFailure("listing", error, { user_id: admin.id, entity_id: id });
    return { ok: false, error: "unavailable" };
  }
});
