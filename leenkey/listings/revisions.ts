import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toRevision, type ListingRevision } from "./revision";

// The history of a listing online (L1-35), read with the session (RLS: its
// seller and the team only), the most recent first.

/** The lines shown; more are kept in the database. */
export const REVISIONS_SHOWN = 50;

export type RevisionsResult =
  | { ok: true; data: { entries: ListingRevision[]; limited: boolean } }
  | { ok: false; error: "unavailable" };

export async function listingRevisions(listingId: string): Promise<RevisionsResult> {
  const supabase = await createClient();
  const [rows, owner] = await Promise.all([
    supabase
      .from("listing_revisions")
      .select("id, field, old_value, new_value, created_at, changed_by")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(REVISIONS_SHOWN + 1),
    supabase
      .from("listings")
      .select("property:properties(owner_id)")
      .eq("id", listingId)
      .maybeSingle(),
  ]);
  if (rows.error || owner.error) {
    console.error("[listings] revisions unreadable", {
      entity_id: listingId,
      error: rows.error?.code ?? owner.error?.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const ownerId = owner.data?.property?.owner_id ?? null;
  const entries = rows.data
    .slice(0, REVISIONS_SHOWN)
    .flatMap((row) => toRevision(row, ownerId) ?? []);
  return { ok: true, data: { entries, limited: rows.data.length > REVISIONS_SHOWN } };
}
