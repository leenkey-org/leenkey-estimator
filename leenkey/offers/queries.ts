import "server-only";
import { getUser, type SessionProfile } from "@/core/auth/session";
import { ownedPropertyId } from "@/leenkey/messaging/queries";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { buyerOfferLines, type BuyerOfferLine } from "./lines";
import {
  OFFER_ANNEXES,
  OFFER_COLUMNS,
  readOffer,
  readPropertySnapshot,
  type OfferContent,
  type OfferIdentity,
  type OfferProperty,
} from "./content";

// What the form and the page of an offer read (L2-03, SPEC-V2 13), with the
// session of the buyer: RLS shows a buyer their own offers only
// (offers_select_buyer_or_admin). A seller never reads `offers`: their view
// comes with L2-04 (offer_for_seller).

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

/** The listing an offer is made on, as the public reads it. */
export type OfferListing = OfferProperty & {
  id: string;
  slug: string;
  isNewBuild: boolean;
  /** Its main photo, null without one. */
  coverPath: string | null;
};

/** The published listing of an offer, null when it is not online. */
export async function offerListing(listingId: string): Promise<QueryResult<OfferListing | null>> {
  try {
    const supabase = createPublicClient();
    const listing = await supabase
      .from("public_listings")
      .select(
        "id, slug, reference, title, price_cents, type, city, postal_code, surface_m2, rooms, has_parking, has_cellar, has_garden, has_balcony, has_terrace, is_new_build",
      )
      .eq("id", listingId)
      .maybeSingle();
    if (listing.error) throw new Error(`public_listings: ${listing.error.code}`);
    const row = listing.data;
    if (!row?.id || !row.slug || !row.reference || !row.type || !row.city || !row.price_cents) {
      return { ok: true, data: null };
    }
    const cover = await supabase.rpc("public_listing_photos", {
      p_listing_ids: [row.id],
      p_cover_only: true,
    });
    // Without its photo the card keeps the drawing.
    if (cover.error) {
      console.error("[offers] cover read failed", { entity_id: row.id, code: cover.error.code });
    }
    const has = {
      parking: row.has_parking,
      cellar: row.has_cellar,
      garden: row.has_garden,
      balcony: row.has_balcony,
      terrace: row.has_terrace,
    };
    return {
      ok: true,
      data: {
        id: row.id,
        slug: row.slug,
        listingReference: row.reference,
        title: row.title ?? "",
        postalCode: row.postal_code ?? "",
        city: row.city,
        type: row.type,
        surfaceM2: row.surface_m2 ?? 0,
        rooms: row.rooms ?? 0,
        annexes: OFFER_ANNEXES.filter((annex) => has[annex] === true),
        askingPriceCents: row.price_cents,
        isNewBuild: row.is_new_build === true,
        coverPath: cover.data?.[0]?.path ?? null,
      },
    };
  } catch (error) {
    console.error("[offers] listing read failed", {
      entity_id: listingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}

/**
 * May the session make an offer on this listing (SPEC 13, prerequisites)?
 * The database decides (offer_can_draft); when it says no, why:
 * - undeclared: no buying project declared yet (or not a buyer account);
 * - accepted: its own offer on this listing is already accepted;
 * - closed: its own listing, a listing no longer online, a suspended account.
 */
export type OfferAccess =
  | { state: "open"; inProgress: boolean }
  | { state: "undeclared" }
  | { state: "accepted"; offerId: string }
  | { state: "closed" };

export async function offerAccess(
  profile: SessionProfile,
  listingId: string,
): Promise<QueryResult<OfferAccess>> {
  const supabase = await createClient();
  const [allowed, offers, buyer, own] = await Promise.all([
    supabase.rpc("offer_can_draft", { p_listing: listingId }),
    supabase
      .from("offers")
      .select("id, status")
      .eq("buyer_id", profile.id)
      .eq("listing_id", listingId)
      .in("status", ["submitted", "viewed", "accepted"]),
    supabase
      .from("buyer_profiles")
      .select("financing_status")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    // Their own listing: closed, whatever their buying project says.
    ownedPropertyId(profile.id, listingId),
  ]);
  if (allowed.error || offers.error || buyer.error) {
    console.error("[offers] access check failed", {
      user_id: profile.id,
      entity_id: listingId,
      code: allowed.error?.code ?? offers.error?.code ?? buyer.error?.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (allowed.data === true) {
    const inProgress = offers.data.some((offer) => offer.status !== "accepted");
    return { ok: true, data: { state: "open", inProgress } };
  }
  const accepted = offers.data.find((offer) => offer.status === "accepted");
  if (accepted) return { ok: true, data: { state: "accepted", offerId: accepted.id } };
  if (own !== null) return { ok: true, data: { state: "closed" } };
  const declared =
    profile.roles.includes("buyer") &&
    buyer.data !== null &&
    buyer.data.financing_status !== "not_provided";
  return { ok: true, data: { state: declared ? "closed" : "undeclared" } };
}

/** The draft of the buyer on this listing, null before the first step is saved. */
export async function buyerDraft(
  profileId: string,
  listingId: string,
): Promise<QueryResult<OfferContent | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_COLUMNS)
    .eq("buyer_id", profileId)
    .eq("listing_id", listingId)
    .eq("status", "draft")
    .maybeSingle();
  if (error) {
    console.error("[offers] draft read failed", {
      user_id: profileId,
      entity_id: listingId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: data ? readOffer(data) : null };
}

/** What happened to an offer once sent, as its buyer reads it. */
export type OfferFollowUp = {
  answeredAt: string | null;
  withdrawnAt: string | null;
  /** « YYYY-MM-DD », recorded by the seller or the team once the offer is accepted. */
  precontractSignedAt: string | null;
  withdrawalPeriodStart: string | null;
};

/** An offer of the session (its buyer, or the team), with its property snapshot. */
export type BuyerOffer = {
  offer: OfferContent;
  snapshot: OfferProperty | null;
  isBuyer: boolean;
  followUp: OfferFollowUp;
};

export async function buyerOffer(
  profileId: string,
  offerId: string,
): Promise<QueryResult<BuyerOffer | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(
      `${OFFER_COLUMNS}, buyer_id, answered_at, withdrawn_at, precontract_signed_at, withdrawal_period_start`,
    )
    .eq("id", offerId)
    .maybeSingle();
  if (error) {
    console.error("[offers] offer read failed", {
      user_id: profileId,
      entity_id: offerId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      offer: readOffer(data),
      snapshot: readPropertySnapshot(data.property_snapshot),
      isBuyer: data.buyer_id === profileId,
      followUp: {
        answeredAt: data.answered_at,
        withdrawnAt: data.withdrawn_at,
        precontractSignedAt: data.precontract_signed_at,
        withdrawalPeriodStart: data.withdrawal_period_start,
      },
    },
  };
}

/**
 * The offers of a buyer, the most recent first: the last one of each listing
 * (a replaced offer is its history, read from the new one), with the draft
 * in progress when there is one.
 */
export async function buyerOffers(profileId: string): Promise<QueryResult<BuyerOfferLine[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, listing_id, status, price_cents, submitted_at, validity_until, property_snapshot, created_at",
    )
    .eq("buyer_id", profileId)
    .neq("status", "superseded")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("[offers] buyer offers read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  // A draft has no photograph of its listing yet: read as the public reads it
  // (nothing when the listing is no longer online).
  const drafts = data.filter((row) => row.status === "draft").map((row) => row.listing_id);
  const online = new Map<string, { title: string; city: string }>();
  if (drafts.length > 0) {
    const listings = await createPublicClient()
      .from("public_listings")
      .select("id, title, city")
      .in("id", drafts);
    if (listings.error) {
      console.error("[offers] draft listings read failed", { code: listings.error.code });
    }
    for (const listing of listings.data ?? []) {
      if (listing.id) {
        online.set(listing.id, { title: listing.title ?? "", city: listing.city ?? "" });
      }
    }
  }
  return { ok: true, data: buyerOfferLines(data, online, Date.now()) };
}

/** What a first draft starts with: the account of the buyer and its declared project. */
export type OfferPrefill = {
  identity: Pick<OfferIdentity, "lastName" | "firstName" | "email" | "phone">;
  loanNeeded: boolean | null;
  downPaymentEuros: number | null;
  loanAmountEuros: number | null;
};

const euros = (cents: number | null) => (cents === null ? null : Math.round(cents / 100));

export async function offerPrefill(profileId: string): Promise<OfferPrefill> {
  const supabase = await createClient();
  const [user, profile, buyer] = await Promise.all([
    getUser(),
    supabase
      .from("profiles")
      .select("first_name, last_name, phone")
      .eq("id", profileId)
      .maybeSingle(),
    supabase
      .from("buyer_profiles")
      .select("loan_needed, down_payment_cents, loan_amount_cents")
      .eq("profile_id", profileId)
      .maybeSingle(),
  ]);
  // A prefill that cannot be read leaves the fields empty: the buyer types them.
  if (profile.error || buyer.error) {
    console.error("[offers] prefill read failed", {
      user_id: profileId,
      code: profile.error?.code ?? buyer.error?.code,
    });
  }
  return {
    identity: {
      lastName: profile.data?.last_name ?? "",
      firstName: profile.data?.first_name ?? "",
      email: user?.email ?? "",
      phone: profile.data?.phone ?? "",
    },
    loanNeeded: buyer.data?.loan_needed ?? null,
    downPaymentEuros: euros(buyer.data?.down_payment_cents ?? null),
    loanAmountEuros: euros(buyer.data?.loan_amount_cents ?? null),
  };
}
