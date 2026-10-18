import "server-only";
import { requireProfile } from "@/core/auth/session";
import { LISTING_PROPERTY_COLUMNS, listingForPage, planOf } from "@/leenkey/listings/listing-row";
import type { PublicListing } from "@/leenkey/listings/queries";
import { createClient } from "@/lib/supabase/server";
import type { QueryResult } from "./queries";

const COLUMNS =
  `id, reference, slug, title, description, price_cents, published_at, property:properties!inner(${LISTING_PROPERTY_COLUMNS})` as const;

/**
 * The listing of a property of the seller as its page will show it (step 4,
 * L1-13), with their session: their own property only (RLS). null without a
 * listing, or for someone else's property.
 */
export async function sellerListingPreview(
  propertyId: string,
): Promise<QueryResult<PublicListing | null>> {
  const profile = await requireProfile();
  try {
    const supabase = await createClient();
    const [listing, advisorPlans] = await Promise.all([
      supabase
        .from("listings")
        .select(COLUMNS)
        .eq("property_id", propertyId)
        .is("deleted_at", null)
        .maybeSingle(),
      // « Vente accompagnée » is a right of the plan, never a plan name (CLAUDE.md 14).
      supabase.from("plan_entitlements").select("plan").eq("feature", "advisor"),
    ]);
    if (listing.error) throw new Error(`listings: ${listing.error.code} ${listing.error.message}`);
    if (advisorPlans.error) {
      throw new Error(
        `plan_entitlements: ${advisorPlans.error.code} ${advisorPlans.error.message}`,
      );
    }
    const row = listing.data;
    if (!row || row.property.owner_id !== profile.id || row.property.deleted_at) {
      return { ok: true, data: null };
    }
    const plan = planOf(row.property);
    return {
      ok: true,
      data: listingForPage(
        row,
        row.property,
        advisorPlans.data.some((entitlement) => entitlement.plan === plan),
      ),
    };
  } catch (error) {
    console.error("[properties] preview read failed", {
      user_id: profile.id,
      entity_id: propertyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}
