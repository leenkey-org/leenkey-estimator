import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { ContactListing, ConversationSummary } from "./types";

// Reads of the messaging (L1-21, SPEC-V2 8.6), with the session of the
// participant: conversation_summaries() gives a participant their listing
// conversations only (supabase/migrations/20261020100000_messaging.sql).

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * The conversations of the signed-in account, most recent first. Cached for
 * the request: the metadata, the list and the open conversation share it.
 */
export const listConversations = cache(async (): Promise<QueryResult<ConversationSummary[]>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("conversation_summaries");
  if (error) {
    console.error("[messaging] conversations read failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  // Generated types declare the columns of a function result as never null.
  return {
    ok: true,
    data: data.map((row) => ({
      id: row.id,
      role: row.role === "seller" ? "seller" : "buyer",
      propertyId: row.property_id,
      listingId: row.listing_id as string | null,
      listingSlug: row.listing_slug as string | null,
      listingStatus: row.listing_status as ConversationSummary["listingStatus"],
      listingTitle: row.listing_title as string | null,
      propertyType: row.property_type as ConversationSummary["propertyType"],
      rooms: row.rooms as number | null,
      city: row.city as string | null,
      coverPath: row.cover_path as string | null,
      counterpartFirstName: row.counterpart_first_name as string | null,
      buyerFinancingStatus:
        row.buyer_financing_status as ConversationSummary["buyerFinancingStatus"],
      lastMessageAt: new Date(row.last_message_at).toISOString(),
      lastMessageBody: row.last_message_body,
      lastMessageMine: row.last_message_mine,
      unread: row.unread,
      closed: (row.closed_at as string | null) !== null,
    })),
  };
});

/** A conversation of the account, null when it is not one of theirs. */
export async function getConversation(
  id: string,
): Promise<QueryResult<ConversationSummary | null>> {
  const result = await listConversations();
  if (!result.ok) return result;
  return { ok: true, data: result.data.find((conversation) => conversation.id === id) ?? null };
}

/** The published listing a buyer writes to, with its main photo; null when it is not online. */
export async function contactListing(
  listingId: string,
): Promise<QueryResult<ContactListing | null>> {
  try {
    const supabase = createPublicClient();
    const listing = await supabase
      .from("public_listings")
      .select("id, slug, type, rooms, city, seller_first_name")
      .eq("id", listingId)
      .maybeSingle();
    if (listing.error) throw new Error(`public_listings: ${listing.error.code}`);
    const row = listing.data;
    if (!row?.id || !row.slug || !row.type || !row.city) return { ok: true, data: null };
    const cover = await supabase.rpc("public_listing_photos", {
      p_listing_ids: [row.id],
      p_cover_only: true,
    });
    // Without its photo the header keeps the drawing.
    if (cover.error) {
      console.error("[messaging] cover read failed", { entity_id: row.id, code: cover.error.code });
    }
    return {
      ok: true,
      data: {
        id: row.id,
        slug: row.slug,
        type: row.type,
        rooms: row.rooms,
        city: row.city,
        sellerFirstName: row.seller_first_name,
        coverPath: cover.data?.[0]?.path ?? null,
      },
    };
  } catch (error) {
    console.error("[messaging] listing read failed", {
      entity_id: listingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "unavailable" };
  }
}

/**
 * The property of this listing when it belongs to the account (a seller does
 * not write to themselves), to send them to its page; null otherwise. RLS
 * shows a property to its owner and the admin, hence the owner filter.
 */
export async function ownedPropertyId(
  profileId: string,
  listingId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, listings!inner(id)")
    .eq("owner_id", profileId)
    .eq("listings.id", listingId)
    .is("deleted_at", null)
    .limit(1);
  if (error) {
    console.error("[messaging] owner check failed", {
      user_id: profileId,
      entity_id: listingId,
      code: error.code,
    });
    return null;
  }
  return data[0]?.id ?? null;
}
