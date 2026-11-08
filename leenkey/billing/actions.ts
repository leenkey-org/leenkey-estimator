"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { allPlans } from "@/core/billing/plans";
import { createCheckoutSession, retrievePrice, stripeConfigured } from "@/core/billing/stripe";
import { getProfile, getUser } from "@/core/auth/session";
import { paidPlansOrderable, SALES_TERMS } from "@/lib/config/sales";
import { appEnv } from "@/lib/env";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import {
  checkoutSchema,
  sessionIdSchema,
  withdrawalResultSchema,
  withdrawSchema,
} from "@/lib/validations/billing";
import { emailWithdrawalReceived } from "./emails";
import type { Database } from "@/types/database";
import { checkoutMetadata, planChoice } from "./orders";
import { priceIdFor, priceMatches } from "./prices";
import { canWithdraw } from "./withdrawal";

type PlanCode = Database["public"]["Enums"]["plan_code"];

// Ordering a plan for a property (L1-26, SPEC-V2 section 11): the checks,
// then the Checkout Session of Stripe, where the browser goes. Nothing is
// activated here: the webhook does it once Stripe confirms the payment
// (leenkey/billing/webhook.ts). No revalidatePath: the page goes to Stripe,
// and comes back with its own request.

export type StartCheckoutError =
  | "session"
  | "suspended"
  | "invalid"
  | "terms_changed"
  | "not_found"
  | "sold"
  | "current"
  | "lower"
  | "closed"
  | "unavailable";

export type StartCheckoutResult =
  | { ok: true; data: { url: string } }
  | { ok: false; error: StartCheckoutError };

function refuse(
  error: StartCheckoutError,
  context: Record<string, unknown> = {},
): StartCheckoutResult {
  if (error === "unavailable") console.error("[billing] checkout not started", context);
  return { ok: false, error };
}

export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) return refuse("session");
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid");
  const { propertyId, plan, earlyStart, cguVersion, cgvVersion } = parsed.data;
  if (!paidPlansOrderable()) return refuse("closed");
  // What is recorded is what the seller read: texts published since the
  // page opened are shown again before payment.
  if (cguVersion !== LEGAL_VERSIONS.cgu || cgvVersion !== SALES_TERMS.cgvVersion) {
    return refuse("terms_changed");
  }
  const context = { user_id: profile.id, entity_id: propertyId, plan };
  if (!stripeConfigured()) return refuse("unavailable", { ...context, reason: "no key" });

  const supabase = await createClient();
  const [active, property, progress, plans] = await Promise.all([
    // A suspended account no longer writes (is_active_user(), L1-03): nor orders.
    supabase.rpc("is_active_user"),
    supabase
      .from("properties")
      .select("id, listing:listings(status)")
      .eq("id", propertyId)
      .eq("owner_id", profile.id)
      .is("deleted_at", null)
      .maybeSingle(),
    // The plan in force, as the rights read it (ended plans already back to Autonomie).
    supabase.rpc("property_current_plan", { p: propertyId }),
    // Every price: a plan withdrawn from sale still counts for who holds it.
    allPlans(),
  ]);
  if (active.error || property.error || progress.error || !plans) {
    return refuse("unavailable", { ...context, reason: "read" });
  }
  if (active.data !== true) return refuse("suspended");
  if (!property.data) return refuse("not_found");
  const listing = Array.isArray(property.data.listing)
    ? property.data.listing[0]
    : property.data.listing;
  if (listing?.status === "sold") return refuse("sold");

  const choice = planChoice(plans, progress.data ?? "autonomie", plan);
  if (choice.status === "current") return refuse("current");
  if (choice.status !== "order") return refuse("lower");
  const priceId = priceIdFor(plan, choice.kind);
  if (!priceId) return refuse("unavailable", { ...context, reason: "no price", kind: choice.kind });
  // The price Stripe holds must be the amount of the plans table (never from the code).
  try {
    const price = await retrievePrice(priceId);
    if (!priceMatches(price, choice.amountCents)) {
      return refuse("unavailable", {
        ...context,
        reason: "price mismatch",
        stripe_amount: price.unitAmount,
        expected: choice.amountCents,
      });
    }
  } catch (error) {
    return refuse("unavailable", { ...context, reason: "price", error: String(error) });
  }
  if (!user.email) return refuse("unavailable", { ...context, reason: "no email" });

  const back = `/vendeur/formule?bien=${propertyId}`;
  try {
    const session = await createCheckoutSession({
      priceId,
      customerEmail: user.email,
      metadata: checkoutMetadata({
        propertyId,
        ownerId: profile.id,
        plan,
        kind: choice.kind,
        earlyStart,
        acceptedAt: new Date(),
        cguVersion,
        cgvVersion,
        env: appEnv(),
      }),
      clientReferenceId: propertyId,
      successUrl: absoluteUrl(`${back}&paiement=ok&session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: absoluteUrl(`${back}&paiement=annule`),
      // One key per order: Stripe sends back the same session if this very
      // request is retried, never for a second click (another acceptance time).
      idempotencyKey: randomUUID(),
    });
    return { ok: true, data: { url: session.url } };
  } catch (error) {
    return refuse("unavailable", { ...context, reason: "session", error: String(error) });
  }
}

export type CheckoutStatus =
  | {
      ok: true;
      data:
        | { state: "pending" }
        | { state: "active"; plan: PlanCode; earlyStart: boolean; activatedAt: string }
        | { state: "held" };
    }
  | { ok: false; error: "invalid" | "unavailable" };

/**
 * Whether the payment of a session is recorded (the return from Stripe polls
 * it every 2 s, 30 s at most): its subscription, read with the seller's
 * session. A payment recorded without its plan (an order that no longer
 * matched the plan in force, or refunded meanwhile: stripe_checkout_complete)
 * is « held »: the team checks it and writes to the seller.
 */
export async function checkoutStatus(sessionId: unknown): Promise<CheckoutStatus> {
  const parsed = sessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, activated_at, ends_at, refunded_at, early_start_requested_at")
    .eq("stripe_checkout_session_id", parsed.data)
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (error) {
    console.error("[billing] checkout status failed", { user_id: profile.id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: true, data: { state: "pending" } };
  // A held order ends when it starts (ends_at = activated_at).
  const held =
    data.refunded_at !== null ||
    (data.ends_at !== null && Date.parse(data.ends_at) <= Date.parse(data.activated_at));
  if (held) return { ok: true, data: { state: "held" } };
  return {
    ok: true,
    data: {
      state: "active",
      plan: data.plan,
      earlyStart: data.early_start_requested_at !== null,
      activatedAt: data.activated_at,
    },
  };
}

// --- Withdrawal (L1-40, SPEC-V2 section 11) ----------------------------------

export type WithdrawError =
  | "session"
  | "invalid"
  | "not_found"
  | "over"
  | "not_in_force"
  | "unavailable";

export type WithdrawResult =
  | { ok: true; data: { requestedAt: string } }
  | { ok: false; error: WithdrawError };

/**
 * « Renoncer au contrat »: within the 14 days (the last day checked here, the
 * base refusing only far past it), recorded by subscription_withdraw with the
 * seller's session, then the acknowledgment by email at once; the team hears
 * of it through the notifications. A second request keeps the first and sends
 * nothing. A suspended account may still renounce: a right of the consumer.
 */
export async function withdrawPlan(input: unknown): Promise<WithdrawResult> {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) return { ok: false, error: "session" };
  const parsed = withdrawSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: subscription, error: readError } = await supabase
    .from("subscriptions")
    .select("id, activated_at, withdrawal_requested_at")
    .eq("id", parsed.data.subscriptionId)
    .maybeSingle();
  if (readError) {
    console.error("[billing] withdrawal read failed", {
      user_id: user.id,
      entity_id: parsed.data.subscriptionId,
      code: readError.code,
    });
    return { ok: false, error: "unavailable" };
  }
  if (!subscription) return { ok: false, error: "not_found" };
  if (!subscription.withdrawal_requested_at && !canWithdraw(subscription.activated_at)) {
    return { ok: false, error: "over" };
  }
  const { data, error } = await supabase.rpc("subscription_withdraw", {
    p_subscription_id: subscription.id,
  });
  if (error) {
    if (error.code === "22023") return { ok: false, error: "over" };
    if (error.code === "55000") return { ok: false, error: "not_in_force" };
    if (error.code === "42501") return { ok: false, error: "not_found" };
    console.error("[billing] withdrawal not recorded", {
      user_id: user.id,
      entity_id: subscription.id,
      code: error.code,
    });
    return { ok: false, error: "unavailable" };
  }
  const result = withdrawalResultSchema.safeParse(data);
  if (!result.success) {
    console.error("[billing] withdrawal answer unexpected", {
      user_id: user.id,
      entity_id: subscription.id,
    });
    return { ok: false, error: "unavailable" };
  }
  const recorded = result.data;
  if (recorded.status === "recorded") {
    const delivery = await emailWithdrawalReceived({
      sellerEmail: user.email ?? null,
      sellerFirstName: profile.firstName ?? null,
      planName: recorded.plan_name ?? "",
      property: recorded.reference ?? "",
      propertyId: recorded.property_id,
      amountCents: recorded.amount_paid_cents,
      activatedAt: recorded.activated_at,
      requestedAt: recorded.requested_at,
      earlyStart: recorded.early_start,
    });
    if (delivery === "failed") {
      // Recorded all the same: the team, told by the notification, writes to the seller.
      console.error("[billing] withdrawal acknowledgment not sent", {
        user_id: user.id,
        entity_id: subscription.id,
      });
    }
  }
  revalidatePath("/vendeur/formule");
  return { ok: true, data: { requestedAt: recorded.requested_at } };
}
