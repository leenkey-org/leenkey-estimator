import { Link, Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, EmailQuote, emailLink, emailText } from "./components/email-layout";

// An account suspended by the back office (SPEC-V2 section 17, L1-30a): what
// the account may no longer do, the motive written by Leenkey, and where to
// contest. Rendered by leenkey/admin/users/emails.ts.

const t = fr.emails;

export type AccountSuspendedEmailProps = {
  firstName: string | null;
  reason: string;
  contactEmail: string;
  siteUrl: string;
};

export const accountSuspendedSubject = (): string => t.accountSuspended.subject;

export function AccountSuspendedEmail({
  firstName,
  reason,
  contactEmail,
  siteUrl,
}: AccountSuspendedEmailProps) {
  const copy = t.accountSuspended;
  return (
    <EmailLayout preview={copy.text} title={copy.title} siteUrl={siteUrl} why={t.footer.whyAccount}>
      <Text style={emailText}>{t.greeting(firstName)}</Text>
      <Text style={emailText}>{copy.text}</Text>
      <EmailQuote label={copy.reason} text={reason} />
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
