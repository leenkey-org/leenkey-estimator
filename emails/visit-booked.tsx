import { Link, Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailLink, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// A visit booked (L3-02, SPEC-V2 14 and 18), to its buyer and to the seller
// of the property, with the calendar file attached. The exact address is for
// the buyer only; the seller reads the first name of the buyer, never a
// contact detail. The buyer also reads a link to the technical sheet of the
// property (DECISIONS.md 2026-11-24): a page of the site, behind the sign-in,
// never a file in the email.

const t = fr.emails.visit;

export type VisitBookedEmailProps = {
  firstName: string | null;
  /** The seller of the property reads it; otherwise the buyer of the visit. */
  seller: boolean;
  buyerFirstName: string | null;
  property: string | null;
  /** « samedi 21 novembre à 10 h 30 » */
  date: string;
  /** « 12 rue des Lilas, 91600 Savigny-sur-Orge »: the buyer only. */
  address: string | null;
  /** The technical sheet of the property, on the site: the buyer only. */
  sheetUrl?: string | null;
  visitUrl: string;
  siteUrl: string;
};

export const visitBookedSubject = (date: string) => t.booked.subject(date);

export function VisitBookedEmail({
  firstName,
  seller,
  buyerFirstName,
  property,
  date,
  address,
  sheetUrl,
  visitUrl,
  siteUrl,
}: VisitBookedEmailProps) {
  const text = seller
    ? t.booked.sellerText(buyerFirstName, t.property(property, true), date)
    : t.booked.buyerText(t.property(property, false), date);
  return (
    <EmailLayout
      preview={text}
      title={t.booked.title}
      siteUrl={siteUrl}
      action={{
        href: visitUrl,
        label: seller ? t.booked.sellerAction : t.booked.buyerAction,
      }}
      why={seller ? t.sellerWhy : t.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      {!seller && address ? <Text style={emailText}>{t.address(address)}</Text> : null}
      {!seller && sheetUrl ? (
        <Text style={emailText}>
          {t.booked.sheetText}{" "}
          <Link href={sheetUrl} style={emailLink}>
            {t.booked.sheetLink}
          </Link>
        </Text>
      ) : null}
      <Text style={emailText}>
        {seller ? t.booked.sellerNext : t.booked.buyerCancel} {t.calendar}
      </Text>
    </EmailLayout>
  );
}
