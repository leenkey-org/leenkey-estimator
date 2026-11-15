import "server-only";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import { hasEntitlement } from "@/leenkey/billing/entitlements";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { createClient } from "@/lib/supabase/server";
import {
  OFFER_COLUMNS,
  readOffer,
  readPropertySnapshot,
  type OfferContent,
  type OfferProperty,
} from "./content";

// An offer as its seller reads it (L2-04a, SPEC-V2 13): only through the view
// `offer_for_seller`, which shows a seller the offers sent on their own
// listings, the personal data of the buyers hidden until acceptance (names
// and town only), and the status « expired » as soon as the validity is
// past. A seller has no read on `offers` itself.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

export type SellerOffer = {
  offer: OfferContent;
  /** The property as it was when the offer was sent. */
  property: OfferProperty;
  propertyId: string;
  buyerId: string;
  /** The financing of the buyer when the offer was sent, and the check of its proof. */
  financingStatus: FinancingStatus;
  financingCheckedAt: string | null;
  viewedAt: string | null;
  answeredAt: string | null;
  withdrawnAt: string | null;
  /** The avant-contrat, « YYYY-MM-DD », once the seller or the team recorded it. */
  precontractSignedAt: string | null;
  withdrawalPeriodStart: string | null;
};

const SELLER_COLUMNS =
  `${OFFER_COLUMNS}, buyer_id, property_id, financing_status_at_submit, financing_checked_at, viewed_at, answered_at, withdrawn_at, precontract_signed_at, withdrawal_period_start` as const;

type Client = Awaited<ReturnType<typeof createClient>>;
type SellerRow = NonNullable<Awaited<ReturnType<typeof readRows>>["data"]>[number];

function readRows(supabase: Client) {
  return supabase.from("offer_for_seller").select(SELLER_COLUMNS);
}

/** A row of the view (every column of a view reads as nullable) as an offer; null when it is not one. */
function readSellerOffer(row: SellerRow): SellerOffer | null {
  if (
    !row.id ||
    !row.reference ||
    !row.status ||
    !row.listing_id ||
    !row.acquisition_mode ||
    !row.buyer_id ||
    !row.property_id ||
    row.version === null
  ) {
    return null;
  }
  const property = readPropertySnapshot(row.property_snapshot ?? undefined);
  if (!property) return null;
  return {
    offer: readOffer({
      ...row,
      id: row.id,
      reference: row.reference,
      version: row.version,
      status: row.status,
      listing_id: row.listing_id,
      acquisition_mode: row.acquisition_mode,
      buyer_identity: row.buyer_identity ?? {},
      co_buyers: row.co_buyers ?? [],
      property_snapshot: row.property_snapshot ?? {},
      down_payment_cents: row.down_payment_cents ?? 0,
      loan_amount_cents: row.loan_amount_cents ?? 0,
      condition_prior_sale: row.condition_prior_sale === true,
      condition_authorization: row.condition_authorization === true,
      condition_other: row.condition_other === true,
      declarations: row.declarations ?? {},
    }),
    property,
    propertyId: row.property_id,
    buyerId: row.buyer_id,
    financingStatus: row.financing_status_at_submit ?? "not_provided",
    financingCheckedAt: row.financing_checked_at,
    viewedAt: row.viewed_at,
    answeredAt: row.answered_at,
    withdrawnAt: row.withdrawn_at,
    precontractSignedAt: row.precontract_signed_at,
    withdrawalPeriodStart: row.withdrawal_period_start,
  };
}

/** An offer sent on a listing of the session; null when there is none for this seller. */
export async function sellerOffer(offerId: string): Promise<QueryResult<SellerOffer | null>> {
  const supabase = await createClient();
  const { data, error } = await readRows(supabase).eq("id", offerId).maybeSingle();
  if (error) {
    console.error("[offers] seller offer read failed", { entity_id: offerId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: data ? readSellerOffer(data) : null };
}

/** Every offer received on a property, the most recent first: its whole history. */
export async function propertyOffers(propertyId: string): Promise<QueryResult<SellerOffer[]>> {
  const supabase = await createClient();
  const { data, error } = await readRows(supabase)
    .eq("property_id", propertyId)
    .order("submitted_at", { ascending: false });
  if (error) {
    console.error("[offers] property offers read failed", {
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.map(readSellerOffer).filter((offer): offer is SellerOffer => offer !== null),
  };
}

/** The offers of a property that still wait for an answer. */
export const awaitingAnswer = (offers: readonly SellerOffer[]) =>
  offers.filter(({ offer }) => offer.status === "submitted" || offer.status === "viewed");

export type OfferEvent = {
  id: number;
  event: string;
  at: string;
  /** The message of the seller with its answer. */
  message: string | null;
};

/** The journal of some offers, by offer, in its order (RLS: its buyer, its seller, the team). */
export async function offerEvents(
  offerIds: readonly string[],
): Promise<QueryResult<Record<string, OfferEvent[]>>> {
  if (offerIds.length === 0) return { ok: true, data: {} };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offer_events")
    .select("id, offer_id, event, meta, created_at")
    .in("offer_id", [...offerIds])
    .order("id");
  if (error) {
    console.error("[offers] events read failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  const byOffer: Record<string, OfferEvent[]> = {};
  for (const row of data) {
    const meta = row.meta;
    const message =
      typeof meta === "object" && meta !== null && !Array.isArray(meta) ? meta.message : null;
    (byOffer[row.offer_id] ??= []).push({
      id: row.id,
      event: row.event,
      at: row.created_at,
      message: typeof message === "string" ? message : null,
    });
  }
  return { ok: true, data: byOffer };
}

/** « Discuter avec l'acquéreur »: their conversation about the listing, else the messaging. */
export async function buyerConversationHref(listingId: string, buyerId: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("kind", "listing")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (error) console.error("[offers] conversation read failed", { code: error.code });
  return data ? `${ROUTES.messages}/${data.id}` : ROUTES.messages;
}

/**
 * « un conseiller Leenkey » of the acceptance screen: the conversation with
 * the adviser when the plan of the property has one, the plans otherwise. A
 * right, never a plan name (CLAUDE.md 14); never a condition to accept.
 */
export async function advisorLink(propertyId: string): Promise<{ href: string; advisor: boolean }> {
  if (!(await hasEntitlement(propertyId, "advisor"))) {
    return { href: `${ROUTES.plan}?bien=${propertyId}`, advisor: false };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("kind", "advisor")
    .eq("property_id", propertyId)
    .maybeSingle();
  return { href: data ? `${ROUTES.messages}/${data.id}` : ROUTES.messages, advisor: true };
}
