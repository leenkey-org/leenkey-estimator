import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailText } from "./components/email-layout";

// For the team (SPEC-V2 section 18, case.created, L1-26): a plan was paid,
// its case waits in the back office. To ADMIN_NOTIFICATION_EMAIL.

const t = fr.emails.planPurchased;

export type PlanPurchasedEmailProps = {
  planName: string;
  upgrade: boolean;
  property: string;
  seller: string;
  amount: string;
  earlyStart: boolean;
  casesUrl: string;
  siteUrl: string;
};

export const planPurchasedSubject = (planName: string, property: string, upgrade: boolean) =>
  t.subject(planName, property, upgrade);

export function PlanPurchasedEmail({
  planName,
  upgrade,
  property,
  seller,
  amount,
  earlyStart,
  casesUrl,
  siteUrl,
}: PlanPurchasedEmailProps) {
  return (
    <EmailLayout
      preview={t.text(planName, property, upgrade)}
      title={t.title(upgrade)}
      siteUrl={siteUrl}
      internal
      action={{ href: casesUrl, label: t.action }}
    >
      <Text style={emailText}>{t.text(planName, property, upgrade)}</Text>
      <Text style={emailText}>{t.details(seller, amount)}</Text>
      <Text style={emailText}>{earlyStart ? t.earlyStart : t.lateStart}</Text>
    </EmailLayout>
  );
}
