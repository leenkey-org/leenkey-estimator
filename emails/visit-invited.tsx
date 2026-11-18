import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// An invitation to visit (L3-02, SPEC-V2 14 and 18), to the buyer the seller
// invites: the link to book a slot, and until when it is valid. Never the
// address, never a contact detail of the seller.

const t = fr.emails.visit;

export type VisitInvitedEmailProps = {
  firstName: string | null;
  sellerFirstName: string | null;
  /** The title of the listing; null when it cannot go in an email. */
  property: string | null;
  /** The town, when the title does not carry it already. */
  city: string | null;
  /** « samedi 21 novembre à 10 h 30 » */
  validUntil: string | null;
  bookingUrl: string;
  siteUrl: string;
};

export const visitInvitedSubject = (city: string | null) => t.invited.subject(city);

export function VisitInvitedEmail({
  firstName,
  sellerFirstName,
  property,
  city,
  validUntil,
  bookingUrl,
  siteUrl,
}: VisitInvitedEmailProps) {
  const text = t.invited.text(sellerFirstName, t.property(property, false), city);
  return (
    <EmailLayout
      preview={text}
      title={t.invited.title}
      siteUrl={siteUrl}
      action={{ href: bookingUrl, label: t.invited.action }}
      why={t.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>
        {t.invited.next}
        {validUntil ? ` ${t.invited.validity(validUntil)}` : null}
      </Text>
    </EmailLayout>
  );
}
