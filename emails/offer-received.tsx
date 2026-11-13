import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// An offer received (L2-04a, SPEC-V2 13 and 18), to the seller of the
// listing: the amount, the gap to the asking price, the status of the
// financing in its exact words, a link. Never the PDF, never a contact
// detail of the buyer, never an advice to accept or decline.

const t = fr.emails.offerReceived;

export type OfferReceivedEmailProps = {
  firstName: string | null;
  buyerFirstName: string | null;
  property: string;
  /** « 338 000 € » */
  price: string;
  asking: string | null;
  /** « −12 000 € · −3,4 % », null when the two prices are equal. */
  gap: string | null;
  /** « Justificatif vérifié » */
  financing: string;
  /** « 18/11/2026 à 14:00 » */
  validUntil: string | null;
  offerUrl: string;
  siteUrl: string;
};

export const offerReceivedSubject = (reference: string, price: string) =>
  t.subject(reference, price);

export function OfferReceivedEmail({
  firstName,
  buyerFirstName,
  property,
  price,
  asking,
  gap,
  financing,
  validUntil,
  offerUrl,
  siteUrl,
}: OfferReceivedEmailProps) {
  return (
    <EmailLayout
      preview={t.text(buyerFirstName, property)}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: offerUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{t.text(buyerFirstName, property)}</Text>
      <Text style={emailText}>
        {asking ? (
          <>
            {t.asking} : {asking}
            <br />
          </>
        ) : null}
        {t.offer} : <strong>{price}</strong>
        {asking ? (
          <>
            <br />
            {t.gap} : {gap ?? t.noGap}
          </>
        ) : null}
        <br />
        {t.financing} : {financing}
      </Text>
      {validUntil ? <Text style={emailText}>{t.validity(validUntil)}</Text> : null}
      <Text style={emailText}>{t.read}</Text>
    </EmailLayout>
  );
}
