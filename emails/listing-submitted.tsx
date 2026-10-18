import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailText } from "./components/email-layout";

// Emails of a listing sent for review (SPEC-V2 section 18, L1-13): « Annonce
// reçue » to the seller, « Annonce à valider » to Leenkey (an internal
// notification, ADMIN_NOTIFICATION_EMAIL). Rendered by
// leenkey/properties/listing-emails.ts.

const t = fr.emails;

export function listingReceivedSubject(reference: string): string {
  return t.listingReceived.subject(reference);
}

export function listingToReviewSubject(reference: string): string {
  return t.listingToReview.subject(reference);
}

export type ListingReceivedEmailProps = {
  firstName: string | null;
  title: string;
  /** Seller area, where the listing is followed. */
  sellerUrl: string;
  siteUrl: string;
};

export function ListingReceivedEmail({
  firstName,
  title,
  sellerUrl,
  siteUrl,
}: ListingReceivedEmailProps) {
  const copy = t.listingReceived;
  return (
    <EmailLayout
      preview={copy.text(title)}
      title={copy.title}
      siteUrl={siteUrl}
      action={{ href: sellerUrl, label: copy.action }}
    >
      <Text style={emailText}>{t.greeting(firstName)}</Text>
      <Text style={emailText}>{copy.text(title)}</Text>
      <Text style={emailText}>{copy.next}</Text>
    </EmailLayout>
  );
}

export type ListingToReviewEmailProps = {
  title: string;
  reference: string;
  /** « Savigny-sur-Orge (91600) ». */
  place: string;
  /** « 239 000 € ». */
  price: string;
  sellerName: string | null;
  /** Page of the listing in the back office. */
  adminUrl: string;
  siteUrl: string;
};

export function ListingToReviewEmail({
  title,
  reference,
  place,
  price,
  sellerName,
  adminUrl,
  siteUrl,
}: ListingToReviewEmailProps) {
  const copy = t.listingToReview;
  return (
    <EmailLayout
      internal
      preview={copy.text(title)}
      title={copy.title}
      siteUrl={siteUrl}
      action={{ href: adminUrl, label: copy.action }}
    >
      <Text style={emailText}>{copy.text(title)}</Text>
      <Text style={emailText}>{copy.details(reference, place, price, sellerName)}</Text>
      <Text style={emailText}>{copy.deadline}</Text>
    </EmailLayout>
  );
}
