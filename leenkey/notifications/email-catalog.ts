import "server-only";
import type { ReactElement } from "react";
import { render } from "@react-email/components";
import type { EmailPolicy, PlannedEmail, QueuedNotification } from "@/core/notifications/batch";
import { emailSafeText } from "@/core/notifications/user-text";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { ListingToReviewEmail, listingToReviewSubject } from "@/emails/listing-submitted";
import { ListingsToReviewEmail, listingsToReviewSubject } from "@/emails/listings-to-review";
import { NewMessagesEmail, newMessagesSubject } from "@/emails/new-messages";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { adminListingsHref } from "@/lib/validations/admin";

// The notification emails of Leenkey that the cron sends grouped (SPEC-V2
// sections 10 and 18, L1-22): who gets them, how often, and their content
// from the facts written by the database. The others (listing published, to
// correct) leave with the decision of the back office (L1-19).

const POLICIES: Record<string, EmailPolicy> = {
  // One email per conversation every 15 minutes at most, none once read.
  "message.new": { audience: "recipient", preference: "email_messages", throttleMinutes: 15 },
  // « Digest si > 3 en 1 h »: one email, then the next ones together, 20 minutes later at the
  // earliest: never more than 3 in an hour.
  "listing.pending": { audience: "team", throttleMinutes: 20 },
};

export function emailPolicy(type: string): EmailPolicy | null {
  return POLICIES[type] ?? null;
}

export type RenderedEmail = { subject: string; html: string; text: string; replyTo?: string };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function rendered(subject: string, element: ReactElement, replyTo?: string) {
  const [html, plain] = await Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
  return { subject, html, text: plain, ...(replyTo ? { replyTo } : {}) };
}

/** The new messages of a conversation: the excerpt of the last one. */
async function newMessages(email: PlannedEmail): Promise<RenderedEmail | null> {
  const last = email.items.at(-1);
  if (!last) return null;
  // Written by the other party: a first name or words a mail client would make a link of stay
  // out of the email.
  const senderName = emailSafeText(last.data.sender_first_name);
  const words = text(last.data.excerpt);
  const excerpt = emailSafeText(words);
  const count = email.items.length;
  return rendered(
    newMessagesSubject(senderName, count),
    NewMessagesEmail({
      firstName: email.firstName,
      senderName,
      listingTitle: emailSafeText(last.data.listing_title),
      excerpt: excerpt ? `${excerpt}${last.data.truncated === true ? "…" : ""}` : null,
      excerptHidden: Boolean(words) && !excerpt,
      count,
      // A message of the seller goes to the buyer, and the other way round.
      recipient: last.data.from === "seller" ? "buyer" : "seller",
      conversationUrl: absoluteUrl(last.link ?? "/messages"),
      siteUrl: siteUrl(),
    }),
    fr.legal.contactEmail,
  );
}

function place(item: QueuedNotification): string {
  const city = text(item.data.city);
  const postalCode = text(item.data.postal_code);
  return [city, postalCode ? `(${postalCode})` : null].filter(Boolean).join(" ");
}

function price(item: QueuedNotification): string {
  const cents = Number(item.data.price_cents);
  return Number.isFinite(cents) && cents > 0 ? formatPrice(cents) : "";
}

function adminUrl(item: QueuedNotification): string {
  return absoluteUrl(item.link ?? adminListingsHref({ status: "pending" }));
}

/** Listings sent for review: one email for one, a list for several. */
async function listingsToReview(email: PlannedEmail): Promise<RenderedEmail | null> {
  const [first, ...others] = email.items;
  if (!first) return null;
  const reference = text(first.data.reference) ?? "";
  const title = text(first.data.title) ?? reference;
  if (others.length === 0) {
    return rendered(
      listingToReviewSubject(reference),
      ListingToReviewEmail({
        title,
        reference,
        place: place(first),
        price: price(first),
        sellerName: text(first.data.seller_first_name),
        adminUrl: adminUrl(first),
        siteUrl: siteUrl(),
      }),
    );
  }
  return rendered(
    listingsToReviewSubject(email.items.length),
    ListingsToReviewEmail({
      items: email.items.map((item) => ({
        title: text(item.data.title) ?? text(item.data.reference) ?? "",
        details: fr.emails.listingToReview.details(
          text(item.data.reference) ?? "",
          place(item),
          price(item),
          text(item.data.seller_first_name),
        ),
        adminUrl: adminUrl(item),
      })),
      listUrl: absoluteUrl(adminListingsHref({ status: "pending" })),
      siteUrl: siteUrl(),
    }),
  );
}

/** The email of a group, ready to leave; null when its type has none. */
export function renderNotificationEmail(email: PlannedEmail): Promise<RenderedEmail | null> {
  switch (email.type) {
    case "message.new":
      return newMessages(email);
    case "listing.pending":
      return listingsToReview(email);
    default:
      return Promise.resolve(null);
  }
}
