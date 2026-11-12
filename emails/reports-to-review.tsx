import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, EmailQuote, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// For the team (SPEC-V2 section 18, « signalement », L1-30c): one or several
// conversations reported since the last email, grouped by the cron of L1-22.
// The reason is written by a user: passed through emailSafeText before.

const t = fr.emails.reportsToReview;

export type ReportsToReviewEmailProps = {
  items: { reason: string | null; reference: string | null }[];
  url: string;
  siteUrl: string;
};

export const reportsToReviewSubject = (count: number, reference: string | null) =>
  t.subject(count, reference);

export function ReportsToReviewEmail({ items, url, siteUrl }: ReportsToReviewEmailProps) {
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
      {items.map((item, index) =>
        item.reason ? (
          <EmailQuote
            key={index}
            label={item.reference ? `${t.reason} · ${item.reference}` : t.reason}
            text={item.reason}
          />
        ) : null,
      )}
    </EmailLayout>
  );
}
