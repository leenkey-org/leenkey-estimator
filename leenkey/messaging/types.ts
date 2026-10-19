import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

// Conversations of the messaging about a property (L1-21, SPEC-V2 8.6), as
// conversation_summaries() gives them to one of their participants.

export type ConversationSummary = {
  id: string;
  /** The side of the viewer in this conversation. */
  role: "seller" | "buyer";
  propertyId: string;
  listingId: string | null;
  listingSlug: string | null;
  listingStatus: Enums["listing_status"] | null;
  listingTitle: string | null;
  propertyType: Enums["property_type"] | null;
  rooms: number | null;
  city: string | null;
  /** Base of the files of the main photo; null when the viewer may not see it. */
  coverPath: string | null;
  counterpartFirstName: string | null;
  /** For the seller only (never amounts or documents, CLAUDE.md 7). */
  buyerFinancingStatus: Enums["financing_status"] | null;
  lastMessageAt: string;
  lastMessageBody: string;
  lastMessageMine: boolean;
  unread: boolean;
  closed: boolean;
};

/** The listing a buyer writes to for the first time (/messages/nouveau). */
export type ContactListing = {
  id: string;
  slug: string;
  type: Enums["property_type"];
  rooms: number | null;
  city: string;
  sellerFirstName: string | null;
  coverPath: string | null;
};
