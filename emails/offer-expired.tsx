import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// An offer past its validity (L2-04b, SPEC-V2 13 and 18), to its buyer or to
// the seller of the listing. No legal conclusion.

const t = fr.emails.offerExpired;

export type OfferExpiredEmailProps = {
  firstName: string | null;
  /** The seller of the listing reads it; otherwise the buyer of the offer. */
  seller: boolean;
  property: string;
  /** « 338 000 € » */
  price: string;
  /** « 18/11/2026 à 14:00 » */
  expiredAt: string | null;
  offerUrl: string;
  siteUrl: string;
};

export const offerExpiredSubject = (reference: string) => t.subject(reference);

export function OfferExpiredEmail({
  firstName,
  seller,
  property,
  price,
  expiredAt,
  offerUrl,
  siteUrl,
}: OfferExpiredEmailProps) {
  const text = seller
    ? t.sellerText(price, property, expiredAt)
    : t.buyerText(price, property, expiredAt);
  return (
    <EmailLayout
      preview={text}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: offerUrl, label: seller ? t.sellerAction : t.buyerAction }}
      why={seller ? t.sellerWhy : t.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{seller ? t.sellerNext : t.buyerNext}</Text>
    </EmailLayout>
  );
}
