import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailText } from "./components/email-layout";

// A plan paid (SPEC-V2 sections 10 and 18, plan.activated, L1-26): the plan,
// the property, what was paid, when the advisor gets in touch (at once, or
// from the 15th day without an immediate start). The full summary of the
// order, with the CGV and the withdrawal form, comes with L1-40. Sent by
// leenkey/billing/emails.ts once the webhook recorded the payment.

const t = fr.emails.planActivated;

export type PlanActivatedEmailProps = {
  firstName: string | null;
  planName: string;
  /** « LK-0001 », or the town of a property without a listing yet. */
  property: string;
  /** « 990 € » */
  amount: string;
  /** « 18 novembre », null with an immediate start. */
  contactFrom: string | null;
  planUrl: string;
  siteUrl: string;
};

export const planActivatedSubject = (planName: string) => t.subject(planName);

export function PlanActivatedEmail({
  firstName,
  planName,
  property,
  amount,
  contactFrom,
  planUrl,
  siteUrl,
}: PlanActivatedEmailProps) {
  return (
    <EmailLayout
      preview={t.text(planName, property)}
      title={t.title(planName)}
      siteUrl={siteUrl}
      action={{ href: planUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>{t.text(planName, property)}</Text>
      <Text style={emailText}>{t.paid(amount)}</Text>
      <Text style={emailText}>{contactFrom ? t.contactLater(contactFrom) : t.contactNow}</Text>
      <Text style={emailText}>{t.receipt}</Text>
    </EmailLayout>
  );
}
