import "server-only";
import { requireProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { creationStep, inCreation } from "./creation";
import { answersFromEstimation } from "./from-estimation";
import { sellerProperty } from "./queries";

export type EstimationStart =
  /** Not readable: an anonymous analysis to attach first (or someone else's). */
  | { state: "claim" }
  /** A property was already made from it: its step, never a second one. */
  | { state: "resume"; href: string }
  | { state: "new"; madeAt: string; address: string | null };

/**
 * /vendeur/biens/nouveau?estimation= (L1-13b, SPEC-V2 8.2 and 8.3), with the
 * seller's session: their analysis starts the creation. null when it cannot
 * be read: the creation goes on without it.
 */
export async function estimationStart(estimationId: string): Promise<EstimationStart | null> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [estimation, existing] = await Promise.all([
    supabase
      .from("estimations")
      .select("id, input, created_at")
      .eq("id", estimationId)
      .maybeSingle(),
    supabase
      .from("properties")
      .select("id")
      .eq("estimation_id", estimationId)
      .eq("owner_id", profile.id)
      .is("deleted_at", null)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  if (estimation.error || existing.error) {
    console.error("[properties] estimation start failed", {
      user_id: profile.id,
      entity_id: estimationId,
      code: estimation.error?.code ?? existing.error?.code,
    });
    return null;
  }
  if (!estimation.data) return { state: "claim" };
  if (existing.data) {
    const property = await sellerProperty(existing.data.id);
    if (property.ok && property.data) {
      const { id, characteristics, listing, listingStatus } = property.data;
      return {
        state: "resume",
        href: inCreation(listingStatus)
          ? `/vendeur/biens/${id}/${creationStep(characteristics, listing)}`
          : "/vendeur",
      };
    }
  }
  return {
    state: "new",
    madeAt: estimation.data.created_at,
    address: answersFromEstimation(estimation.data.input).address,
  };
}
