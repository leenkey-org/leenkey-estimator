import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// A request to read the documents of a sale file (L3-04, SPEC-V2 15 and 18),
// to the seller of the property: the first name of the buyer, the status of
// the financing in its exact words, a link to answer. Never an amount, never
// a contact detail of the buyer, never an advice to grant or decline.

const t = fr.emails.documents.requested;

export type DocumentAccessRequestedEmailProps = {
  firstName: string | null;
  buyerFirstName: string | null;
  /** The title of the listing; null when it cannot go in an email. */
  property: string | null;
  /** « Justificatif vérifié » */
  financing: string;
  requestUrl: string;
  siteUrl: string;
};

export const documentAccessRequestedSubject = (buyerFirstName: string | null) =>
  t.subject(buyerFirstName);

export function DocumentAccessRequestedEmail({
  firstName,
  buyerFirstName,
  property,
  financing,
  requestUrl,
  siteUrl,
}: DocumentAccessRequestedEmailProps) {
  const text = t.text(buyerFirstName, property);
  return (
    <EmailLayout
      preview={text}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: requestUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>
        {t.financing} : {financing}
      </Text>
      <Text style={emailText}>{t.choice}</Text>
    </EmailLayout>
  );
}
