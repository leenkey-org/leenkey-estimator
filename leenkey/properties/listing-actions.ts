"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { ZodIssue } from "zod";
import { getProfile, getUser } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  listingDraftSchema,
  listingIntentSchema,
  missingListing,
  submitListingSchema,
  type ListingDraftField,
} from "@/lib/validations/listing";
import { missingCharacteristics } from "@/lib/validations/property";
import type { TablesInsert } from "@/types/database";
import { inCreation } from "./creation";
import { readDraft } from "./drafts";
import { emailListingSubmitted } from "./listing-emails";

// Server actions of steps 3 and 4 of the creation (L1-13), with the seller's
// session: RLS and the column grants of L1-04 decide what they may write
// (price, title and description; the status through listing_submit only).
// As the other steps, only a draft or a rejected listing of the seller; its
// price, title and description also once it is sent, from the page of the
// property (L1-14b): it stays in review, online or paused.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type SaveListingResult =
  | { ok: true; data: { complete: boolean } }
  | {
      ok: false;
      error: "auth" | "invalid" | "incomplete" | "not_found" | "unavailable";
      /** Field and message key (fr.properties.price.errors). */
      fieldErrors?: Partial<Record<ListingDraftField, string>>;
    };

/** Message key of a refused field (fr.properties.price.errors). */
function errorKey(field: ListingDraftField, issue: ZodIssue): string {
  if (issue.code === "custom") return issue.message;
  if (field === "title") return "titleLength";
  if (field === "description") return "descriptionLength";
  return issue.code === "too_big" ? "priceTooHigh" : "price";
}

/** The listing of the property, if step 3 created it. */
async function listingOf(supabase: Supabase, propertyId: string) {
  return supabase
    .from("listings")
    .select("id")
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .maybeSingle();
}

/**
 * Step 3, saved as a draft at any time (« Enregistrer », « Précédent »). The
 * first save creates the listing, which needs its price (a required column
 * of listings, with the title and the description); `next` also asks for the
 * description, and so does a listing already sent (L1-14b).
 */
export async function saveListingDraft(
  input: unknown,
  intent: unknown,
): Promise<SaveListingResult> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "auth" };
  const step = listingIntentSchema.safeParse(intent);
  const parsed = listingDraftSchema.safeParse(input);
  if (!step.success || !parsed.success) {
    const fieldErrors: Partial<Record<ListingDraftField, string>> = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0];
      if (field === "priceEuros" || field === "title" || field === "description") {
        fieldErrors[field] ??= errorKey(field, issue);
      }
    }
    return { ok: false, error: "invalid", fieldErrors };
  }
  const value = parsed.data;
  const missing = missingListing(value);
  const required: ListingDraftField[] =
    step.data === "next" ? missing : value.priceEuros === null ? ["priceEuros"] : [];
  if (required.length > 0 || value.priceEuros === null) {
    return {
      ok: false,
      error: "incomplete",
      fieldErrors: Object.fromEntries(required.map((field) => [field, "required"])),
    };
  }

  const supabase = await createClient();
  const draft = await readDraft(supabase, value.propertyId, profile.id, { sent: true });
  if (!draft.ok) return draft;
  if (!inCreation(draft.status) && missing.length > 0) {
    return {
      ok: false,
      error: "incomplete",
      fieldErrors: Object.fromEntries(missing.map((field) => [field, "required"])),
    };
  }

  const values = {
    title: value.title,
    description: value.description,
    price_cents: value.priceEuros * 100,
  };
  const update = (id: string) =>
    supabase.from("listings").update(values).eq("id", id).select("id").maybeSingle();
  // reference and slug are set by listings_before_insert (the seller has no
  // grant on them): the generated type asks for them, the table does not.
  const created = { property_id: value.propertyId, ...values } as TablesInsert<"listings">;
  const existing = await listingOf(supabase, value.propertyId);
  let write = existing.error
    ? existing
    : existing.data
      ? await update(existing.data.id)
      : await supabase.from("listings").insert(created).select("id").maybeSingle();
  // Created at the same moment by another save (a second tab): update it.
  if (write.error?.code === "23505") {
    const created = await listingOf(supabase, value.propertyId);
    write = created.data ? await update(created.data.id) : created;
  }
  if (write.error) {
    console.error("[properties] listing save failed", {
      user_id: profile.id,
      entity_id: value.propertyId,
      code: write.error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  // Nothing written: suspended in the meantime (RLS of the update).
  if (!write.data) return { ok: false, error: "not_found" };
  // The page of the property too (L1-14b), under /vendeur.
  revalidatePath("/vendeur", "layout");
  return { ok: true, data: { complete: missing.length === 0 } };
}

export type SubmitListingResult =
  | { ok: true }
  | {
      ok: false;
      /**
       * characteristics: type, surface or rooms missing (step 2); listing: no
       * price or description yet (step 3).
       */
      error: "auth" | "invalid" | "not_found" | "characteristics" | "listing" | "unavailable";
    };

/**
 * Step 4: « Envoyer en validation ». listing_submit checks the property and
 * the transition again; then the emails of SPEC section 18, sent after the
 * answer (after()): the seller does not wait for them.
 */
export async function submitListing(input: unknown): Promise<SubmitListingResult> {
  const [profile, user] = await Promise.all([getProfile(), getUser()]);
  if (!profile) return { ok: false, error: "auth" };
  const parsed = submitListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { propertyId } = parsed.data;
  const supabase = await createClient();
  const draft = await readDraft(supabase, propertyId, profile.id);
  if (!draft.ok) return draft;

  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      "id, reference, title, description, price_cents, property:properties!inner(type, surface_m2, rooms, city, postal_code)",
    )
    .eq("property_id", propertyId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) {
    console.error("[properties] listing read failed", {
      user_id: profile.id,
      entity_id: propertyId,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!listing || listing.description.trim() === "") return { ok: false, error: "listing" };
  const property = listing.property;
  const characteristics = {
    type: property.type,
    surfaceM2: property.surface_m2,
    rooms: property.rooms,
  };
  if (missingCharacteristics(characteristics).length > 0) {
    return { ok: false, error: "characteristics" };
  }

  const sent = await supabase.rpc("listing_submit", { p_listing_id: listing.id });
  if (sent.error) {
    console.error("[properties] listing submit failed", {
      user_id: profile.id,
      entity_id: listing.id,
      code: sent.error.code,
    });
    // 22023: no longer a draft (sent from another tab), or changed meanwhile.
    return { ok: false, error: sent.error.code === "22023" ? "not_found" : "unavailable" };
  }

  after(() =>
    emailListingSubmitted({
      propertyId,
      listingId: listing.id,
      reference: listing.reference,
      title: listing.title,
      city: property.city,
      postalCode: property.postal_code,
      priceCents: Number(listing.price_cents),
      seller: { email: user?.email ?? null, firstName: profile.firstName },
    }),
  );
  revalidatePath("/vendeur");
  return { ok: true };
}
