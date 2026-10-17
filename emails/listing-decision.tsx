import { Link, Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, EmailQuote, emailLink, emailText } from "./components/email-layout";

// Emails of the moderation of a listing (SPEC-V2 sections 17 and 18):
// published, to correct (rejected) and suspended, with the motive written
// by Leenkey. Rendered by leenkey/admin/listing-emails.ts.

const t = fr.emails;

export type ListingDecision = "published" | "rejected" | "suspended";

export type ListingDecisionEmailProps = {
  decision: ListingDecision;
  firstName: string | null;
  title: string;
  /** Required for rejected and suspended. */
  reason?: string;
  /** Public page of the listing (published). */
  listingUrl: string;
  /** Seller area, where the listing is corrected. */
  sellerUrl: string;
  contactEmail: string;
  siteUrl: string;
};

export function listingDecisionSubject(decision: ListingDecision, reference: string): string {
  if (decision === "published") return t.listingPublished.subject(reference);
  if (decision === "rejected") return t.listingRejected.subject(reference);
  return t.listingSuspended.subject(reference);
}

export function ListingDecisionEmail({
  decision,
  firstName,
  title,
  reason,
  listingUrl,
  sellerUrl,
  contactEmail,
  siteUrl,
}: ListingDecisionEmailProps) {
  if (decision === "published") {
    const copy = t.listingPublished;
    return (
      <EmailLayout
        preview={copy.text(title)}
        title={copy.title}
        siteUrl={siteUrl}
        action={{ href: listingUrl, label: copy.action }}
      >
        <Text style={emailText}>{t.greeting(firstName)}</Text>
        <Text style={emailText}>{copy.text(title)}</Text>
        <Text style={emailText}>{copy.tips}</Text>
      </EmailLayout>
    );
  }
  if (decision === "rejected") {
    const copy = t.listingRejected;
    return (
      <EmailLayout
        preview={copy.text(title)}
        title={copy.title}
        siteUrl={siteUrl}
        action={{ href: sellerUrl, label: copy.action }}
      >
        <Text style={emailText}>{t.greeting(firstName)}</Text>
        <Text style={emailText}>{copy.text(title)}</Text>
        <EmailQuote label={copy.reason} text={reason ?? ""} />
        <Text style={emailText}>{copy.next}</Text>
      </EmailLayout>
    );
  }
  const copy = t.listingSuspended;
  return (
    <EmailLayout
      preview={copy.text(title)}
      title={copy.title}
      siteUrl={siteUrl}
      action={{ href: sellerUrl, label: copy.action }}
    >
      <Text style={emailText}>{t.greeting(firstName)}</Text>
      <Text style={emailText}>{copy.text(title)}</Text>
      <EmailQuote label={copy.reason} text={reason ?? ""} />
      <Text style={emailText}>
        {copy.contest.before}
        <Link href={`mailto:${contactEmail}`} style={emailLink}>
          {contactEmail}
        </Link>
        {copy.contest.after}
      </Text>
    </EmailLayout>
  );
}
