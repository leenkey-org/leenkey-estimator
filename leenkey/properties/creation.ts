import { formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { LISTING_TITLE_MAX } from "@/lib/validations/listing";
import { missingCharacteristics, type Characteristics } from "@/lib/validations/property";
import type { Database } from "@/types/database";

// Rules of the creation of a property in steps (L1-11), shared by its pages,
// its server actions and « Ma vente ». Pure: unit tested.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** Where a draft resumes: the step after the last one filled. */
export type CreationStep = "caracteristiques" | "prix" | "apercu";

/**
 * The steps of the creation change a property until its listing is sent for
 * review, and again once it is rejected; then it changes from its page (L1-14).
 */
export function inCreation(status: ListingStatus | null): boolean {
  return status === null || status === "draft" || status === "rejected";
}

/**
 * Once sent (in review, online or paused), a listing still changes from the
 * page of its property, and stays as it is (L1-14b, SPEC-V2 8.3): its
 * characteristics, photos, price, title and description; never its address.
 * Never once suspended by Leenkey (read only) or sold.
 */
export function editableOnceSent(status: ListingStatus | null): status is SentStatus {
  return status === "pending" || status === "published" || status === "paused";
}

/** The status of a listing sent that still changes (L1-14b). */
export type SentStatus = Extract<ListingStatus, "pending" | "published" | "paused">;

/** The listing of a draft as step 3 saves it (L1-13): a price, perhaps a description. */
export type DraftListing = { description: string } | null;

export function creationStep(
  characteristics: Parameters<typeof missingCharacteristics>[0],
  listing: DraftListing = null,
): CreationStep {
  if (missingCharacteristics(characteristics).length > 0) return "caracteristiques";
  return listing && listing.description.trim() !== "" ? "apercu" : "prix";
}

/**
 * Title proposed at step 3 (SPEC-V2 8.3), changed at will: « Appartement 3
 * pièces 68 m² · Savigny-sur-Orge », « Terrain 1 250 m² · Grigny ». Plain
 * spaces: the title is searched in the back office as it is typed.
 */
export function suggestedTitle(
  characteristics: Pick<Characteristics, "type" | "rooms" | "surfaceM2">,
  city: string,
): string {
  const { type, rooms, surfaceM2 } = characteristics;
  const kind = type ? fr.propertyType[type] : fr.propertyType.autre;
  const withRooms = (type === "appartement" || type === "maison") && rooms !== null && rooms > 0;
  const parts = [
    withRooms ? `${kind} ${fr.listing.summary.rooms(rooms)}` : kind,
    surfaceM2 !== null ? formatSurface(surfaceM2) : null,
  ].filter((part): part is string => part !== null);
  const title = `${parts.join(" ")} · ${city}`.replace(/[\u00A0\u202F]/g, " ");
  return [...title].slice(0, LISTING_TITLE_MAX).join("");
}

/**
 * Gap of a price to the value of the analysis of value, in whole percents
 * (SPEC-V2 8.3): 3 above it, -5 below, 0 within half a percent; null without
 * a value to compare with.
 */
export function priceGap(priceCents: number, valueCents: number): number | null {
  if (valueCents <= 0) return null;
  const gap = Math.round(((priceCents - valueCents) / valueCents) * 100);
  return gap === 0 ? 0 : gap;
}

/** « 12 Rue de la Gare 91360 Épinay-sur-Orge », as the national base writes it. */
export function addressLabel(address: { line: string; postalCode: string; city: string }): string {
  return `${address.line} ${address.postalCode} ${address.city}`;
}
