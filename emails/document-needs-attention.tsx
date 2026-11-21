import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// Documents of a sale file to check (L3-05, SPEC-V2 15 and 18), to their
// seller: the assistant read them as illegible, incomplete or not what their
// type says. Each by the name its seller gave it, with what is wrong in fixed
// words; a link to the tab. Never a word on the validity of a document.

const t = fr.emails.documents.needsAttention;

export type DocumentNeedsAttentionEmailProps = {
  firstName: string | null;
  /** The title of the listing; null when it cannot go in an email. */
  property: string | null;
  /** The name of each document (null when it cannot go in an email) and what is wrong with it. */
  documents: { title: string | null; problem: string }[];
  documentsUrl: string;
  siteUrl: string;
};

export const documentNeedsAttentionSubject = (count: number) => t.subject(count);

export function DocumentNeedsAttentionEmail({
  firstName,
  property,
  documents,
  documentsUrl,
  siteUrl,
}: DocumentNeedsAttentionEmailProps) {
  const text = t.text(documents.length, property);
  return (
    <EmailLayout
      preview={text}
      title={t.title(documents.length)}
      siteUrl={siteUrl}
      action={{ href: documentsUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{text}</Text>
      {documents.map((document, index) => (
        <Text key={index} style={emailText}>
          {t.line(document.title ?? t.unnamed, document.problem)}
        </Text>
      ))}
      <Text style={emailText}>{t.help}</Text>
      <Text style={emailText}>{t.mention}</Text>
    </EmailLayout>
  );
}
