import { Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";
import { EmailLayout, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails, legal: frLegal } as const;

// The acknowledgment of a withdrawal (L1-40, SPEC-V2 section 11, code de la
// consommation L221-21): sent at once, by the action of « Renoncer au
// contrat », on a durable medium: the request, its date and time, the plan,
// the refund to come.

const t = fr.emails.withdrawalReceived;

export type WithdrawalReceivedEmailProps = {
  firstName: string | null;
  planName: string;
  property: string;
  /** « 10 novembre 2026 à 14:05 » */
  requestedAt: string;
  /** « 8 novembre 2026 » */
  orderedOn: string;
  /** « 990 € » */
  amount: string;
  earlyStart: boolean;
  /** The plan a passage replaced, renounced with it. */
  replaced: { planName: string; orderedOn: string } | null;
  planUrl: string;
  siteUrl: string;
};

export const withdrawalReceivedSubject = (planName: string) => t.subject(planName);

export function WithdrawalReceivedEmail({
  firstName,
  planName,
  property,
  requestedAt,
  orderedOn,
  amount,
  earlyStart,
  replaced,
  planUrl,
  siteUrl,
}: WithdrawalReceivedEmailProps) {
  return (
    <EmailLayout
      preview={t.text(requestedAt, planName, property, orderedOn)}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: planUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{t.text(requestedAt, planName, property, orderedOn)}</Text>
      {replaced ? (
        <Text style={emailText}>{t.replaced(replaced.planName, replaced.orderedOn)}</Text>
      ) : null}
      <Text style={emailText}>{t.refund(amount)}</Text>
      {earlyStart ? <Text style={emailText}>{t.early}</Text> : null}
      <Text style={emailText}>{t.contact(fr.legal.contactEmail)}</Text>
    </EmailLayout>
  );
}
