import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, EmailQuote, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// The answer of a seller to an offer (L2-04a, SPEC-V2 13 and 18), to its
// buyer: accepted or declined, with the message of the seller when there is
// one. No legal conclusion: the notaries set the conditions of the sale.

const t = fr.emails.offerAnswered;

export type OfferAnsweredEmailProps = {
  firstName: string | null;
  accepted: boolean;
  property: string;
  /** « 338 000 € » */
  price: string;
  /** Written by the seller: shown as a quote, never as markup. */
  message: string | null;
  offerUrl: string;
  siteUrl: string;
};

export const offerAnsweredSubject = (accepted: boolean, reference: string) =>
  t.subject(accepted, reference);

export function OfferAnsweredEmail({
  firstName,
  accepted,
  property,
  price,
  message,
  offerUrl,
  siteUrl,
}: OfferAnsweredEmailProps) {
  return (
    <EmailLayout
      preview={t.text(accepted, price, property)}
      title={t.title(accepted)}
      siteUrl={siteUrl}
      action={{ href: offerUrl, label: t.action }}
      why={t.why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{t.text(accepted, price, property)}</Text>
      {message ? <EmailQuote label={t.message} text={message} /> : null}
      <Text style={emailText}>{accepted ? t.acceptedNext : t.declinedNext}</Text>
    </EmailLayout>
  );
}
