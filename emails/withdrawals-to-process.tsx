import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// Withdrawals to refund (L1-40, SPEC-V2 section 11), to the team: every admin
// (2026-11-08), through the cron of the notifications (plan.withdrawn),
// grouped when several come within 20 minutes.

const t = fr.emails.withdrawalsToProcess;

export type WithdrawalToProcess = {
  planName: string;
  property: string;
  /** « 990 € » */
  amount: string;
  /** « 10 novembre 2026 à 14:05 » */
  requestedAt: string;
  earlyStart: boolean;
};

export type WithdrawalsToProcessEmailProps = {
  items: readonly WithdrawalToProcess[];
  casesUrl: string;
  siteUrl: string;
};

export function withdrawalsToProcessSubject(items: readonly WithdrawalToProcess[]): string {
  const [first] = items;
  return t.subject(items.length, first?.planName ?? "", first?.property ?? "");
}

export function WithdrawalsToProcessEmail({
  items,
  casesUrl,
  siteUrl,
}: WithdrawalsToProcessEmailProps) {
  return (
    <EmailLayout
      internal
      preview={t.text}
      title={t.title(items.length)}
      siteUrl={siteUrl}
      action={{ href: casesUrl, label: t.action }}
    >
      <Text style={emailText}>{t.text}</Text>
      {items.map((item) => (
        <Text key={`${item.property}-${item.requestedAt}`} style={emailText}>
          {t.item(item.planName, item.property, item.amount, item.requestedAt)}
          {item.earlyStart ? ` (${t.early})` : ""}
        </Text>
      ))}
    </EmailLayout>
  );
}
