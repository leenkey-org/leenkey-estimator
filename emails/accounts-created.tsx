import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailText } from "./components/email-layout";

// For the team (2026-11-08, Younes): the accounts confirmed since the last
// email, grouped by the cron of L1-22. The first name is written by the
// person: passed through emailSafeText before.

const t = fr.emails.accountsCreated;

export type AccountsCreatedEmailProps = {
  items: { name: string; roles: string }[];
  url: string;
  siteUrl: string;
};

export const accountsCreatedSubject = (count: number) => t.subject(count);

export function AccountsCreatedEmail({ items, url, siteUrl }: AccountsCreatedEmailProps) {
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
        <Text key={index} style={emailText}>
          {item.roles ? `${item.name} · ${item.roles}` : item.name}
        </Text>
      ))}
    </EmailLayout>
  );
}
