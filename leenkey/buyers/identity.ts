import "server-only";
import { createClient } from "@/lib/supabase/server";
import { identityOf, type BuyerIdentity } from "./identity-status";

// The identity document of the signed-in buyer (DECISIONS.md 2026-11-23),
// with their session: RLS shows them their own rows only, and never the note
// of the team nor who decided (column grants). Kept apart from the buying
// project on purpose: what the assistant reads of a buyer
// (leenkey/ai/buyer-data.ts) never includes it.

export type IdentityResult =
  | { ok: true; data: BuyerIdentity }
  | { ok: false; error: "unavailable" };

export async function buyerIdentity(profileId: string): Promise<IdentityResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identity_documents")
    .select(
      "id, type, mime_type, created_at, checked_at, refused_at, refusal_reason, withdrawn_at, file_deleted_at",
    )
    .eq("buyer_id", profileId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[buyers] identity read failed", { user_id: profileId, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  return { ok: true, data: identityOf(data) };
}
