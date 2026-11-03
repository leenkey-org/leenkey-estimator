import { Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailText } from "./components/email-layout";

// For the team (SPEC-V2 section 18, case.created, L1-26): a plan was paid,
// its case waits in the back office, with what is to check; a payment held
// (the plan not activated) says so first. To ADMIN_NOTIFICATION_EMAIL.

const t = fr.emails.planPurchased;

export type PlanPurchasedEmailProps = {
  planName: string;
  upgrade: boolean;
  property: string;
  seller: string;
  amount: string;
  earlyStart: boolean;
  /** Paid, the plan not activated. */
  held?: boolean;
  /** What the team has to check (stripe_checkout_complete). */
  check?: readonly string[];
  casesUrl: string;
  siteUrl: string;
};

export const planPurchasedSubject = (
  planName: string,
  property: string,
  upgrade: boolean,
  held = false,
) => (held ? t.heldSubject(planName, property) : t.subject(planName, property, upgrade));

export function PlanPurchasedEmail({
  planName,
  upgrade,
  property,
  seller,
  amount,
  earlyStart,
  held = false,
  check = [],
  casesUrl,
  siteUrl,
}: PlanPurchasedEmailProps) {
  const text = held ? t.heldText(planName, property) : t.text(planName, property, upgrade);
  return (
    <EmailLayout
      preview={text}
      title={held ? t.heldTitle : t.title(upgrade)}
      siteUrl={siteUrl}
      internal
      action={{ href: casesUrl, label: t.action }}
    >
      <Text style={emailText}>{text}</Text>
      <Text style={emailText}>{t.details(seller, amount)}</Text>
      {check.length > 0 ? (
        <Text style={emailText}>
          <strong>{t.check}</strong>
          {check.map((item) => (
            <span key={item}>
              <br />· {item}
            </span>
          ))}
        </Text>
      ) : null}
      {held ? null : <Text style={emailText}>{earlyStart ? t.earlyStart : t.lateStart}</Text>}
    </EmailLayout>
  );
}
