import "server-only";
import Stripe from "stripe";
import { appEnv } from "@/lib/env";

// The one Stripe client (CLAUDE.md section 2, SPEC-V2 section 11): a price,
// a Checkout Session, the signature of a webhook. Generic: the caller brings
// the price, the metadata and the addresses (leenkey/billing/). Test keys in
// local and preprod, live keys in production only (CLAUDE.md section 4).
//
// STRIPE_MOCK=1 (end-to-end tests, never with NEXT_PUBLIC_ENV=production):
// no call leaves. A price id `price_mock_<cents>` is a one-off price of that
// amount in euros; a session is fake and its address is the success address,
// with the session in `mock_session` (base64url JSON: id, metadata, amount),
// so that the test signs and posts the event Stripe would send, with
// STRIPE_WEBHOOK_SECRET of the local stack. Stripe advises against driving
// its hosted page in automated tests.

export type StripeEvent = Stripe.Event;
export type StripeCheckoutSession = Stripe.Checkout.Session;
export type StripeCharge = Stripe.Charge;

export type PriceInfo = {
  id: string;
  /** In cents, null for a price without a fixed amount. */
  unitAmount: number | null;
  currency: string;
  active: boolean;
  recurring: boolean;
};

export type CheckoutInput = {
  priceId: string;
  customerEmail: string;
  /** Read back by the webhook: strings only, 500 characters each at most (Stripe). */
  metadata: Record<string, string>;
  clientReferenceId: string;
  /** `{CHECKOUT_SESSION_ID}` is replaced by Stripe with the id of the session. */
  successUrl: string;
  cancelUrl: string;
  /** The same key twice gives the same session (a double click). */
  idempotencyKey: string;
};

export type CheckoutSession = { id: string; url: string };

/** The mocked session carried by the success address (STRIPE_MOCK=1). */
export type MockSession = {
  id: string;
  amountTotal: number;
  metadata: Record<string, string>;
  customerEmail: string;
};

const MOCK_PRICE = /^price_mock_(\d{1,7})$/;

export function stripeMocked(): boolean {
  return process.env.STRIPE_MOCK === "1" && appEnv() !== "production";
}

/** A payment can be started: a secret key, or the mock. */
export function stripeConfigured(): boolean {
  return stripeMocked() || Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;
let verifier: Stripe | null = null;

/** Created on first use: a build without the key still goes through (README of stripe-node). */
function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (appEnv() !== "production" && key.startsWith("sk_live_")) {
    // A live key outside production would take real money (CLAUDE.md section 4).
    throw new Error("A live Stripe key is only for production");
  }
  client ??= new Stripe(key, { maxNetworkRetries: 1, timeout: 20_000 });
  return client;
}

export async function retrievePrice(priceId: string): Promise<PriceInfo> {
  if (stripeMocked()) {
    const match = MOCK_PRICE.exec(priceId);
    if (!match) throw new Error(`Unknown mocked price ${priceId}`);
    return {
      id: priceId,
      unitAmount: Number(match[1]),
      currency: "eur",
      active: true,
      recurring: false,
    };
  }
  const price = await stripe().prices.retrieve(priceId);
  return {
    id: price.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    active: price.active,
    recurring: price.recurring !== null,
  };
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  if (stripeMocked()) {
    const match = MOCK_PRICE.exec(input.priceId);
    const id = `cs_mock_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
    const session: MockSession = {
      id,
      amountTotal: match ? Number(match[1]) : 0,
      metadata: input.metadata,
      customerEmail: input.customerEmail,
    };
    const url = new URL(input.successUrl.replace("{CHECKOUT_SESSION_ID}", id));
    url.searchParams.set(
      "mock_session",
      Buffer.from(JSON.stringify(session)).toString("base64url"),
    );
    return { id, url: url.toString() };
  }
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [{ price: input.priceId, quantity: 1 }],
      // « Paiement sécurisé par carte via Stripe » (SPEC 8.8): the card only.
      allowed_payment_method_types: ["card"],
      customer_email: input.customerEmail,
      client_reference_id: input.clientReferenceId,
      metadata: input.metadata,
      payment_intent_data: { metadata: input.metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: "fr",
      invoice_creation: { enabled: true },
      allow_promotion_codes: true,
    },
    { idempotencyKey: input.idempotencyKey },
  );
  if (!session.url) throw new Error("Stripe gave a session without an address");
  return { id: session.id, url: session.url };
}

/**
 * The event of a webhook, its signature checked on the raw body with
 * STRIPE_WEBHOOK_SECRET; throws when it does not match (forged, replayed
 * more than 5 minutes later, or another endpoint's).
 */
export function verifyWebhook(payload: string, signature: string | null): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!signature) throw new Error("No Stripe signature");
  // The verification needs no API key: a placeholder keeps the mock offline.
  verifier ??= process.env.STRIPE_SECRET_KEY ? stripe() : new Stripe("sk_test_signature_only");
  return verifier.webhooks.constructEvent(payload, signature, secret);
}
