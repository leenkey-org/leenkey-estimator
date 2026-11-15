import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// An offer withdrawn by its buyer (L2-04b, SPEC-V2 13 and 18), to the seller
// of the listing: the date and the time of the withdrawal. Never a contact
// detail of the buyer.

const t = fr.emails.offerWithdrawn;

export type OfferWithdrawnEmailProps = {
  firstName: string | null;
  buyerFirstName: string | null;
  property: string;
  /** « 338 000 € » */
  price: string;
  /** « 14/11/2026 à 10:12 » */
  withdrawnAt: string | null;
  offerUrl: string;
  siteUrl: string;
};

export const offerWithdrawnSubject = (reference: string) => t.subject(reference);

export function OfferWithdrawnEmail({
  firstName,
  buyerFirstName,
  property,
  price,
  withdrawnAt,
  offerUrl,
  siteUrl,
}: OfferWithdrawnEmailProps) {
  const text = t.text(buyerFirstName, price, property, withdrawnAt);
  return (
    <EmailLayout
      preview={text}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: offerUrl, label: t.action }}
      why={t.why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{t.next}</Text>
    </EmailLayout>
  );
}
