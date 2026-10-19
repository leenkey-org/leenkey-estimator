import "server-only";
import { notFound, redirect } from "next/navigation";
import { inCreation } from "./creation";
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
