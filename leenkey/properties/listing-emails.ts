import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { ListingReceivedEmail, listingReceivedSubject } from "@/emails/listing-submitted";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { sheetHref } from "./sheet";

// Email of a listing sent for review (SPEC-V2 section 18, L1-13), after the
// sending: « Annonce reçue » to the seller. Leenkey hears of it through the
// notifications (listing.pending): its « Annonce à valider » leaves with the
// cron, grouped when several listings come within the hour (L1-22,
// leenkey/notifications/email-catalog.ts). Outside production, it goes to
// EMAIL_TEST_INBOX (core/notifications/email.ts). A failure is written to the
// log and never undoes the sending.

export type SubmittedListing = {
  /** Its page, where the seller follows the review (L1-14). */
  propertyId: string;
  listingId: string;
  reference: string;
  title: string;
  seller: { email: string | null; firstName: string | null };
};

async function toSeller(listing: SubmittedListing): Promise<EmailDelivery> {
  if (!listing.seller.email) {
    console.error("[properties] submission email skipped: no seller email", {
      entity_id: listing.listingId,
    });
    return "failed";
  }
  const element = ListingReceivedEmail({
    firstName: listing.seller.firstName,
    title: listing.title,
    sellerUrl: absoluteUrl(sheetHref(listing.propertyId)),
    siteUrl: siteUrl(),
  });
  const [html, text] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
  return sendEmail({
    to: listing.seller.email,
    subject: listingReceivedSubject(listing.reference),
    html,
    text,
    replyTo: fr.legal.contactEmail,
  });
}

export async function emailListingSubmitted(listing: SubmittedListing): Promise<EmailDelivery> {
  try {
    return await toSeller(listing);
  } catch (error) {
    console.error("[properties] submission email failed", {
      entity_id: listing.listingId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
