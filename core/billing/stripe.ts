import "server-only";
import Stripe from "stripe";
import { appEnv } from "@/lib/env";

// The one Stripe client (CLAUDE.md section 2, SPEC-V2 section 11): a price,
// a Checkout Session, the signature of a webhook. Generic: the caller brings
// the price, the metadata and the addresses (leenkey/billing/). Test keys in
// local and preprod, live keys in production only (CLAUDE.md section 4).
//
// STRIPE_MOCK=1 (end-to-end tests on the local stack only, NEXT_PUBLIC_ENV=
// local): no call leaves. A price id `price_mock_<cents>` is a one-off price
// of that amount in euros; a session is fake and its address is the success
// address, with the session in `mock_session` (base64url JSON: id, metadata,
// amount; no email),
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
  /** A retry of the same request with this key gets the same session back (Stripe). */
  idempotencyKey: string;
  /** Printed at the bottom of the Stripe invoice (a legal notice), when no tax rate applies. */
  invoiceFooter?: string;
};

export type CheckoutSession = { id: string; url: string };

/** The mocked session carried by the success address (STRIPE_MOCK=1). */
export type MockSession = {
  id: string;
  amountTotal: number;
  metadata: Record<string, string>;
};

const MOCK_PRICE = /^price_mock_(\d{1,7})$/;

export function stripeMocked(): boolean {
  return process.env.STRIPE_MOCK === "1" && appEnv() === "local";
}

/** A session can be paid for an hour (Stripe: 30 minutes at least); then a new one is asked. */
export const SESSION_LIFETIME_SECONDS = 60 * 60;

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
  // A live key outside production would take real money, a test key in
  // production would take none (CLAUDE.md section 4); secret or restricted.
  const live = /^(sk|rk)_live_/.test(key);
  if (appEnv() !== "production" && live)
    throw new Error("A live Stripe key is only for production");
  if (appEnv() === "production" && !live) throw new Error("Production takes a live Stripe key");
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

/**
 * The line of an order. With STRIPE_TAX_RATE (the id of a Stripe tax rate,
 * « txr_… », created as inclusive), the price stays the one displayed and
 * the receipt and the invoice of Stripe show the VAT it holds. Without it,
 * no tax line: Leenkey is under the VAT exemption of small businesses
 * (Younes, 2026-11-25, DECISIONS.md), so STRIPE_TAX_RATE stays unset until
 * it is not.
 */
export function checkoutLineItem(
  priceId: string,
  taxRateId: string | undefined,
): { price: string; quantity: number; tax_rates?: string[] } {
  const rate = taxRateId?.trim();
  return rate
    ? { price: priceId, quantity: 1, tax_rates: [rate] }
    : { price: priceId, quantity: 1 };
}

/**
 * The invoice of an order: its footer (a legal notice, e.g. a VAT
 * exemption) only when no tax rate applies, never both on one invoice.
 */
export function invoiceCreation(
  footer: string | undefined,
  taxRateId: string | undefined,
): { enabled: true; invoice_data?: { footer: string } } {
  return footer && !taxRateId?.trim()
    ? { enabled: true, invoice_data: { footer } }
    : { enabled: true };
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutSession> {
  if (stripeMocked()) {
    const match = MOCK_PRICE.exec(input.priceId);
    const id = `cs_mock_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
    const session: MockSession = {
      id,
      amountTotal: match ? Number(match[1]) : 0,
      metadata: input.metadata,
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
      line_items: [checkoutLineItem(input.priceId, process.env.STRIPE_TAX_RATE)],
      // « Paiement sécurisé par carte via Stripe » (SPEC 8.8): the card only.
      allowed_payment_method_types: ["card"],
      customer_email: input.customerEmail,
      client_reference_id: input.clientReferenceId,
      metadata: input.metadata,
      payment_intent_data: { metadata: input.metadata },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      locale: "fr",
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      invoice_creation: invoiceCreation(input.invoiceFooter, process.env.STRIPE_TAX_RATE),
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

/** A refund of a payment, as Stripe lists it. */
export type RefundInfo = { id: string; amountCents: number };

/** A credit note of an invoice. */
export type CreditNoteInfo = {
  id: string;
  number: string;
  amountCents: number;
  /** The PDF Stripe draws, null in the mock. */
  pdfUrl: string | null;
  /** ISO date of its issue. */
  issuedAt: string;
  /** The refunds it is linked to. */
  refundIds: string[];
};

export type CreditNotesResult =
  | {
      status: "ok";
      /** The credit notes of the invoice not voided, those created now included. */
      creditNotes: CreditNoteInfo[];
      /** The credit notes of the invoice voided since (to forget). */
      voidIds: string[];
      created: number;
      pending: number;
    }
  /** The session has no invoice (ordered without invoice_creation, or nothing paid). */
  | { status: "no_invoice" };

/** A credit note to create: the refund it is linked to, and its amount. */
export type CreditNotePlan = { refundId: string; amountCents: number };

/**
 * The credit notes still to create for the refunds of a payment: one per
 * refund no credit note of the invoice links, and never more, in all, than
 * what was refunded: a credit note made by hand without a link to its refund
 * (« en dehors de Stripe ») already counts. `creditNotes`: those of the
 * invoice not voided.
 */
export function planCreditNotes(
  refunds: readonly RefundInfo[],
  creditNotes: readonly Pick<CreditNoteInfo, "refundIds" | "amountCents">[],
): CreditNotePlan[] {
  const linked = new Set(creditNotes.flatMap((note) => note.refundIds));
  const refunded = refunds.reduce((sum, refund) => sum + Math.max(refund.amountCents, 0), 0);
  let room = refunded - creditNotes.reduce((sum, note) => sum + note.amountCents, 0);
  const plans: CreditNotePlan[] = [];
  for (const refund of refunds) {
    if (room <= 0) break;
    if (refund.amountCents <= 0 || linked.has(refund.id)) continue;
    const amountCents = Math.min(refund.amountCents, room);
    plans.push({ refundId: refund.id, amountCents });
    room -= amountCents;
  }
  return plans;
}

/** The idempotency key of the credit note of a refund: one per refund, whoever asks. */
export function creditNoteKey(refundId: string): string {
  return `credit-note-${refundId}`;
}

function creditNoteInfo(note: Stripe.CreditNote): CreditNoteInfo {
  return {
    id: note.id,
    number: note.number,
    amountCents: note.total,
    pdfUrl: note.pdf || null,
    issuedAt: new Date(note.created * 1000).toISOString(),
    refundIds: note.refunds.map((item) =>
      typeof item.refund === "string" ? item.refund : item.refund.id,
    ),
  };
}

/** The mocked credit note of a payment (STRIPE_MOCK=1): one, of the amount refunded. */
function mockCreditNote(paymentIntentId: string, amountCents: number): CreditNoteInfo {
  const ref = paymentIntentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 60);
  return {
    id: `cn_mock_${ref}`,
    number: "MOCK-0001",
    amountCents,
    pdfUrl: null,
    issuedAt: new Date().toISOString(),
    refundIds: [`re_mock_${ref}`],
  };
}

/**
 * The credit notes of the refunds of a payment made by Checkout: those
 * missing are created on the invoice of the session, each linked to its
 * refund already made (`refunds`), so that Stripe never refunds a second
 * time (never `refund_amount` nor `out_of_band_amount`), and emailed to the
 * customer by Stripe (`email_type`). Idempotent: the refunds a credit note
 * of the invoice links are skipped, the total credited never exceeds the
 * total refunded (planCreditNotes), and each creation carries the key of
 * its refund: `memo` must stay the same from one call to the next (a
 * constant of the caller). Only the refunds that succeeded: a pending one
 * waits (`pending`), to ask again later. `mockRefundedCents`: what the mock
 * credits (STRIPE_MOCK=1), the amount refunded the caller was told.
 */
export async function ensureCreditNotes(input: {
  checkoutSessionId: string;
  paymentIntentId: string;
  memo?: string;
  mockRefundedCents?: number;
}): Promise<CreditNotesResult> {
  if (stripeMocked()) {
    const amount = input.mockRefundedCents ?? 0;
    return {
      status: "ok",
      creditNotes: amount > 0 ? [mockCreditNote(input.paymentIntentId, amount)] : [],
      voidIds: [],
      created: amount > 0 ? 1 : 0,
      pending: 0,
    };
  }
  const api = stripe();
  const session = await api.checkout.sessions.retrieve(input.checkoutSessionId);
  const invoice = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  if (!invoice) return { status: "no_invoice" };

  const existing: CreditNoteInfo[] = [];
  const voidIds: string[] = [];
  for await (const note of api.creditNotes.list({ invoice, limit: 100 })) {
    if (note.status === "void") voidIds.push(note.id);
    else existing.push(creditNoteInfo(note));
  }
  const refunds: RefundInfo[] = [];
  let pending = 0;
  for await (const refund of api.refunds.list({
    payment_intent: input.paymentIntentId,
    limit: 100,
  })) {
    if (refund.status === "succeeded") refunds.push({ id: refund.id, amountCents: refund.amount });
    else if (refund.status === "pending" || refund.status === "requires_action") pending += 1;
  }
  const created: CreditNoteInfo[] = [];
  for (const plan of planCreditNotes(refunds, existing)) {
    const note = await api.creditNotes.create(
      {
        invoice,
        amount: plan.amountCents,
        refunds: [{ refund: plan.refundId, amount_refunded: plan.amountCents }],
        reason: "order_change",
        email_type: "credit_note",
        ...(input.memo ? { memo: input.memo } : {}),
      },
      { idempotencyKey: creditNoteKey(plan.refundId) },
    );
    created.push(creditNoteInfo(note));
  }
  return {
    status: "ok",
    creditNotes: [...existing, ...created],
    voidIds,
    created: created.length,
    pending,
  };
}

/** The page of a payment in the Stripe dashboard (`/test` outside production). */
export function dashboardPaymentUrl(paymentIntentId: string, live: boolean): string {
  return `https://dashboard.stripe.com${live ? "" : "/test"}/payments/${encodeURIComponent(paymentIntentId)}`;
}
