import { Heading, Link, Text } from "@react-email/components";
import { fr } from "@/lib/i18n/fr";
import { EmailLayout, emailLink, emailText } from "./components/email-layout";

// A plan paid (SPEC-V2 sections 10, 11 and 18, plan.activated): the summary
// of the order on a durable medium (L1-40, decision of 2026-10-15, model of
// docs/juridique): the plan, its price, the property, the date, the duration,
// when the services start, what the plan includes as it was sold, the CGU and
// CGV accepted, the withdrawal and its model form. Sent by
// leenkey/billing/emails.ts once the webhook recorded the payment.

const t = fr.emails.planActivated;

const heading = { margin: "8px 0 8px", fontSize: "17px", lineHeight: "1.4", color: "#0F1E35" };
const small = { ...emailText, fontSize: "14px" };

export type PlanActivatedEmailProps = {
  firstName: string | null;
  planName: string;
  /** A passage to a dearer plan: the difference was paid. */
  upgrade?: boolean;
  /** « LK-0001 », or the town of a property without a listing yet. */
  property: string;
  /** « 990 € » */
  amount: string;
  /** « 8 novembre 2026 » */
  orderedOn: string;
  /** « 8 novembre 2027 » */
  endsOn: string;
  /** « 18 novembre », null with an immediate start. */
  contactFrom: string | null;
  earlyStart: boolean;
  /** What the plan includes, as the plans table said when it was paid. */
  features: readonly string[];
  /** « 28 juin 2026 », the versions accepted. */
  cguVersion: string;
  cgvVersion: string;
  /** Last day of the withdrawal, « 23 novembre 2026 ». */
  withdrawalUntil: string;
  mediator: string | null;
  planUrl: string;
  siteUrl: string;
};

export const planActivatedSubject = (planName: string, property: string) =>
  t.subject(planName, property);

export function PlanActivatedEmail({
  firstName,
  planName,
  upgrade = false,
  property,
  amount,
  orderedOn,
  endsOn,
  contactFrom,
  earlyStart,
  features,
  cguVersion,
  cgvVersion,
  withdrawalUntil,
  mediator,
  planUrl,
  siteUrl,
}: PlanActivatedEmailProps) {
  const legal = fr.legal;
  return (
    <EmailLayout
      preview={(upgrade ? t.orderedUpgrade : t.ordered)(planName, amount, property, orderedOn)}
      title={t.title(planName)}
      siteUrl={siteUrl}
      action={{ href: planUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>
        {(upgrade ? t.orderedUpgrade : t.ordered)(planName, amount, property, orderedOn)}
      </Text>
      <Text style={emailText}>{t.duration(endsOn)}</Text>
      <Text style={emailText}>{contactFrom ? t.contactLater(contactFrom) : t.contactNow}</Text>

      {features.length > 0 ? (
        <>
          <Heading as="h2" style={heading}>
            {t.includes}
          </Heading>
          <Text style={emailText}>
            {features.map((feature, index) => (
              <span key={feature}>
                {index > 0 ? <br /> : null}• {feature}
              </span>
            ))}
          </Text>
        </>
      ) : null}

      <Text style={emailText}>
        {t.terms(cguVersion, cgvVersion)}{" "}
        <Link href={`${siteUrl}/cgv`} style={emailLink}>
          {t.cgv}
        </Link>
        ,{" "}
        <Link href={`${siteUrl}/cgu`} style={emailLink}>
          {t.cgu}
        </Link>
        .
      </Text>

      <Heading as="h2" style={heading}>
        {t.withdrawalTitle}
      </Heading>
      <Text style={emailText}>{t.withdrawal(withdrawalUntil, legal.contactEmail)}</Text>
      {earlyStart ? <Text style={emailText}>{t.withdrawalEarly}</Text> : null}
      <Text style={{ ...small, fontWeight: 600 }}>{t.formTitle}</Text>
      <Text style={small}>
        {t
          .form(`LEENKEY, ${legal.address} ; ${legal.contactEmail}`, planName, property, orderedOn)
          .map((line, index) => (
            <span key={line}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
      </Text>

      <Text style={small}>{mediator ? t.mediator(mediator) : t.mediatorPending}</Text>
      <Text style={small}>{t.receipt}</Text>
    </EmailLayout>
  );
}
