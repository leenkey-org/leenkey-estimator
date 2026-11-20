import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// Documents of a sale file shared (L3-04, SPEC-V2 10 and 15), to the buyer
// the seller shares them with: how many, of which property, a link to read
// them. One email per property and per day. Never the name of a document,
// never a contact detail of the seller.

const t = fr.emails.documents.shared;

export type DocumentsSharedEmailProps = {
  firstName: string | null;
  /** The documents shared since the last email of this property. */
  count: number;
  /** The title of the listing; null when it cannot go in an email. */
  property: string | null;
  /** The town, when the title does not carry it already. */
  city: string | null;
  documentsUrl: string;
  siteUrl: string;
};

export const documentsSharedSubject = (count: number, city: string | null) =>
  t.subject(count, city);

export function DocumentsSharedEmail({
  firstName,
  count,
  property,
  city,
  documentsUrl,
  siteUrl,
}: DocumentsSharedEmailProps) {
  const text = t.text(count, property, city);
  return (
    <EmailLayout
      preview={text}
      title={t.title(count)}
      siteUrl={siteUrl}
      action={{ href: documentsUrl, label: t.action }}
      why={t.why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{t.disclaimer}</Text>
    </EmailLayout>
  );
}
