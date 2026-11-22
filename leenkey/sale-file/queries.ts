import "server-only";
import type { FinancingStatus } from "@/components/shared/financing-badge";
import type { DocumentType, PropertyType } from "@/lib/config/documents";
import { createClient } from "@/lib/supabase/server";
import {
  buyerSummary,
  sellerAnalysis,
  type BuyerSummary,
  type SellerAnalysis,
} from "./analysis-view";
import { buildChecklist, type Checklist } from "./checklist";

// The sale file as its parties read it (L3-04, SPEC-V2 15), with the session
// of the user (RLS): the seller the documents, the « Non concerné », the
// shares and the access requests of their property; a buyer what is shared
// with them. The columns are named: the extracted text, the analysis and the
// note of the review are not readable (column grants): the seller reads the
// analyses of their documents, a buyer the summary meant for them, through
// functions (L3-05).

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
  /** Its reading aid by the assistant (L3-05); null when it could not be read. */
  analysis: SellerAnalysis | null;
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
  /** Not subject to the DPE (L1-65): its reason. */
  dpeExemption: string | null = null,
): Promise<QueryResult<SellerSaleFile>> {
  const supabase = await createClient();
  const [documents, exemptions, buyers, requests, analyses] = await Promise.all([
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
    supabase.rpc("document_analyses", { p_property: propertyId }),
  ]);
  const failed = documents.error ?? exemptions.error ?? buyers.error ?? requests.error;
  if (failed) {
    console.error("[sale-file] seller file read failed", {
      entity_id: propertyId,
      code: failed.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // Without the analyses the file still shows: they are a help, not the file.
  if (analyses.error) {
    console.error("[sale-file] analyses read failed", {
      entity_id: propertyId,
      code: analyses.error.code,
    });
  }
  const typeOf = new Map((documents.data ?? []).map((row) => [row.id, row.type]));
  const analysisOf = new Map(
    (analyses.data ?? []).flatMap((row) => {
      const type = typeOf.get(row.document_id);
      return type ? [[row.document_id, sellerAnalysis(row, type)] as const] : [];
    }),
  );
  const rows: SellerDocument[] = (documents.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    sharedWith: row.shares.map((share) => share.buyer_id),
    analysis: analysisOf.get(row.id) ?? null,
  }));
  // « À actualiser »: from the date read in a document that is what it says.
  const filed = rows.map((row) => ({
    ...row,
    documentDate: row.analysis?.analysis?.quality === "ok" ? row.analysis.analysis.date : null,
  }));
  const buyerOf = new Map((buyers.data ?? []).map((buyer) => [buyer.buyer_id, buyer]));
  return {
    ok: true,
    data: {
      checklist: buildChecklist(propertyType, filed, exemptions.data ?? [], dpeExemption),
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
  /** The summary meant for a buyer (L3-05), once the document is analysed. */
  summary: BuyerSummary | null;
};

export type SharedProperty = {
  propertyId: string;
  /** Its listing, once one of its documents has a summary (the assistant answers about it, L3-07). */
  listingId: string | null;
  listingTitle: string | null;
  listingSlug: string | null;
  city: string;
  documents: SharedDocument[];
};

/** The documents shared with the caller, grouped by property, the last share first. */
export async function buyerSharedDocuments(): Promise<QueryResult<SharedProperty[]>> {
  const supabase = await createClient();
  const [{ data, error }, summaries] = await Promise.all([
    supabase.rpc("shared_documents"),
    // The summaries of L3-05 with the listing of their property (L3-07).
    supabase.rpc("shared_document_answers"),
  ]);
  if (error) {
    console.error("[sale-file] shared documents read failed", { code: error.code });
    return { ok: false, error: "unavailable" };
  }
  // Without the summaries the documents still show.
  if (summaries.error) {
    console.error("[sale-file] shared summaries read failed", { code: summaries.error.code });
  }
  const summaryOf = new Map(
    (summaries.data ?? []).map((row) => [row.document_id, buyerSummary(row)]),
  );
  const listingOf = new Map(
    (summaries.data ?? [])
      .filter((row) => summaryOf.get(row.document_id))
      .map((row) => [row.property_id, row.listing_id]),
  );
  const groups = new Map<string, SharedProperty>();
  for (const row of data) {
    const group = groups.get(row.property_id) ?? {
      propertyId: row.property_id,
      listingId: listingOf.get(row.property_id) ?? null,
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
      summary: summaryOf.get(row.document_id) ?? null,
    });
    groups.set(row.property_id, group);
  }
  return { ok: true, data: [...groups.values()] };
}

export type SharedDocumentAnswer = {
  documentId: string;
  type: DocumentType;
  /** The name its seller gave it. */
  title: string;
  propertyId: string;
  listingId: string | null;
  listingTitle: string | null;
  city: string;
  sharedAt: string;
  summary: BuyerSummary;
};

/**
 * What the assistant of a buyer answers from (L3-07): the summaries meant
 * for a buyer of the documents shared with the caller, of the property of a
 * listing or of all (null), the last share first. Read with the session of
 * the caller through shared_document_answers: never a document that is not
 * shared with them, never the summary of the seller, never a file.
 */
export async function sharedDocumentAnswers(
  listingId: string | null,
): Promise<QueryResult<SharedDocumentAnswer[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "shared_document_answers",
    listingId ? { p_listing: listingId } : {},
  );
  if (error) {
    console.error("[sale-file] shared answers read failed", {
      entity_id: listingId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  return {
    ok: true,
    data: data.flatMap((row) => {
      const summary = buyerSummary(row);
      return summary
        ? [
            {
              documentId: row.document_id,
              type: row.type,
              title: row.title,
              propertyId: row.property_id,
              listingId: row.listing_id,
              listingTitle: row.listing_title,
              city: row.city,
              sharedAt: row.shared_at,
              summary,
            },
          ]
        : [];
    }),
  };
}

export type BuyerAccess = "none" | "pending" | "granted" | "declined";

/** A declined request is asked again after 7 days (document_access_request). */
const ASK_AGAIN_MS = 7 * 86_400_000;

/**
 * Where the access requests of a buyer stand, by property: a request
 * declined more than 7 days ago reads as none (it can be asked again).
 */
export async function buyerAccessByProperty(
  propertyIds: readonly string[],
  profileId: string,
): Promise<Map<string, BuyerAccess>> {
  const result = new Map<string, BuyerAccess>();
  if (propertyIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_access_requests")
    .select("property_id, status, answered_at")
    .eq("buyer_id", profileId)
    .in("property_id", [...propertyIds]);
  if (error) {
    console.error("[sale-file] access requests read failed", {
      user_id: profileId,
      code: error.code,
    });
    return result;
  }
  for (const row of data) {
    const again =
      row.status === "declined" &&
      row.answered_at !== null &&
      Date.now() - Date.parse(row.answered_at) > ASK_AGAIN_MS;
    result.set(
      row.property_id,
      again
        ? "none"
        : row.status === "pending" || row.status === "granted" || row.status === "declined"
          ? row.status
          : "none",
    );
  }
  return result;
}
