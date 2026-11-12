import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails, legal: frLegal } as const;

// A plan ending within 30 days (L1-40, SPEC-V2 sections 11 and 11 bis), to
// its owner, once (subscriptions_daily, then the cron of the notifications).
// The renewal is asked by email until it can be paid online (BACKLOG-V3).

const t = fr.emails.planEnding;

export type PlanEndingEmailProps = {
  firstName: string | null;
  planName: string;
  property: string;
  /** « 8 novembre 2027 » */
  endsOn: string;
  planUrl: string;
  siteUrl: string;
};

export const planEndingSubject = (planName: string, endsOn: string) => t.subject(planName, endsOn);

export function PlanEndingEmail({
  firstName,
  planName,
  property,
  endsOn,
  planUrl,
  siteUrl,
}: PlanEndingEmailProps) {
  return (
    <EmailLayout
      preview={t.text(planName, property, endsOn)}
      title={t.title(planName)}
      siteUrl={siteUrl}
      action={{ href: planUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{t.text(planName, property, endsOn)}</Text>
      <Text style={emailText}>{t.after}</Text>
      <Text style={emailText}>{t.renew(fr.legal.contactEmail)}</Text>
    </EmailLayout>
  );
}
