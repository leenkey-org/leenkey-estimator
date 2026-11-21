"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { createClient } from "@/lib/supabase/server";
import {
  alertActiveSchema,
  alertIdSchema,
  createAlertSchema,
  renameAlertSchema,
} from "@/lib/validations/alert";
import type { Json } from "@/types/database";

// What a buyer does with their alerts (L3-06, SPEC-V2 16), with their
// session: the policies of `alerts` decide (their own rows, an active
// account), its trigger refuses the sixth (23514). No service role;
// last_sent_at is the digest's to write.

type Failure = "auth" | "invalid" | "unavailable";

const revalidate = () => {
  revalidatePath(ROUTES.buyerAlerts);
};

export type CreateAlertResult =
  | { ok: true; data: { id: string; name: string } }
  | { ok: false; error: Failure | "limit" };

/** Keeps a search under a name: the criteria of the search page, at least one. */
export async function createAlert(input: unknown): Promise<CreateAlertResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = createAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .insert({
      buyer_id: profile.id,
      name: parsed.data.name,
      // Parsed: the stored form of SearchFilters, nothing else.
      criteria: parsed.data.criteria as Json,
    })
    .select("id, name")
    .single();
  if (error) {
    // The trigger alerts_limit: five alerts at most (the name and the criteria are checked above).
    if (error.code === "23514") return { ok: false, error: "limit" };
    console.error("[alerts] not created", { user_id: profile.id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  revalidate();
  return { ok: true, data };
}

export type AlertChangeResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: Failure | "not_found" };

async function change(
  id: string,
  profileId: string,
  changes: { name: string } | { active: boolean },
): Promise<AlertChangeResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .update(changes)
    .eq("id", id)
    .eq("buyer_id", profileId)
    .select("id");
  if (error) {
    console.error("[alerts] not changed", { user_id: profileId, entity_id: id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  if (data.length === 0) return { ok: false, error: "not_found" };
  revalidate();
  return { ok: true, data: { id } };
}

/** Pauses an alert or starts it again. */
export async function setAlertActive(input: unknown): Promise<AlertChangeResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = alertActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return change(parsed.data.id, profile.id, { active: parsed.data.active });
}

export async function renameAlert(input: unknown): Promise<AlertChangeResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = renameAlertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return change(parsed.data.id, profile.id, { name: parsed.data.name });
}

export async function deleteAlert(input: unknown): Promise<AlertChangeResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = alertIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alerts")
    .delete()
    .eq("id", parsed.data)
    .eq("buyer_id", profile.id)
    .select("id");
  if (error) {
    console.error("[alerts] not deleted", {
      user_id: profile.id,
      entity_id: parsed.data,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (data.length === 0) return { ok: false, error: "not_found" };
  revalidate();
  return { ok: true, data: { id: parsed.data } };
}
