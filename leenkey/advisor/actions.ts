"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { interventionRequestSchema } from "@/lib/validations/advisor-intervention";

// « Demander une intervention » (DECISIONS.md 2026-11-23). The database
// decides (advisor_intervention_request, with the session of the seller): the
// property is theirs, their account active, its plan has the adviser and
// sells interventions, some are left. The request is also their message in
// the conversation with the adviser; the team is told by its trigger. No
// service role.

export type InterventionRequestError =
  | "auth"
  | "invalid"
  /** The interventions of the plan are used. */
  | "quota"
  /** The requests that wait already hold the interventions left. */
  | "pending"
  /** The plan of the property sells no intervention (ended, refunded, Autonomie). */
  | "noAdvisor"
  /** Too many messages sent within the hour (the request is a message). */
  | "rate"
  | "unavailable";

export type InterventionRequestResult =
  | { ok: true; data: { interventionId: string } }
  | { ok: false; error: InterventionRequestError };

export async function requestIntervention(input: unknown): Promise<InterventionRequestResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = interventionRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, reason, message } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("advisor_intervention_request", {
    p_property: propertyId,
    p_reason: reason,
    p_message: message,
  });
  if (error) {
    if (error.code === "54000") {
      const refusal = error.message.includes("quota")
        ? "quota"
        : error.message.includes("pending")
          ? "pending"
          : "rate";
      return { ok: false, error: refusal };
    }
    if (error.code === "22023") {
      const noAdvisor =
        error.message.includes("no intervention") || error.message.includes("no conversation");
      return { ok: false, error: noAdvisor ? "noAdvisor" : "invalid" };
    }
    if (error.code !== "42501") {
      console.error("[advisor] intervention not requested", {
        user_id: profile.id,
        entity_id: propertyId,
        code: error.code,
      });
    }
    return { ok: false, error: "unavailable" };
  }
  revalidatePath(`/vendeur/biens/${propertyId}/intervention`);
  revalidatePath("/vendeur");
  revalidatePath("/messages", "layout");
  revalidatePath("/admin/messages", "layout");
  return { ok: true, data: { interventionId: data } };
}
