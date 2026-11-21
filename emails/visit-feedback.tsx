import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The request for feedback the day after a visit (L3-03, SPEC-V2 14 and 18),
// to its buyer and to the seller of the property: a link to the page of the
// visit, where each gives theirs for 7 days. No address, no contact detail.

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

const t = fr.emails.visit;

export type VisitFeedbackEmailProps = {
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

export const visitFeedbackSubject = (seller: boolean) =>
  seller ? t.feedback.sellerSubject : t.feedback.buyerSubject;

export function VisitFeedbackEmail({
  firstName,
  seller,
  buyerFirstName,
  property,
  date,
  visitUrl,
  siteUrl,
}: VisitFeedbackEmailProps) {
  const text = seller
    ? t.feedback.sellerText(buyerFirstName, t.property(property, true), date)
    : t.feedback.buyerText(t.property(property, false), date);
  return (
    <EmailLayout
      preview={text}
      title={t.feedback.title}
      siteUrl={siteUrl}
      action={{
        href: visitUrl,
        label: seller ? t.feedback.sellerAction : t.feedback.buyerAction,
      }}
      why={seller ? t.sellerWhy : t.feedback.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{seller ? t.feedback.sellerNext : t.feedback.buyerNext}</Text>
      <Text style={emailText}>{t.feedback.delay}</Text>
    </EmailLayout>
  );
}
