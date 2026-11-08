import "server-only";
import { render } from "@react-email/components";
import { sendEmail, type EmailDelivery } from "@/core/notifications/email";
import { EMAIL_PLAIN_TEXT } from "@/emails/components/email-layout";
import { PlanActivatedEmail, planActivatedSubject } from "@/emails/plan-activated";
import { PlanPurchasedEmail, planPurchasedSubject } from "@/emails/plan-purchased";
import type { SupabaseClient } from "@supabase/supabase-js";
import { teamAddresses } from "@/leenkey/notifications/send-emails";
import type { Database } from "@/types/database";
import { formatAmount, formatDate } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl, siteUrl } from "@/lib/site";
import { firstContactFrom } from "./orders";

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
    const [html, text] = await rendered(
      PlanActivatedEmail({
        firstName: order.sellerFirstName,
        planName: order.planName,
        property: order.property,
        amount: formatAmount(order.amountCents),
        contactFrom: contact ? formatDate(contact, order.activatedAt) : null,
        planUrl: absoluteUrl(`/vendeur/formule?bien=${order.propertyId}`),
        siteUrl: siteUrl(),
      }),
    );
    return await sendEmail({
      to: order.sellerEmail,
      subject: planActivatedSubject(order.planName),
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
