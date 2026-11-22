import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { EmailLayout, emailText } from "./components/email-layout";

// A short notice to an account about something the team did for it
// (DECISIONS.md 2026-11-21): its proof of financing checked, its report
// handled. A greeting, a few sentences, one link. Never a detail of what the
// team decided, never a contact detail.

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails } as const;

export type AccountNoticeEmailProps = {
  firstName: string | null;
  title: string;
  /** The sentences of the notice, the first one also its preview. */
  paragraphs: readonly string[];
  action: { href: string; label: string };
  why: string;
  siteUrl: string;
};

export function AccountNoticeEmail({
  firstName,
  title,
  paragraphs,
  action,
  why,
  siteUrl,
}: AccountNoticeEmailProps) {
  return (
    <EmailLayout
      preview={paragraphs[0] ?? title}
      title={title}
      siteUrl={siteUrl}
      action={action}
      why={why}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={emailText}>
          {paragraph}
        </Text>
      ))}
    </EmailLayout>
  );
}
