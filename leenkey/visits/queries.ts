import "server-only";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import { createClient } from "@/lib/supabase/server";
import { VISIT_TOKEN, type VisitInterest } from "@/lib/validations/visit";
import type { Database } from "@/types/database";
import { interestOf } from "./feedback";

// Visits as their parties read them (L3-02, SPEC-V2 14), with the session of
// the user (RLS): the seller the slots, the invitations and the visits of
// their property; the buyer their own visits and, with the token of an
// invitation, the free slots. The exact address only through visit_address
// (the buyer of a confirmed visit, the seller). The columns of visits are
// named: the note of the seller is not readable by a buyer (L3-03), a read
// of every column is refused.

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };
export type VisitStatus = Database["public"]["Enums"]["visit_status"];

export type Slot = { id: string; startsAt: string; endsAt: string };

export type SellerSlot = Slot & {
  /** The first name of the buyer of its confirmed visit, when it has one. */
  bookedBy: string | null;
  visitId: string | null;
};

export type SellerVisit = {
  id: string;
  slotId: string;
  startsAt: string;
  endsAt: string;
  status: VisitStatus;
  buyerId: string;
  buyerFirstName: string | null;
  financingStatus: FinancingStatus;
  /** What the buyer said after the visit (L3-03), as given: 1 to 5, a comment. */
  buyerInterest: VisitInterest | null;
  buyerFeedback: string | null;
};

export type Contact = {
  buyerId: string;
  firstName: string | null;
  financingStatus: FinancingStatus;
  /** An invitation still valid: its end. */
  invitedUntil: string | null;
  /** A visit to come is booked. */
  hasVisit: boolean;
};

export type SellerVisits = { slots: SellerSlot[]; visits: SellerVisit[]; contacts: Contact[] };

/** Everything the tab « Visites » of a property shows to its seller. */
export async function sellerVisits(propertyId: string): Promise<QueryResult<SellerVisits>> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [slots, visits, buyers, invitations] = await Promise.all([
    supabase
      .from("visit_slots")
      .select("id, starts_at, ends_at")
      .eq("property_id", propertyId)
      .is("removed_at", null)
      .gt("starts_at", now)
      .order("starts_at"),
    supabase
      .from("visits")
      .select(
        "id, status, buyer_id, slot_id, buyer_interest, buyer_feedback, slot:visit_slots!inner(starts_at, ends_at)",
      )
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("buyer_summary_for_seller", { p_property_id: propertyId }),
    supabase
      .from("visit_invitations")
      .select("buyer_id, expires_at")
      .eq("property_id", propertyId)
      .gt("expires_at", now),
  ]);
  const failed = slots.error ?? visits.error ?? buyers.error ?? invitations.error;
  if (failed) {
    console.error("[visits] seller visits read failed", {
      entity_id: propertyId,
      code: failed.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const buyerOf = new Map((buyers.data ?? []).map((buyer) => [buyer.buyer_id, buyer]));
  const invited = new Map((invitations.data ?? []).map((row) => [row.buyer_id, row.expires_at]));
  const visitRows: SellerVisit[] = (visits.data ?? []).map((row) => ({
    id: row.id,
    slotId: row.slot_id,
    startsAt: row.slot.starts_at,
    endsAt: row.slot.ends_at,
    status: row.status,
    buyerId: row.buyer_id,
    buyerFirstName: buyerOf.get(row.buyer_id)?.first_name ?? null,
    financingStatus: buyerOf.get(row.buyer_id)?.financing_status ?? "not_provided",
    buyerInterest: interestOf(row.buyer_interest),
    buyerFeedback: row.buyer_feedback,
  }));
  const upcoming = visitRows.filter(
    (visit) => visit.status === "confirmed" && Date.parse(visit.startsAt) > Date.now(),
  );
  const bySlot = new Map(upcoming.map((visit) => [visit.slotId, visit]));
  return {
    ok: true,
    data: {
      slots: (slots.data ?? []).map((slot) => {
        const visit = bySlot.get(slot.id);
        return {
          id: slot.id,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          bookedBy: visit ? (visit.buyerFirstName ?? "") : null,
          visitId: visit?.id ?? null,
        };
      }),
      visits: visitRows.sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
      contacts: (buyers.data ?? []).map((buyer) => ({
        buyerId: buyer.buyer_id,
        firstName: buyer.first_name,
        financingStatus: buyer.financing_status,
        invitedUntil: invited.get(buyer.buyer_id) ?? null,
        hasVisit: upcoming.some((visit) => visit.buyerId === buyer.buyer_id),
      })),
    },
  };
}

/** The listing a visit is about; its slug while it is online. */
export type VisitListing = { title: string; slug: string | null; city: string };

export type Invitation = {
  propertyId: string;
  expiresAt: string;
  listing: VisitListing | null;
  slots: Slot[];
  /** A visit to come already booked on the property: its id. */
  bookedVisitId: string | null;
};

/**
 * The invitation of the caller for this token and its free slots; `none` when
 * the token is not theirs, has expired, or was replaced by a new invitation;
 * `offline` when the listing left the site.
 */
export async function invitationForBooking(
  token: string,
  profileId: string,
): Promise<QueryResult<Invitation | "none" | "offline">> {
  if (!VISIT_TOKEN.test(token)) return { ok: true, data: "none" };
  const supabase = await createClient();
  const { data: invitation, error } = await supabase
    .from("visit_invitations")
    .select("property_id, expires_at")
    .eq("token", token)
    .eq("buyer_id", profileId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) {
    console.error("[visits] invitation read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  if (!invitation) return { ok: true, data: "none" };
  const now = new Date().toISOString();
  const [slots, listing, booked] = await Promise.all([
    supabase.rpc("visit_open_slots", { p_token: token }),
    supabase.rpc("visit_listing", { p_property: invitation.property_id }),
    supabase
      .from("visits")
      .select("id, slot:visit_slots!inner(starts_at)")
      .eq("property_id", invitation.property_id)
      .eq("buyer_id", profileId)
      .eq("status", "confirmed")
      .gt("slot.starts_at", now)
      .limit(1),
  ]);
  if (slots.error) {
    // 22023: the listing is no longer online.
    if (slots.error.code === "22023") return { ok: true, data: "offline" };
    console.error("[visits] open slots read failed", {
      user_id: profileId,
      code: slots.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: {
      propertyId: invitation.property_id,
      expiresAt: invitation.expires_at,
      listing: listing.data?.[0] ?? null,
      slots: (slots.data ?? []).map((slot) => ({
        id: slot.slot_id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
      })),
      bookedVisitId: booked.data?.[0]?.id ?? null,
    },
  };
}

export type VisitDetail = {
  id: string;
  propertyId: string;
  status: VisitStatus;
  startsAt: string;
  endsAt: string;
  role: "buyer" | "seller";
  listing: VisitListing | null;
  /** The exact address: the buyer of a confirmed visit, the seller. */
  address: { line: string; postalCode: string; city: string } | null;
  /** What the buyer said after the visit (L3-03): both parties read it. */
  buyerInterest: VisitInterest | null;
  buyerFeedback: string | null;
  /** The note of the seller: always null for the buyer (visit_seller_note). */
  sellerNote: string | null;
};

/** A visit as one of its two parties reads it; null when it is not theirs. */
export async function visitDetail(
  visitId: string,
  profileId: string,
): Promise<QueryResult<VisitDetail | null>> {
  const supabase = await createClient();
  const { data: visit, error } = await supabase
    .from("visits")
    .select(
      "id, property_id, buyer_id, status, buyer_interest, buyer_feedback, slot:visit_slots!inner(starts_at, ends_at)",
    )
    .eq("id", visitId)
    .maybeSingle();
  if (error) {
    console.error("[visits] visit read failed", {
      user_id: profileId,
      entity_id: visitId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!visit) return { ok: true, data: null };
  const role = visit.buyer_id === profileId ? "buyer" : "seller";
  const [address, listing, note] = await Promise.all([
    role === "seller" || visit.status === "confirmed"
      ? supabase.rpc("visit_address", { p_visit: visitId })
      : Promise.resolve({ data: null, error: null }),
    supabase.rpc("visit_listing", { p_property: visit.property_id }),
    role === "seller"
      ? supabase.rpc("visit_seller_note", { p_visit: visitId })
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (note.error) {
    console.error("[visits] seller note read failed", {
      user_id: profileId,
      entity_id: visitId,
      code: note.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const place = address.data?.[0] ?? null;
  // Neither its buyer nor the seller of the property (an admin reads the row): not their page.
  if (role === "seller" && !listing.data?.[0]) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      id: visit.id,
      propertyId: visit.property_id,
      status: visit.status,
      startsAt: visit.slot.starts_at,
      endsAt: visit.slot.ends_at,
      role,
      listing: listing.data?.[0] ?? null,
      address: place
        ? { line: place.address_line, postalCode: place.postal_code, city: place.city }
        : null,
      buyerInterest: interestOf(visit.buyer_interest),
      buyerFeedback: visit.buyer_feedback,
      sellerNote: note.data ?? null,
    },
  };
}

export type BuyerVisit = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: VisitStatus;
  title: string | null;
  city: string | null;
};

/** The visits to come of a buyer, the next one first. */
export async function buyerUpcomingVisits(profileId: string): Promise<QueryResult<BuyerVisit[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("id, status, property_id, slot:visit_slots!inner(starts_at, ends_at)")
    .eq("buyer_id", profileId)
    .eq("status", "confirmed")
    .gt("slot.starts_at", new Date().toISOString())
    .limit(20);
  if (error) {
    console.error("[visits] buyer visits read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  const properties = [...new Set(data.map((row) => row.property_id))];
  const listings = await Promise.all(
    properties.map(async (id) => {
      const { data: rows } = await supabase.rpc("visit_listing", { p_property: id });
      return [id, rows?.[0] ?? null] as const;
    }),
  );
  const listingOf = new Map(listings);
  return {
    ok: true,
    data: data
      .map((row) => ({
        id: row.id,
        startsAt: row.slot.starts_at,
        endsAt: row.slot.ends_at,
        status: row.status,
        title: listingOf.get(row.property_id)?.title ?? null,
        city: listingOf.get(row.property_id)?.city ?? null,
      }))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  };
}

/**
 * The link of the invitation of a buyer on a property, while it is valid:
 * what the notice of the conversation opens.
 */
export async function invitationLink(
  propertyId: string,
  profileId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("visit_invitations")
    .select("token")
    .eq("property_id", propertyId)
    .eq("buyer_id", profileId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data ? `/visites/reserver/${data.token}` : null;
}
