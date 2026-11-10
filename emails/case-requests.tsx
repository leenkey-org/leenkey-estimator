import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, EmailQuote, emailText } from "./components/email-layout";

// For the team (SPEC-V2 section 18, « dossier créé », L1-31): one or several
// requests written to the team since the last email (create_case, from the
// assistant), grouped by the cron of L1-22. The subject of a request is
// written by a user or the assistant: passed through emailSafeText before.

const t = fr.emails.caseRequests;

export type CaseRequestsEmailProps = {
  items: { name: string; reference: string | null; subject: string | null }[];
  url: string;
  siteUrl: string;
};

export const caseRequestsSubject = (count: number, reference: string | null) =>
  t.subject(count, reference);

export function CaseRequestsEmail({ items, url, siteUrl }: CaseRequestsEmailProps) {
  const count = items.length;
  return (
    <EmailLayout
      preview={t.text(count)}
      title={t.title(count)}
      siteUrl={siteUrl}
      internal
      action={{ href: url, label: t.action(count) }}
    >
      <Text style={emailText}>{t.text(count)}</Text>
      {items.map((item, index) => (
        <EmailQuote
          key={index}
          label={t.from(item.name, item.reference)}
          text={item.subject ?? t.noSubject}
        />
      ))}
    </EmailLayout>
  );
}
