import { Link, Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, EmailQuote, emailLink, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

// A warning of the back office after a report (SPEC-V2 section 17, « avertir »,
// L1-30c): the message of the team, what a new breach may bring, and where to
// contest. Nothing changes on the account. Rendered by
// leenkey/admin/reports/emails.ts.

const t = fr.emails;

export type UserWarnedEmailProps = {
  firstName: string | null;
  reason: string;
  contactEmail: string;
  siteUrl: string;
};

export const userWarnedSubject = (): string => t.userWarned.subject;

export function UserWarnedEmail({
  firstName,
  reason,
  contactEmail,
  siteUrl,
}: UserWarnedEmailProps) {
  const copy = t.userWarned;
  return (
    <EmailLayout preview={copy.text} title={copy.title} siteUrl={siteUrl} why={t.footer.whyAccount}>
      <Text style={emailText}>{t.greeting(firstName)}</Text>
      <Text style={emailText}>{copy.text}</Text>
      <EmailQuote label={copy.reason} text={reason} />
      <Text style={emailText}>{copy.next}</Text>
      <Text style={emailText}>
        {copy.contest.before}
        <Link href={`mailto:${contactEmail}`} style={emailLink}>
          {contactEmail}
        </Link>
        {copy.contest.after}
      </Text>
    </EmailLayout>
  );
}
