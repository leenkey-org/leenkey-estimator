import "server-only";
import { notFound, redirect } from "next/navigation";
import { editableOnceSent, inCreation, type CreationStep, type SentStatus } from "./creation";
import { sellerProperty, type SellerProperty } from "./queries";
import { sheetHref } from "./sheet";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The property of a step of the creation: a 404 when it is not the seller's,
 * its page once its listing has left the draft (sent, online): it is then
 * changed from there (L1-14). null: it could not be read.
 */
export async function propertyForCreation(id: string): Promise<SellerProperty | null> {
  const property = await propertyForSheet(id);
  if (property && !inCreation(property.listingStatus)) redirect(sheetHref(property.id));
  return property;
}

/** The property of its page (L1-14): a 404 when it is not the seller's; null when it could not be read. */
export async function propertyForSheet(id: string): Promise<SellerProperty | null> {
  if (!UUID.test(id)) notFound();
  const result = await sellerProperty(id);
  if (!result.ok) return null;
  if (!result.data) notFound();
  return result.data;
}

/**
 * The property of a page that changes its listing once sent (L1-14b): a 404
 * when it is not the seller's; a draft or a rejected listing changes at the
 * step of the creation `step`, a suspended or sold one is read only (its
 * page). null: it could not be read.
 */
export async function propertyForEdit(
  id: string,
  step: CreationStep,
): Promise<(SellerProperty & { listingStatus: SentStatus }) | null> {
  const property = await propertyForSheet(id);
  if (!property) return null;
  const status = property.listingStatus;
  if (inCreation(status)) redirect(`/vendeur/biens/${property.id}/${step}`);
  if (!editableOnceSent(status)) redirect(sheetHref(property.id));
  return { ...property, listingStatus: status };
}
