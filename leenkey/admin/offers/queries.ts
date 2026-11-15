import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { hasEntitlement } from "@/leenkey/billing/entitlements";
import { isUuid } from "@/leenkey/messaging/queries";
import { OFFER_COLUMNS, readOffer, readPropertySnapshot } from "@/leenkey/offers/content";
import { offerEvents, type OfferEvent, type SellerOffer } from "@/leenkey/offers/seller";
import { createClient } from "@/lib/supabase/server";
import type { AdminOffersQuery } from "@/lib/validations/admin";
import type { Database } from "@/types/database";
import { fullName, type QueryResult } from "../users/queries";

// Reads of the offers of the back office (L2-07, SPEC-V2 section 17), with
// the admin's session: admin_offers and admin_offer_counts check is_admin();
// the sheet reads the tables, which the RLS opens to the admin. Every offer
// sent, never a draft; an offer past its validity reads expired before the
// cron writes it, as its seller reads it. Each read calls requireAdmin() too.

type PlanCode = Database["public"]["Enums"]["plan_code"];
type OfferStatus = Database["public"]["Enums"]["offer_status"];

export type AdminOfferRow = {
  id: string;
  reference: string;
  version: number;
  status: OfferStatus;
  priceCents: number | null;
  askingPriceCents: number | null;
  submittedAt: string | null;
  validityUntil: string | null;
  listingReference: string | null;
  city: string | null;
  plan: PlanCode | null;
  buyerName: string | null;
  sellerName: string | null;
};

export type AdminOfferList = { rows: AdminOfferRow[]; limited: boolean };

export type AdminOfferCounts = {
  total: number;
  waiting: number;
  accepted: number;
  declined: number;
  ended: number;
};

/** Rows of /admin/offres at most (admin_offers). */
export const ADMIN_OFFERS_LIMIT = 200;

function logFailure(read: string, error: unknown, context: Record<string, unknown> = {}) {
  console.error(`[admin] ${read} failed`, {
    ...context,
    error: error instanceof Error ? error.message : String(error),
  });
}

export async function adminOffers({
  status,
  query,
  account,
}: AdminOffersQuery): Promise<QueryResult<AdminOfferList>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_offers", {
      p_status: status,
      p_query: query,
      p_account: account,
      p_limit: ADMIN_OFFERS_LIMIT + 1,
    });
    if (error) throw new Error(`admin_offers: ${error.code} ${error.message}`);
    return {
      ok: true,
      data: {
        limited: data.length > ADMIN_OFFERS_LIMIT,
        rows: data.slice(0, ADMIN_OFFERS_LIMIT).map((row) => ({
          id: row.id,
          reference: row.reference,
          version: row.version,
          status: row.status,
          // Generated types declare the columns of a function result as never null.
          priceCents: row.price_cents as number | null,
          askingPriceCents: row.asking_price_cents as number | null,
          submittedAt: row.submitted_at as string | null,
          validityUntil: row.validity_until as string | null,
          listingReference: row.listing_reference as string | null,
          city: row.city as string | null,
          plan: row.plan as PlanCode | null,
          buyerName: fullName(
            row.buyer_first_name as string | null,
            row.buyer_last_name as string | null,
          ),
          sellerName: fullName(
            row.seller_first_name as string | null,
            row.seller_last_name as string | null,
          ),
        })),
      },
    };
  } catch (error) {
    logFailure("offers", error);
    return { ok: false, error: "unavailable" };
  }
}

export async function adminOfferCounts(): Promise<QueryResult<AdminOfferCounts>> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_offer_counts");
    if (error) throw new Error(`admin_offer_counts: ${error.code} ${error.message}`);
    const [row] = data;
    return {
      ok: true,
      data: {
        total: row?.total ?? 0,
        waiting: row?.waiting ?? 0,
        accepted: row?.accepted ?? 0,
        declined: row?.declined ?? 0,
        ended: row?.ended ?? 0,
      },
    };
  } catch (error) {
    logFailure("offer counts", error);
    return { ok: false, error: "unavailable" };
  }
}

export type AdminOffer = {
  /** The offer as its seller reads it (the same summary), with the whole identity of its buyers. */
  item: SellerOffer;
  listingReference: string | null;
  city: string | null;
  plan: PlanCode | null;
  buyer: { id: string; name: string | null };
  seller: { id: string; name: string | null };
  events: OfferEvent[];
  /**
   * « Marquer comme analysée »: null when the plan of the property has no
   * analysis of its offers; otherwise when the task was ticked, if it was.
   */
  analysis: { doneAt: string | null } | null;
  /** The team records the avant-contrat (a plan that follows the sale to its signature). */
  precontractByTeam: boolean;
};

const SHEET_COLUMNS =
  `${OFFER_COLUMNS}, buyer_id, seller_id, financing_status_at_submit, financing_document_id, viewed_at, answered_at, withdrawn_at, precontract_signed_at, withdrawal_period_start` as const;

/**
 * An offer sent, by its id; null: none (unknown, a draft). Read once per
 * request: the metadata and the page share it.
 */
export const adminOffer = cache(
  async (offerId: string): Promise<QueryResult<AdminOffer | null>> => {
    await requireAdmin();
    if (!isUuid(offerId)) return { ok: true, data: null };
    try {
      const supabase = await createClient();
      const { data: row, error } = await supabase
        .from("offers")
        .select(SHEET_COLUMNS)
        .eq("id", offerId)
        .neq("status", "draft")
        .maybeSingle();
      if (error) throw new Error(`offers: ${error.code} ${error.message}`);
      if (!row) return { ok: true, data: null };
      const property = readPropertySnapshot(row.property_snapshot);
      if (!property) return { ok: true, data: null };

      const [listing, people, proof, events] = await Promise.all([
        supabase
          .from("listings")
          .select("reference, property_id, properties(city)")
          .eq("id", row.listing_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", [row.buyer_id, row.seller_id]),
        row.financing_document_id
          ? supabase
              .from("financing_documents")
              .select("checked_at")
              .eq("id", row.financing_document_id)
              .maybeSingle()
          : null,
        offerEvents([row.id]),
      ]);
      if (listing.error) throw new Error(`listings: ${listing.error.code}`);
      if (people.error) throw new Error(`profiles: ${people.error.code}`);
      if (proof?.error) throw new Error(`financing_documents: ${proof.error.code}`);
      if (!events.ok) throw new Error("offer_events");
      const propertyId = listing.data?.property_id ?? null;
      if (!propertyId) return { ok: true, data: null };

      const [analysed, precontractByTeam, sale, task] = await Promise.all([
        hasEntitlement(propertyId, "human_offer_analysis"),
        hasEntitlement(propertyId, "notary_coordination"),
        // The plan in force, as the list and the rights read it (an ended plan is Autonomie).
        supabase.rpc("property_current_plan", { p: propertyId }),
        supabase
          .from("sale_task_status")
          .select("done_at, sale_step_tasks!inner(code)")
          .eq("property_id", propertyId)
          .eq("sale_step_tasks.code", "offer_analysed")
          .not("done_at", "is", null)
          .limit(1),
      ]);
      if (sale.error) throw new Error(`property_current_plan: ${sale.error.code}`);
      if (task.error) throw new Error(`sale_task_status: ${task.error.code}`);

      const offer = readOffer(row);
      // Past its validity: expired, before the cron writes it (as the seller reads it).
      const waiting = offer.status === "submitted" || offer.status === "viewed";
      const due = offer.validityUntil !== null && Date.parse(offer.validityUntil) <= Date.now();
      const name = (id: string) => {
        const person = people.data.find((candidate) => candidate.id === id);
        return person ? fullName(person.first_name, person.last_name) : null;
      };
      const city = listing.data?.properties;
      return {
        ok: true,
        data: {
          item: {
            offer: waiting && due ? { ...offer, status: "expired" } : offer,
            property,
            propertyId,
            buyerId: row.buyer_id,
            financingStatus: row.financing_status_at_submit ?? "not_provided",
            financingCheckedAt: proof?.data?.checked_at ?? null,
            viewedAt: row.viewed_at,
            answeredAt: row.answered_at,
            withdrawnAt: row.withdrawn_at,
            precontractSignedAt: row.precontract_signed_at,
            withdrawalPeriodStart: row.withdrawal_period_start,
          },
          listingReference: listing.data?.reference ?? null,
          city: (Array.isArray(city) ? city[0]?.city : city?.city) ?? null,
          plan: sale.data ?? null,
          buyer: { id: row.buyer_id, name: name(row.buyer_id) },
          seller: { id: row.seller_id, name: name(row.seller_id) },
          events: events.data[row.id] ?? [],
          analysis: analysed ? { doneAt: task.data[0]?.done_at ?? null } : null,
          precontractByTeam,
        },
      };
    } catch (error) {
      logFailure("offer", error, { entity_id: offerId });
      return { ok: false, error: "unavailable" };
    }
  },
);
