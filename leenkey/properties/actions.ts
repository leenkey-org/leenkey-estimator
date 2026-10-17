"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/core/auth/session";
import { searchAddresses } from "@/core/geo/addresses";
import { LAUNCH_ZONE_CENTRE } from "@/lib/config/launch-zone";
import { createClient } from "@/lib/supabase/server";
import {
  addressChoiceSchema,
  addressQuerySchema,
  characteristicsSchema,
  missingCharacteristics,
  type PropertyFeature,
} from "@/lib/validations/property";

// Server actions of the creation of a property (L1-11), with the seller's
// session: RLS and the column grants of L1-04 decide what they may write.

export type AddressSuggestion = { label: string; line: string; postalCode: string; city: string };

export type SuggestResult =
  | { ok: true; data: AddressSuggestion[] }
  | { ok: false; error: "auth" | "invalid" | "unavailable" };

/** Addresses for what is typed, those around the launch zone first. */
export async function suggestAddresses(text: unknown): Promise<SuggestResult> {
  if (!(await getProfile())) return { ok: false, error: "auth" };
  const parsed = addressQuerySchema.safeParse(text);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const result = await searchAddresses({ text: parsed.data, near: LAUNCH_ZONE_CENTRE, limit: 5 });
  if (!result.ok) return result;
  return {
    ok: true,
    data: result.data.map(({ label, line, postalCode, city }) => ({
      label,
      line,
      postalCode,
      city,
    })),
  };
}

export type SaveAddressResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: "auth" | "invalid" | "not_found" | "unavailable" };

/**
 * Step 1: creates the draft, or changes its address. The address is geocoded
 * again here: the point stored comes from the national base, never from the
 * browser. Creating a property makes the account a seller.
 */
export async function saveAddress(input: unknown): Promise<SaveAddressResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = addressChoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId, label } = parsed.data;

  const search = await searchAddresses({ text: label, near: LAUNCH_ZONE_CENTRE, limit: 5 });
  if (!search.ok) return { ok: false, error: "unavailable" };
  const address =
    search.data.find((candidate) => candidate.label.toLowerCase() === label.toLowerCase()) ??
    search.data[0];
  if (!address) return { ok: false, error: "not_found" };

  const values = {
    address_line: address.line,
    postal_code: address.postalCode,
    city: address.city,
    location: `SRID=4326;POINT(${address.lng} ${address.lat})`,
  };
  const supabase = await createClient();
  const { data, error } = propertyId
    ? await supabase
        .from("properties")
        .update(values)
        .eq("id", propertyId)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("properties")
        .insert({ owner_id: profile.id, ...values })
        .select("id")
        .single();
  if (error) {
    console.error("[properties] address save failed", {
      user_id: profile.id,
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // Nothing updated: someone else's property, deleted, or suspended.
  if (!data) return { ok: false, error: "not_found" };

  if (!propertyId && !profile.roles.includes("seller")) {
    const role = await supabase.rpc("profile_add_role", { p_role: "seller" });
    if (role.error) {
      console.error("[properties] seller role failed", {
        user_id: profile.id,
        code: role.error.code,
      });
    }
  }
  revalidatePath("/vendeur");
  return { ok: true, data: { id: data.id } };
}

export type CharacteristicsField =
  | "type"
  | "surfaceM2"
  | "carrezM2"
  | "rooms"
  | "bedrooms"
  | "floor"
  | "floorsTotal"
  | "buildYear"
  | "dpe"
  | "ges"
  | "heating"
  | "chargesMonthlyEuros"
  | "propertyTaxYearlyEuros"
  | "coproLots";

export type SaveCharacteristicsResult =
  | { ok: true; data: { complete: boolean } }
  | {
      ok: false;
      error: "auth" | "invalid" | "incomplete" | "not_found" | "unavailable";
      /** Field and message key (fr.properties.errors). */
      fieldErrors?: Partial<Record<CharacteristicsField, string>>;
    };

const FEATURE_COLUMNS: Record<PropertyFeature, string> = {
  balcony: "has_balcony",
  terrace: "has_terrace",
  garden: "has_garden",
  parking: "has_parking",
  cellar: "has_cellar",
  elevator: "has_elevator",
};

/**
 * Step 2, saved as a draft at any time (« Enregistrer », « Précédent »);
 * `next` also asks for what a listing needs: type, surface, rooms.
 */
export async function saveCharacteristics(
  input: unknown,
  intent: "save" | "next",
): Promise<SaveCharacteristicsResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const parsed = characteristicsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<CharacteristicsField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field !== "propertyId" && field !== "features") {
        fieldErrors[field as CharacteristicsField] ??=
          issue.code === "custom" ? issue.message : "outOfRange";
      }
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const value = parsed.data;
  const missing = missingCharacteristics(value);
  if (intent === "next" && missing.length > 0) {
    return {
      ok: false,
      error: "incomplete",
      fieldErrors: Object.fromEntries(missing.map((field) => [field, "required"])),
    };
  }

  const features = Object.fromEntries(
    Object.entries(FEATURE_COLUMNS).map(([feature, column]) => [
      column,
      value.features.includes(feature as PropertyFeature),
    ]),
  );
  const cents = (euros: number | null) => (euros === null ? null : euros * 100);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .update({
      type: value.type,
      surface_m2: value.surfaceM2,
      carrez_m2: value.carrezM2,
      rooms: value.rooms,
      bedrooms: value.bedrooms,
      floor: value.floor,
      floors_total: value.floorsTotal,
      build_year: value.buildYear,
      is_new_build: value.isNewBuild,
      dpe_class: value.dpe,
      ges_class: value.ges,
      heating: value.heating,
      charges_monthly_cents: cents(value.chargesMonthlyEuros),
      property_tax_yearly_cents: cents(value.propertyTaxYearlyEuros),
      copro_lots: value.coproLots,
      ...features,
    })
    .eq("id", value.propertyId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[properties] characteristics save failed", {
      user_id: profile.id,
      entity_id: value.propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: false, error: "not_found" };
  revalidatePath("/vendeur");
  return { ok: true, data: { complete: missing.length === 0 } };
}
