"use server";

import { z } from "zod";
import { getProfile } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DPE_NUMBER } from "@/lib/validations/property";
import { lookupDpe, type DpeRecord } from "./dpe-registry";

const findDpeSchema = z.object({
  propertyId: z.string().uuid(),
  number: z
    .string()
    .trim()
    .toUpperCase()
    .refine((text) => DPE_NUMBER.test(text)),
});

export type FindDpeResult =
  | {
      ok: true;
      /** samePostalCode: the DPE is registered at the postal code of the property. */
      data: { record: DpeRecord; samePostalCode: boolean };
    }
  | {
      ok: false;
      /** unknown: the register of ADEME has no DPE for this number. */
      error: "auth" | "invalid" | "not_found" | "unknown" | "unavailable";
    };

/**
 * The DPE of a number, taken from the register of ADEME to fill step 2
 * (L1-66): the seller types its number, not its values. For the seller's own
 * property only. Nothing is saved here: the form is, as any other change.
 */
export async function findDpe(input: unknown): Promise<FindDpeResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = findDpeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, number } = parsed.data;

  const supabase = await createClient();
  const property = await supabase
    .from("properties")
    .select("postal_code")
    .eq("id", propertyId)
    .eq("owner_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (property.error) {
    console.error("[properties] property read failed", {
      user_id: profile.id,
      entity_id: propertyId,
      code: property.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!property.data) return { ok: false, error: "not_found" };

  const found = await lookupDpe(number);
  if (!found.ok) return found;
  if (!found.data) return { ok: false, error: "unknown" };
  return {
    ok: true,
    data: {
      record: found.data,
      samePostalCode:
        found.data.postalCode === null || found.data.postalCode === property.data.postal_code,
    },
  };
}
