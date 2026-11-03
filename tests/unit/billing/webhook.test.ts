import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// L1-26: the Stripe client (its mock and the signature of a webhook) and what
// an event changes (leenkey/billing/webhook.ts): which events count, the
// arguments of the SQL functions, the emails only once recorded, 500 when
// the database failed so that Stripe sends the event again.

const mocks = vi.hoisted(() => ({
  rpc: [] as { fn: string; args: Record<string, unknown> }[],
  rpcResult: {
    data: { status: "processed", plan_name: "Accompagné", reference: "LK-0009" } as unknown,
    error: null as { code: string } | null,
  },
  emails: [] as string[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@/leenkey/billing/emails", () => ({
  emailPlanActivated: async () => {
    mocks.emails.push("seller");
    return "logged";
  },
  emailPlanPurchased: async () => {
    mocks.emails.push("team");
    return "logged";
  },
}));

const supabase = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    mocks.rpc.push({ fn, args });
    return mocks.rpcResult;
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { first_name: "Bruno", last_name: "Lefèvre" },
          error: null,
        }),
      }),
    }),
  }),
};

const metadata = {
  property_id: "5eed1000-0000-4000-8000-000000000009",
  owner_id: "5eed0000-0000-4000-8000-00000000000b",
  plan: "accompagne",
  kind: "new",
  early_start: "0",
  accepted_at: "2026-11-03T10:00:00.000Z",
  cgu_version: "2026-06-28",
  cgv_version: "2026-10-17",
};

function completed(overrides: Record<string, unknown> = {}, livemode = false) {
  return {
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    livemode,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        amount_total: 99000,
        total_details: { amount_discount: 0 },
        payment_intent: "pi_1",
        customer_email: "bruno@exemple.test",
        customer_details: { email: "bruno@exemple.test" },
        metadata,
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  mocks.rpc = [];
  mocks.emails = [];
  mocks.rpcResult = {
    data: { status: "processed", plan_name: "Accompagné", reference: "LK-0009" },
    error: null,
  };
  vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
});
afterEach(() => vi.unstubAllEnvs());

async function handle(event: Stripe.Event) {
  const { handleStripeEvent } = await import("@/leenkey/billing/webhook");
  // The fake client has the two methods the handler uses.
  return handleStripeEvent(event, supabase as never);
}

describe("handleStripeEvent", () => {
  it("records a paid session with its metadata, then emails the seller and the team", async () => {
    expect(await handle(completed())).toEqual({ status: 200, outcome: "processed" });
    expect(mocks.rpc).toEqual([
      {
        fn: "stripe_checkout_complete",
        args: {
          p_event_id: "evt_1",
          p_session_id: "cs_test_1",
          p_payment_intent_id: "pi_1",
          p_property_id: metadata.property_id,
          p_owner_id: metadata.owner_id,
          p_plan: "accompagne",
          p_upgrade: false,
          p_amount_paid_cents: 99000,
          p_discount_cents: 0,
          p_early_start: false,
          p_accepted_at: metadata.accepted_at,
          p_cgu_version: "2026-06-28",
          p_cgv_version: "2026-10-17",
        },
      },
    ]);
    expect(mocks.emails.sort()).toEqual(["seller", "team"]);
  });

  it("sends no email for an event already recorded", async () => {
    mocks.rpcResult = { data: { status: "duplicate" }, error: null };
    expect(await handle(completed())).toEqual({ status: 200, outcome: "duplicate" });
    expect(mocks.emails).toEqual([]);
  });

  it("asks Stripe to send the event again when the database failed", async () => {
    mocks.rpcResult = { data: null, error: { code: "08006" } };
    expect(await handle(completed())).toEqual({ status: 500, outcome: "failed" });
    expect(mocks.emails).toEqual([]);
  });

  it("ignores a session not paid, another product, an event of the other mode", async () => {
    expect((await handle(completed({ payment_status: "unpaid" }))).outcome).toBe("ignored");
    expect((await handle(completed({ metadata: { order: "other" } }))).outcome).toBe("ignored");
    expect((await handle(completed({}, true))).outcome).toBe("ignored");
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    expect((await handle(completed())).outcome).toBe("ignored");
    expect(mocks.rpc).toEqual([]);
  });

  it("records a refund, total or partial", async () => {
    const refund = (refunded: boolean, amount: number) =>
      ({
        id: "evt_r",
        object: "event",
        type: "charge.refunded",
        livemode: false,
        data: {
          object: {
            id: "ch_1",
            object: "charge",
            payment_intent: "pi_1",
            refunded,
            amount_refunded: amount,
          },
        },
      }) as unknown as Stripe.Event;
    expect((await handle(refund(true, 99000))).outcome).toBe("processed");
    expect(mocks.rpc[0]).toEqual({
      fn: "stripe_charge_refunded",
      args: {
        p_event_id: "evt_r",
        p_payment_intent_id: "pi_1",
        p_amount_refunded_cents: 99000,
        p_fully_refunded: true,
      },
    });
    mocks.rpcResult = { data: { status: "unknown" }, error: null };
    expect((await handle(refund(false, 100))).outcome).toBe("unknown");
  });

  it("ignores the other events", async () => {
    const other = {
      id: "evt_o",
      object: "event",
      type: "customer.created",
      livemode: false,
      data: { object: {} },
    } as unknown as Stripe.Event;
    expect(await handle(other)).toEqual({ status: 200, outcome: "ignored" });
  });
});

describe("the Stripe client", () => {
  const secret = "whsec_unit_test";

  it("checks the signature of a webhook", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { verifyWebhook } = await import("@/core/billing/stripe");
    const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "charge.refunded" });
    const signer = new Stripe("sk_test_x");
    const header = signer.webhooks.generateTestHeaderString({ payload, secret });
    expect(verifyWebhook(payload, header).id).toBe("evt_sig");
    const forged = signer.webhooks.generateTestHeaderString({ payload, secret: "whsec_other" });
    expect(() => verifyWebhook(payload, forged)).toThrow();
    expect(() => verifyWebhook(`${payload} `, header)).toThrow();
    expect(() => verifyWebhook(payload, null)).toThrow();
  });

  it("simulates Stripe in the tests only, never in production", async () => {
    vi.stubEnv("STRIPE_MOCK", "1");
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    const stripe = await import("@/core/billing/stripe");
    expect(stripe.stripeMocked()).toBe(true);
    expect(await stripe.retrievePrice("price_mock_99000")).toMatchObject({
      unitAmount: 99000,
      currency: "eur",
      recurring: false,
    });
    const session = await stripe.createCheckoutSession({
      priceId: "price_mock_51000",
      customerEmail: "bruno@exemple.test",
      metadata: { plan: "serenite" },
      clientReferenceId: "p",
      successUrl:
        "http://localhost:3200/vendeur/formule?paiement=ok&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "http://localhost:3200/vendeur/formule?paiement=annule",
      idempotencyKey: "0b8a-4f",
    });
    const url = new URL(session.url);
    expect(url.searchParams.get("session_id")).toBe(session.id);
    const carried = JSON.parse(
      Buffer.from(url.searchParams.get("mock_session") ?? "", "base64url").toString("utf8"),
    );
    expect(carried).toMatchObject({
      id: session.id,
      amountTotal: 51000,
      metadata: { plan: "serenite" },
    });

    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    expect(stripe.stripeMocked()).toBe(false);
  });

  it("refuses a live key outside production", async () => {
    vi.stubEnv("STRIPE_MOCK", "");
    vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_x");
    vi.resetModules();
    const stripe = await import("@/core/billing/stripe");
    await expect(stripe.retrievePrice("price_1")).rejects.toThrow(
      "A live Stripe key is only for production",
    );
  });
});
