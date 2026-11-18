import "server-only";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import type { DocumentType, PropertyType } from "@/lib/config/documents";
import { createClient } from "@/lib/supabase/server";
import { buildChecklist, type Checklist } from "./checklist";

// The sale file as its parties read it (L3-04, SPEC-V2 15), with the session
// of the user (RLS): the seller the documents, the « Non concerné », the
// shares and the access requests of their property; a buyer what is shared
// with them. The columns are named: the extracted text, the analysis and the
// note of the review are not readable (column grants).

export type QueryResult<T> = { ok: true; data: T } | { ok: false; error: "unavailable" };

const DOCUMENT_COLUMNS = "id, type, title, mime_type, size_bytes, created_at" as const;

export type SellerDocument = {
  id: string;
  type: DocumentType;
  title: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  /** The buyers it is shared with. */
  sharedWith: string[];
};

export type FileContact = {
  buyerId: string;
  firstName: string | null;
  financingStatus: FinancingStatus;
  /** How many documents of the property are shared with them. */
  shared: number;
};

export type AccessRequest = {
  id: string;
  buyerId: string;
  firstName: string | null;
  financingStatus: FinancingStatus;
  createdAt: string;
};

export type SellerSaleFile = {
  checklist: Checklist;
  documents: SellerDocument[];
  contacts: FileContact[];
  requests: AccessRequest[];
};

export async function sellerSaleFile(
  propertyId: string,
  propertyType: PropertyType | null,
): Promise<QueryResult<SellerSaleFile>> {
  const supabase = await createClient();
  const [documents, exemptions, buyers, requests] = await Promise.all([
    supabase
      .from("documents")
      .select(`${DOCUMENT_COLUMNS}, shares:document_shares(buyer_id)`)
      .eq("property_id", propertyId)
      .is("deleted_at", null)
      .order("created_at"),
    supabase.from("document_exemptions").select("type, reason").eq("property_id", propertyId),
    supabase.rpc("buyer_summary_for_seller", { p_property_id: propertyId }),
    supabase
      .from("document_access_requests")
      .select("id, buyer_id, created_at")
      .eq("property_id", propertyId)
      .eq("status", "pending")
      .order("created_at"),
  ]);
  const failed = documents.error ?? exemptions.error ?? buyers.error ?? requests.error;
  if (failed) {
    console.error("[sale-file] seller file read failed", {
      entity_id: propertyId,
      code: failed.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const rows: SellerDocument[] = (documents.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    sharedWith: row.shares.map((share) => share.buyer_id),
  }));
  const buyerOf = new Map((buyers.data ?? []).map((buyer) => [buyer.buyer_id, buyer]));
  return {
    ok: true,
    data: {
      checklist: buildChecklist(propertyType, rows, exemptions.data ?? []),
      documents: rows,
      contacts: (buyers.data ?? []).map((buyer) => ({
        buyerId: buyer.buyer_id,
        firstName: buyer.first_name,
        financingStatus: buyer.financing_status,
        shared: rows.filter((row) => row.sharedWith.includes(buyer.buyer_id)).length,
      })),
      requests: (requests.data ?? []).map((request) => ({
        id: request.id,
        buyerId: request.buyer_id,
        firstName: buyerOf.get(request.buyer_id)?.first_name ?? null,
        financingStatus: buyerOf.get(request.buyer_id)?.financing_status ?? "not_provided",
        createdAt: request.created_at,
      })),
    },
  };
}

export type SharedDocument = {
  id: string;
  type: DocumentType;
  title: string;
  mimeType: string;
  sizeBytes: number;
  sharedAt: string;
};

export type SharedProperty = {
  propertyId: string;
  listingTitle: string | null;
  listingSlug: string | null;
  city: string;
  documents: SharedDocument[];
};

/** The documents shared with the caller, grouped by property, the last share first. */
export async function buyerSharedDocuments(): Promise<QueryResult<SharedProperty[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("shared_documents");
  if (error) {
    console.error("[sale-file] shared documents read failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  const groups = new Map<string, SharedProperty>();
  for (const row of data) {
    const group = groups.get(row.property_id) ?? {
      propertyId: row.property_id,
      listingTitle: row.listing_title,
      listingSlug: row.listing_slug,
      city: row.city,
      documents: [],
    };
    group.documents.push({
      id: row.document_id,
      type: row.type,
      title: row.title,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      sharedAt: row.shared_at,
    });
    groups.set(row.property_id, group);
  }
  return { ok: true, data: [...groups.values()] };
}

export type BuyerAccess = "none" | "pending" | "granted" | "declined";

/** Where the access request of a buyer on a property stands. */
export async function buyerAccess(propertyId: string, profileId: string): Promise<BuyerAccess> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_access_requests")
    .select("status")
    .eq("property_id", propertyId)
    .eq("buyer_id", profileId)
    .maybeSingle();
  return data?.status === "pending" || data?.status === "granted" || data?.status === "declined"
    ? data.status
    : "none";
}
