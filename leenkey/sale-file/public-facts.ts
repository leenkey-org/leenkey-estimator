import "server-only";
import type { DocumentType } from "@/lib/config/documents";
import { createPublicClient } from "@/lib/supabase/public";
import { publicFactLines, type PublicFactLine } from "./analysis-view";

// The facts a seller chose to show on a listing online (L3-05, SPEC-V2 15):
// read by anyone through public_document_facts, with the public key. Never a
// file, never the title its seller typed: the type of the document and the
// facts the assistant read in it, among those its type may give.

export type PublicDocumentFacts = { type: DocumentType; lines: PublicFactLine[] };

/** The facts shown on a listing, by document; none when there are none or they cannot be read. */
export async function publicDocumentFacts(listingId: string): Promise<PublicDocumentFacts[]> {
  const { data, error } = await createPublicClient().rpc("public_document_facts", {
    p_listing_id: listingId,
  });
  if (error) {
    // The page shows without them.
    console.error("[sale-file] public facts read failed", {
      entity_id: listingId,
      code: error.code,
    });
    return [];
  }
  return data
    .map((row) => ({ type: row.type, lines: publicFactLines(row.type, row.facts) }))
    .filter((group) => group.lines.length > 0);
}
