import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import {
  ListingReceivedEmail,
  ListingToReviewEmail,
  listingReceivedSubject,
  listingToReviewSubject,
} from "@/emails/listing-submitted";
import { appEnv } from "@/lib/env";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl, siteUrl } from "@/lib/site";

// Emails of a listing sent for review (SPEC-V2 section 18, L1-13), after the
// sending: « Annonce reçue » to the seller, « Annonce à valider » to the
// address of the notifications of Leenkey. Outside production, both go to
// EMAIL_TEST_INBOX (core/notifications/email.ts). A failure is written to
// the log and never undoes the sending.

export type SubmittedListing = {
  listingId: string;
  reference: string;
  title: string;
  city: string;
  postalCode: string;
  priceCents: number;
  seller: { email: string | null; firstName: string | null };
};

export type SubmissionEmails = { seller: EmailDelivery; admin: EmailDelivery };

/** ADMIN_NOTIFICATION_EMAIL; outside production any address does: the test inbox gets it. */
function adminAddress(): string | null {
  const address = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (address) return address;
  return appEnv() === "production" ? null : "admin@leenkey.fr";
}

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
    sellerUrl: absoluteUrl("/vendeur"),
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

async function toAdmin(listing: SubmittedListing): Promise<EmailDelivery> {
  const to = adminAddress();
  if (!to) {
    console.error("[properties] review email skipped: ADMIN_NOTIFICATION_EMAIL missing", {
      entity_id: listing.listingId,
    });
    return "failed";
  }
  const element = ListingToReviewEmail({
    title: listing.title,
    reference: listing.reference,
    place: `${listing.city} (${listing.postalCode})`,
    price: formatPrice(listing.priceCents),
    sellerName: listing.seller.firstName,
    adminUrl: absoluteUrl(`/admin/annonces/${listing.listingId}`),
    siteUrl: siteUrl(),
  });
  const [html, text] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
  return sendEmail({ to, subject: listingToReviewSubject(listing.reference), html, text });
}

async function safely(
  send: () => Promise<EmailDelivery>,
  listing: SubmittedListing,
  to: string,
): Promise<EmailDelivery> {
  try {
    return await send();
  } catch (error) {
    console.error("[properties] submission email failed", {
      entity_id: listing.listingId,
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}

export async function emailListingSubmitted(listing: SubmittedListing): Promise<SubmissionEmails> {
  const [seller, admin] = await Promise.all([
    safely(() => toSeller(listing), listing, "seller"),
    safely(() => toAdmin(listing), listing, "admin"),
  ]);
  return { seller, admin };
}
