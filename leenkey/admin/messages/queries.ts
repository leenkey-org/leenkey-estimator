import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { fullName, type QueryResult } from "../users/queries";

// The shared inbox of the advisor conversations (L1-34, SPEC-V2 section 17),
// with the admin's session: admin_advisor_conversations checks is_admin(),
// the unread ones first (the seller wrote last, nobody of the team read it),
// then the most recent. Each read calls requireAdmin() too.

type Enums = Database["public"]["Enums"];

export type AdminAdvisorConversation = {
  id: string;
  propertyId: string;
  sellerId: string;
  /** The last case of the property (L1-30c), null without any. */
  caseId: string | null;
  reference: string | null;
  listingTitle: string | null;
  propertyType: Enums["property_type"] | null;
  rooms: number | null;
  city: string | null;
  coverPath: string | null;
  sellerName: string | null;
  sellerFirstName: string | null;
  plan: Enums["plan_code"];
  lastMessageAt: string;
  lastMessageBody: string;
  /** The seller wrote last: the team owes an answer. */
  lastFromSeller: boolean;
  unread: boolean;
  closed: boolean;
};

/** Every advisor conversation, for the list and the open conversation (cached for the request). */
export const adminAdvisorConversations = cache(
  async (): Promise<QueryResult<AdminAdvisorConversation[]>> => {
    await requireAdmin();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("admin_advisor_conversations");
    if (error) {
      console.error("[admin] advisor conversations read failed", { code: error.code });
      return { ok: false, error: "unavailable" };
    }
    // Generated types declare the columns of a function result as never null.
    return {
      ok: true,
      data: data.map((row) => ({
        id: row.id,
        propertyId: row.property_id,
        sellerId: row.seller_id,
        caseId: row.case_id as string | null,
        reference: row.reference as string | null,
        listingTitle: row.listing_title as string | null,
        propertyType: row.property_type as Enums["property_type"] | null,
        rooms: row.rooms as number | null,
        city: row.city as string | null,
        coverPath: row.cover_path as string | null,
        sellerName: fullName(
          row.seller_first_name as string | null,
          row.seller_last_name as string | null,
        ),
        sellerFirstName: (row.seller_first_name as string | null)?.trim() || null,
        plan: row.plan,
        lastMessageAt: new Date(row.last_message_at).toISOString(),
        lastMessageBody: row.last_message_body,
        lastFromSeller: row.last_from_seller,
        unread: row.unread,
        closed: (row.closed_at as string | null) !== null,
      })),
    };
  },
);

/** More than 24 h without an answer of the team (SPEC-V2 17: in orange). */
export const ADVISOR_ANSWER_WITHIN_MS = 24 * 60 * 60 * 1000;

export function awaitingAnswer(
  conversation: Pick<AdminAdvisorConversation, "lastFromSeller" | "lastMessageAt" | "closed">,
  now: Date,
): boolean {
  return (
    conversation.lastFromSeller &&
    !conversation.closed &&
    now.getTime() - new Date(conversation.lastMessageAt).getTime() > ADVISOR_ANSWER_WITHIN_MS
  );
}
