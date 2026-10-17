import { missingCharacteristics } from "@/lib/validations/property";
import type { Database } from "@/types/database";

// Rules of the creation of a property in steps (L1-11), shared by its pages,
// its server actions and « Ma vente ». Pure: unit tested.

type ListingStatus = Database["public"]["Enums"]["listing_status"];

/** Where a draft resumes: the step after the last one filled. */
export type CreationStep = "caracteristiques" | "prix";

/**
 * The steps of the creation change a property until its listing is sent for
 * review, and again once it is rejected; then it changes from its page (L1-14).
 */
export function inCreation(status: ListingStatus | null): boolean {
  return status === null || status === "draft" || status === "rejected";
}

export function creationStep(
  characteristics: Parameters<typeof missingCharacteristics>[0],
): CreationStep {
  return missingCharacteristics(characteristics).length > 0 ? "caracteristiques" : "prix";
}

/** « 12 Rue de la Gare 91360 Épinay-sur-Orge », as the national base writes it. */
export function addressLabel(address: { line: string; postalCode: string; city: string }): string {
  return `${address.line} ${address.postalCode} ${address.city}`;
}
