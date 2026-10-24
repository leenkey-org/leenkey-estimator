import { Link, Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailLink, emailText } from "./components/email-layout";

// Several listings sent for review at once (SPEC-V2 section 10, L1-22): one
// email to Leenkey instead of one each (an internal notification,
// ADMIN_NOTIFICATION_EMAIL). A single listing keeps « Annonce à valider »
// (listing-submitted.tsx).

const t = fr.emails;

export function listingsToReviewSubject(count: number): string {
  return t.listingsToReview.subject(count);
}

export type ListingToReviewItem = {
  title: string;
  /** « LK-0042 · Savigny-sur-Orge (91600) · 239 000 € ». */
  details: string;
  adminUrl: string;
};

export type ListingsToReviewEmailProps = {
  items: readonly ListingToReviewItem[];
  /** The list of the back office, the listings to review first. */
  listUrl: string;
  siteUrl: string;
};

export function ListingsToReviewEmail({ items, listUrl, siteUrl }: ListingsToReviewEmailProps) {
  const copy = t.listingsToReview;
  return (
    <EmailLayout
      internal
      preview={copy.text}
      title={copy.title(items.length)}
      siteUrl={siteUrl}
      action={{ href: listUrl, label: copy.action }}
    >
      <Text style={emailText}>{copy.text}</Text>
      {items.map((item) => (
        <Text key={item.adminUrl} style={emailText}>
          <Link href={item.adminUrl} style={emailLink}>
            {item.title}
          </Link>
          <br />
          {item.details}
        </Text>
      ))}
      <Text style={emailText}>{t.listingToReview.deadline}</Text>
    </EmailLayout>
  );
}
