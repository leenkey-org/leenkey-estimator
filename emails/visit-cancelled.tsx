import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// A visit cancelled (L3-02, SPEC-V2 14), to the party who did not cancel:
// the buyer when the seller cancels, the seller when the buyer does. No
// address, no contact detail.

const t = fr.emails.visit;

export type VisitCancelledEmailProps = {
  firstName: string | null;
  /** The seller of the property reads it; otherwise the buyer of the visit. */
  seller: boolean;
  buyerFirstName: string | null;
  property: string | null;
  /** « samedi 21 novembre à 10 h 30 » */
  date: string;
  visitUrl: string;
  siteUrl: string;
};

export const visitCancelledSubject = (date: string) => t.cancelled.subject(date);

export function VisitCancelledEmail({
  firstName,
  seller,
  buyerFirstName,
  property,
  date,
  visitUrl,
  siteUrl,
}: VisitCancelledEmailProps) {
  const text = seller
    ? t.cancelled.sellerText(buyerFirstName, t.property(property, true), date)
    : t.cancelled.buyerText(t.property(property, false), date);
  return (
    <EmailLayout
      preview={text}
      title={t.cancelled.title}
      siteUrl={siteUrl}
      action={{
        href: visitUrl,
        label: seller ? t.cancelled.sellerAction : t.cancelled.buyerAction,
      }}
      why={seller ? t.sellerWhy : t.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{seller ? t.cancelled.sellerNext : t.cancelled.buyerNext}</Text>
    </EmailLayout>
  );
}
