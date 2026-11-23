import "server-only";
import { requireAdmin } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";

// The request to bring a listing into line (DECISIONS.md 2026-11-22), as the
// page of the listing in the back office reads it: with the session of the
// admin (RLS of listings, listing_compliance_changed checks is_admin()).

export type ListingCompliance = {
  requestedAt: string;
  dueAt: string;
  reason: string;
  remindedAt: string | null;
  /** The listing changed since the request (then it is not deleted). */
  changed: boolean;
};

export type ComplianceRead = { ok: true; data: ListingCompliance | null } | { ok: false };

/** The request standing on a listing; null without one. */
export async function listingCompliance(listingId: string): Promise<ComplianceRead> {
  const admin = await requireAdmin();
  try {
    const supabase = await createClient();
    const [row, changed] = await Promise.all([
      supabase
        .from("listings")
        .select(
          "compliance_requested_at, compliance_due_at, compliance_reason, compliance_reminded_at",
        )
        .eq("id", listingId)
        .maybeSingle(),
      supabase.rpc("listing_compliance_changed", { p_listing_id: listingId }),
    ]);
    if (row.error) throw new Error(`listings: ${row.error.code}`);
    if (changed.error) throw new Error(`listing_compliance_changed: ${changed.error.code}`);
    const data = row.data;
    if (!data?.compliance_requested_at || !data.compliance_due_at || !data.compliance_reason) {
      return { ok: true, data: null };
    }
    return {
      ok: true,
      data: {
        requestedAt: data.compliance_requested_at,
        dueAt: data.compliance_due_at,
        reason: data.compliance_reason,
        remindedAt: data.compliance_reminded_at,
        changed: changed.data === true,
      },
    };
  } catch (error) {
    console.error("[admin] compliance read failed", {
      user_id: admin.id,
      entity_id: listingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false };
  }
}
