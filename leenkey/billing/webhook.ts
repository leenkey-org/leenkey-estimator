import "server-only";
import type { StripeCharge, StripeCheckoutSession, StripeEvent } from "@/core/billing/stripe";
import { appEnv } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { checkoutMetadataSchema } from "@/lib/validations/billing";
import { emailPlanActivated, emailPlanPurchased, type PaidOrder } from "./emails";

// What a Stripe event changes for Leenkey (SPEC-V2 section 11), its signature
// already checked (app/api/webhooks/stripe/route.ts), which also gives the
// service role client (CLAUDE.md section 4: webhooks only, no user session). All the writes of
// an event are one SQL function (supabase/migrations, stripe_checkout), in
// one transaction and idempotent: a second delivery changes nothing.
//
// The answer tells Stripe whether to send the event again: 200 once recorded
// or when it is not ours, 500 when the database failed (Stripe tries again
// for three days).

export type WebhookOutcome = {
  status: 200 | 500;
  outcome: "processed" | "duplicate" | "ignored" | "unknown" | "failed";
};

const ok = (outcome: WebhookOutcome["outcome"]): WebhookOutcome => ({ status: 200, outcome });

function log(message: string, context: Record<string, unknown>) {
  console.info(`[billing] ${message}`, context);
}

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

type Client = SupabaseClient<Database>;

export async function handleStripeEvent(
  event: StripeEvent,
  supabase: Client,
): Promise<WebhookOutcome> {
  // Test events in local and preprod, live ones in production only.
  if (event.livemode !== (appEnv() === "production")) {
    log("event of the other mode ignored", { event_id: event.id, type: event.type });
    return ok("ignored");
  }
  if (event.type === "checkout.session.completed") {
    return checkoutCompleted(supabase, event.id, event.data.object);
  }
  if (event.type === "charge.refunded") {
    return chargeRefunded(supabase, event.id, event.data.object);
  }
  return ok("ignored");
}

async function checkoutCompleted(
  supabase: Client,
  eventId: string,
  session: StripeCheckoutSession,
): Promise<WebhookOutcome> {
  // « no_payment_required »: a promotion code of 100 %, an order all the same.
  if (
    session.mode !== "payment" ||
    (session.payment_status !== "paid" && session.payment_status !== "no_payment_required")
  ) {
    log("session not paid ignored", { event_id: eventId, session: session.id });
    return ok("ignored");
  }
  const metadata = checkoutMetadataSchema.safeParse(session.metadata ?? {});
  if (!metadata.success) {
    // Another product of the same Stripe account: not a plan of Leenkey.
    log("session without the metadata of a plan ignored", {
      event_id: eventId,
      session: session.id,
    });
    return ok("ignored");
  }
  const order = metadata.data;
  // Local and preprod share the test mode of one Stripe account: each its own orders.
  if (order.env !== appEnv()) {
    log("order of another environment ignored", { event_id: eventId, env: order.env });
    return ok("ignored");
  }
  const amount = session.amount_total ?? 0;
  const { data, error } = await supabase.rpc("stripe_checkout_complete", {
    p_event_id: eventId,
    p_session_id: session.id,
    // Always there for a session paid by card; an empty one is stored as null.
    p_payment_intent_id: idOf(session.payment_intent) ?? "",
    p_property_id: order.property_id,
    p_owner_id: order.owner_id,
    p_plan: order.plan,
    p_upgrade: order.kind === "upgrade",
    p_amount_paid_cents: amount,
    p_discount_cents: session.total_details?.amount_discount ?? 0,
    p_early_start: order.early_start === "1",
    p_accepted_at: order.accepted_at,
    p_cgu_version: order.cgu_version,
    p_cgv_version: order.cgv_version,
  });
  if (error) {
    console.error("[billing] payment not recorded", {
      event_id: eventId,
      entity_id: order.property_id,
      user_id: order.owner_id,
      code: error.code,
    });
    return { status: 500, outcome: "failed" };
  }
  const result = readResult(data);
  if (result.status === "duplicate") return ok("duplicate");
  if (result.status === "refunded") {
    // Refunded before it was recorded (the team refunded it): in the case, nothing to send.
    log("payment refunded before it was recorded", {
      event_id: eventId,
      entity_id: order.property_id,
    });
    return ok("processed");
  }
  // « held »: paid, the plan not activated (the order no longer matched the
  // plan in force); the team checks it and writes to the seller.
  const held = result.status === "held";

  const [seller, subscription] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", order.owner_id)
      .maybeSingle(),
    // The plan as it was sold, and its end, for the summary of the order (L1-40).
    result.subscriptionId
      ? supabase
          .from("subscriptions")
          .select("activated_at, ends_at, plan_snapshot")
          .eq("id", result.subscriptionId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const snapshot = subscription.data?.plan_snapshot;
  const features =
    snapshot &&
    typeof snapshot === "object" &&
    !Array.isArray(snapshot) &&
    Array.isArray(snapshot.features)
      ? snapshot.features.filter((item): item is string => typeof item === "string")
      : [];
  const sellerName =
    [seller.data?.first_name, seller.data?.last_name].filter(Boolean).join(" ") || "Le vendeur";
  const paid: PaidOrder = {
    sellerEmail: session.customer_details?.email ?? session.customer_email ?? null,
    sellerFirstName: seller.data?.first_name ?? null,
    sellerName,
    planName: result.planName ?? order.plan,
    upgrade: order.kind === "upgrade",
    property: result.reference ?? "",
    propertyId: order.property_id,
    amountCents: amount,
    earlyStart: order.early_start === "1",
    activatedAt: subscription.data?.activated_at
      ? new Date(subscription.data.activated_at)
      : new Date(),
    endsAt: subscription.data?.ends_at ? new Date(subscription.data.ends_at) : null,
    features,
    cguVersion: order.cgu_version,
    cgvVersion: order.cgv_version,
    held,
    check: result.check,
  };
  const [toSeller, toTeam] = await Promise.all([
    held ? Promise.resolve("none" as const) : emailPlanActivated(paid),
    emailPlanPurchased(paid, supabase),
  ]);
  log(held ? "payment recorded, plan held" : "payment recorded", {
    event_id: eventId,
    entity_id: order.property_id,
    plan: order.plan,
    kind: order.kind,
    checks: result.check.length,
    email_seller: toSeller,
    email_team: toTeam,
  });
  return ok("processed");
}

async function chargeRefunded(
  supabase: Client,
  eventId: string,
  charge: StripeCharge,
): Promise<WebhookOutcome> {
  const paymentIntent = idOf(charge.payment_intent);
  if (!paymentIntent) return ok("ignored");
  const { data, error } = await supabase.rpc("stripe_charge_refunded", {
    p_event_id: eventId,
    p_payment_intent_id: paymentIntent,
    p_amount_refunded_cents: charge.amount_refunded,
    p_fully_refunded: charge.refunded,
  });
  if (error) {
    console.error("[billing] refund not recorded", { event_id: eventId, code: error.code });
    return { status: 500, outcome: "failed" };
  }
  const result = readResult(data);
  log("refund", { event_id: eventId, status: result.status, full: charge.refunded });
  if (result.status === "processed") return ok("processed");
  return ok(result.status === "unknown" ? "unknown" : "duplicate");
}

/** The jsonb answer of the SQL functions. */
function readResult(data: unknown): {
  status: string;
  planName: string | null;
  reference: string | null;
  subscriptionId: string | null;
  /** What the team has to check (stripe_checkout_complete), in French. */
  check: string[];
} {
  const record = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  return {
    status: text(record.status) ?? "unknown",
    planName: text(record.plan_name),
    reference: text(record.reference),
    subscriptionId: text(record.subscription_id),
    check: Array.isArray(record.check)
      ? record.check.filter((item): item is string => typeof item === "string")
      : [],
  };
}
