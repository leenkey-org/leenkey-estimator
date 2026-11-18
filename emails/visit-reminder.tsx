import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The reminder of a visit (L3-02, SPEC-V2 14 and 18), the day before, to its
// buyer and to the seller of the property, with the calendar file attached.
// The exact address is for the buyer only, as in the confirmation.

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

const t = fr.emails.visit;

export type VisitReminderEmailProps = {
  firstName: string | null;
  /** The seller of the property reads it; otherwise the buyer of the visit. */
  seller: boolean;
  buyerFirstName: string | null;
  property: string | null;
  /** « samedi 21 novembre à 10 h 30 » */
  date: string;
  /** « 12 rue des Lilas, 91600 Savigny-sur-Orge »: the buyer only. */
  address: string | null;
  visitUrl: string;
  siteUrl: string;
};

/** « Rappel : visite demain à 10 h 30 » */
export const visitReminderSubject = (hour: string) => t.reminder.subject(hour);

export function VisitReminderEmail({
  firstName,
  seller,
  buyerFirstName,
  property,
  date,
  address,
  visitUrl,
  siteUrl,
}: VisitReminderEmailProps) {
  const text = seller
    ? t.reminder.sellerText(buyerFirstName, t.property(property, true), date)
    : t.reminder.buyerText(t.property(property, false), date);
  return (
    <EmailLayout
      preview={text}
      title={t.reminder.title}
      siteUrl={siteUrl}
      action={{
        href: visitUrl,
        label: seller ? t.reminder.sellerAction : t.reminder.buyerAction,
      }}
      why={seller ? t.sellerWhy : t.buyerWhy}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      {!seller && address ? <Text style={emailText}>{t.address(address)}</Text> : null}
      <Text style={emailText}>{t.calendar}</Text>
    </EmailLayout>
  );
}
