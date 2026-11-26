import { Heading, Link, Text } from "@react-email/components";
import { frEmails } from "@/lib/i18n/sections/emails";
import { frLegal } from "@/lib/i18n/sections/legal";
import { EmailLayout, emailLink, emailText } from "./components/email-layout";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { emails: frEmails, legal: frLegal } as const;

// The confirmation of a refund, to the seller (Cédric, 2026-11-26;
// DECISIONS.md): the amount refunded, the plan, what the seller keeps, and
// the credit note of the refund, attached, or a link to it when its PDF
// could not be fetched. Sent by leenkey/billing/refund-emails.ts once the
// credit note is recorded, once per credit note.

const t = fr.emails.planRefunded;

const heading = { margin: "8px 0 8px", fontSize: "17px", lineHeight: "1.4", color: "#0F172A" };
const small = { ...emailText, fontSize: "14px" };

export type PlanRefundedEmailProps = {
  firstName: string | null;
  planName: string;
  /** « LK-0001 », or the town of a property without a listing yet. */
  property: string;
  /** « 990 € », the amount of this refund. */
  amount: string;
  /** « 26 novembre 2026 » */
  refundedOn: string;
  /** « 20 novembre 2026 », when the refund follows a withdrawal. */
  withdrawnOn: string | null;
  creditNoteNumber: string;
  /** The credit note is attached to the email; otherwise `documentsUrl` leads to it. */
  creditNoteAttached: boolean;
  /** « Mes factures et paiements » of the seller. */
  documentsUrl: string;
  siteUrl: string;
};

export const planRefundedSubject = (planName: string, property: string) =>
  t.subject(planName, property);

export function PlanRefundedEmail({
  firstName,
  planName,
  property,
  amount,
  refundedOn,
  withdrawnOn,
  creditNoteNumber,
  creditNoteAttached,
  documentsUrl,
  siteUrl,
}: PlanRefundedEmailProps) {
  return (
    <EmailLayout
      preview={t.text(amount, planName, property, refundedOn)}
      title={t.title}
      siteUrl={siteUrl}
      action={{ href: documentsUrl, label: t.action }}
    >
      <Text style={emailText}>{fr.emails.greeting(firstName)}</Text>
      <Text style={emailText}>
        {t.text(amount, planName, property, refundedOn)} {fr.emails.planActivated.vat}
      </Text>
      {withdrawnOn ? <Text style={emailText}>{t.withdrawal(withdrawnOn)}</Text> : null}
      <Text style={emailText}>{t.bank}</Text>

      <Heading as="h2" style={heading}>
        {t.keepsTitle}
      </Heading>
      <Text style={emailText}>{t.keeps}</Text>

      {creditNoteAttached ? (
        <Text style={emailText}>{t.creditNoteAttached(creditNoteNumber)}</Text>
      ) : (
        <Text style={emailText}>
          {t.creditNoteLink(creditNoteNumber)}{" "}
          <Link href={documentsUrl} style={emailLink}>
            {t.creditNoteLinkLabel}
          </Link>
          .
        </Text>
      )}
      <Text style={small}>{t.contact(fr.legal.contactEmail)}</Text>
    </EmailLayout>
  );
}
