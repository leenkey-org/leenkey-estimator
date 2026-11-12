import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { PlanActivatedEmail, planActivatedSubject } from "@/emails/plan-activated";
import { PlanPurchasedEmail, planPurchasedSubject } from "@/emails/plan-purchased";
import { WithdrawalReceivedEmail, withdrawalReceivedSubject } from "@/emails/withdrawal-received";
import type { SupabaseClient } from "@supabase/supabase-js";
import { teamAddresses } from "@/leenkey/notifications/send-emails";
import type { Database } from "@/types/database";
import { formatAmount, formatDate } from "@/lib/format";
import { SALES_TERMS } from "@/lib/config/sales";
import { frLegal } from "@/lib/i18n/sections/legal";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { firstContactFrom } from "./orders";
import { legalDate, legalDateTime, withdrawalLastDay } from "./withdrawal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { legal: frLegal } as const;

// The emails of a plan paid (SPEC-V2 sections 10 and 18, L1-26), sent by the
// webhook once the payment is recorded: plan.activated to the seller,
// case.created to the team, with what it has to check (a payment held, the
// plan not activated, goes to the team only). An email that fails is logged;
// the payment stays recorded (Stripe does not send the event again for it:
// durable emails come with the queue of L1-40).

export type PaidOrder = {
  sellerEmail: string | null;
  sellerFirstName: string | null;
  sellerName: string;
  planName: string;
  upgrade: boolean;
  /** « LK-0001 », or the town of a property without a listing yet. */
  property: string;
  propertyId: string;
  amountCents: number;
  earlyStart: boolean;
  activatedAt: Date;
  /** The end of the plan (12 months), null when not known. */
  endsAt: Date | null;
  /** What the plan includes, as it was sold (plan_snapshot). */
  features: string[];
  /** The versions accepted at the order (« 2026-10-17 »). */
  cguVersion: string;
  cgvVersion: string;
  /** Paid, the plan not activated: the team checks the order first. */
  held: boolean;
  /** What the team has to check, from stripe_checkout_complete. */
  check: string[];
};

async function rendered(element: React.ReactElement) {
  return Promise.all([render(element), render(element, EMAIL_PLAIN_TEXT)]);
}

export async function emailPlanActivated(order: PaidOrder): Promise<EmailDelivery> {
  if (!order.sellerEmail) return "failed";
  try {
    const contact = firstContactFrom(order.activatedAt, order.earlyStart);
    const endsAt =
      order.endsAt ??
      new Date(new Date(order.activatedAt).setFullYear(order.activatedAt.getFullYear() + 1));
    const [html, text] = await rendered(
      PlanActivatedEmail({
        firstName: order.sellerFirstName,
        planName: order.planName,
        upgrade: order.upgrade,
        property: order.property,
        amount: formatAmount(order.amountCents),
        orderedOn: legalDate(order.activatedAt),
        endsOn: legalDate(endsAt),
        contactFrom: contact ? formatDate(contact, order.activatedAt) : null,
        earlyStart: order.earlyStart,
        features: order.features,
        cguVersion: legalDate(`${order.cguVersion}T12:00:00Z`),
        cgvVersion: legalDate(`${order.cgvVersion}T12:00:00Z`),
        withdrawalUntil: legalDate(withdrawalLastDay(order.activatedAt)),
        mediator: SALES_TERMS.mediator
          ? `${SALES_TERMS.mediator.name}, ${SALES_TERMS.mediator.url}`
          : null,
        planUrl: absoluteUrl(`/vendeur/formule?bien=${order.propertyId}`),
        siteUrl: siteUrl(),
      }),
    );
    return await sendEmail({
      to: order.sellerEmail,
      subject: planActivatedSubject(order.planName, order.property),
      html,
      text,
      replyTo: fr.legal.contactEmail,
    });
  } catch (error) {
    console.error("[billing] plan activated email failed", {
      entity_id: order.propertyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}

export async function emailPlanPurchased(
  order: PaidOrder,
  supabase: SupabaseClient<Database>,
): Promise<EmailDelivery> {
  // Every admin of the team (2026-11-08).
  const to = await teamAddresses(supabase);
  if (!to || to.length === 0) return "failed";
  try {
    const [html, text] = await rendered(
      PlanPurchasedEmail({
        planName: order.planName,
        upgrade: order.upgrade,
        property: order.property,
        seller: order.sellerName,
        amount: formatAmount(order.amountCents),
        earlyStart: order.earlyStart,
        held: order.held,
        check: order.check,
        casesUrl: absoluteUrl("/admin/dossiers"),
        siteUrl: siteUrl(),
      }),
    );
    return await sendEmail({
      to,
      subject: planPurchasedSubject(order.planName, order.property, order.upgrade, order.held),
      html,
      text,
    });
  } catch (error) {
    console.error("[billing] plan purchased email failed", {
      entity_id: order.propertyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}

export type WithdrawalRequest = {
  sellerEmail: string | null;
  sellerFirstName: string | null;
  planName: string;
  property: string;
  propertyId: string;
  amountCents: number;
  activatedAt: string;
  requestedAt: string;
  earlyStart: boolean;
  /** The plan a passage replaced, renounced with it. */
  replaced: { planName: string; activatedAt: string } | null;
};

/**
 * The acknowledgment of a withdrawal (L1-40), at once, to the seller who
 * renounced; the team hears of it through the notifications (plan.withdrawn).
 */
export async function emailWithdrawalReceived(request: WithdrawalRequest): Promise<EmailDelivery> {
  if (!request.sellerEmail) return "failed";
  try {
    const [html, text] = await rendered(
      WithdrawalReceivedEmail({
        firstName: request.sellerFirstName,
        planName: request.planName,
        property: request.property,
        requestedAt: legalDateTime(request.requestedAt),
        orderedOn: legalDate(request.activatedAt),
        amount: formatAmount(request.amountCents),
        earlyStart: request.earlyStart,
        replaced: request.replaced
          ? {
              planName: request.replaced.planName,
              orderedOn: legalDate(request.replaced.activatedAt),
            }
          : null,
        planUrl: absoluteUrl(`/vendeur/formule?bien=${request.propertyId}`),
        siteUrl: siteUrl(),
      }),
    );
    return await sendEmail({
      to: request.sellerEmail,
      subject: withdrawalReceivedSubject(request.planName),
      html,
      text,
      replyTo: fr.legal.contactEmail,
    });
  } catch (error) {
    console.error("[billing] withdrawal email failed", {
      entity_id: request.propertyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return "failed";
  }
}
