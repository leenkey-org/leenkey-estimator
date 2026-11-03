import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// L1-26: who may start a payment, and what goes to Stripe
// (leenkey/billing/actions.ts, startCheckout): a seller signed in and active,
// their property not sold, a plan above the one in force, the CGU and CGV
// accepted, the price Stripe holds equal to the amount of the plans table.

const mocks = vi.hoisted(() => ({
  user: { id: "u1", email: "bruno@exemple.test" } as { id: string; email?: string } | null,
  profile: { id: "u1", firstName: "Bruno", roles: ["seller"] } as { id: string } | null,
  active: true,
  property: { id: "p1", listing: { status: "published" } } as Record<string, unknown> | null,
  plan: "autonomie",
  stripeAmount: 99000 as number | null,
  sessions: [] as Record<string, unknown>[],
  configured: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/core/auth/session", () => ({
  getUser: async () => mocks.user,
  getProfile: async () => mocks.profile,
}));
vi.mock("@/core/billing/plans", () => ({
  activePlans: async () => [
    { code: "autonomie", name: "Autonomie", priceCents: 0, intro: null, outro: null, features: [] },
    {
      code: "accompagne",
      name: "Accompagné",
      priceCents: 99000,
      intro: null,
      outro: null,
      features: [],
    },
    {
      code: "serenite",
      name: "Sérénité",
      priceCents: 150000,
      intro: null,
      outro: null,
      features: [],
    },
  ],
}));
vi.mock("@/core/billing/stripe", () => ({
  stripeConfigured: () => mocks.configured,
  retrievePrice: async (id: string) => ({
    id,
    unitAmount: mocks.stripeAmount,
    currency: "eur",
    active: true,
    recurring: false,
  }),
  createCheckoutSession: async (input: Record<string, unknown>) => {
    mocks.sessions.push(input);
    return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" };
  },
}));

function chain(result: unknown) {
  const self: Record<string, unknown> = {};
  for (const name of ["select", "eq", "is"]) self[name] = () => self;
  self.maybeSingle = async () => ({ data: result, error: null });
  return self;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async () => ({ data: mocks.active, error: null }),
    from: (table: string) =>
      table === "properties" ? chain(mocks.property) : chain({ plan: mocks.plan }),
  }),
}));

const input = {
  propertyId: "5eed1000-0000-4000-8000-000000000009",
  plan: "accompagne",
  acceptedTerms: true,
  earlyStart: false,
};

beforeEach(() => {
  mocks.user = { id: "u1", email: "bruno@exemple.test" };
  mocks.profile = { id: "u1" };
  mocks.active = true;
  mocks.property = { id: "p1", listing: { status: "published" } };
  mocks.plan = "autonomie";
  mocks.stripeAmount = 99000;
  mocks.sessions = [];
  mocks.configured = true;
  vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://leenkey-v2.vercel.app");
  vi.stubEnv("STRIPE_PRICE_ACCOMPAGNE", "price_a");
  vi.stubEnv("STRIPE_PRICE_SERENITE", "price_s");
  vi.stubEnv("STRIPE_PRICE_UPGRADE", "price_u");
});
afterEach(() => vi.unstubAllEnvs());

async function start(value: unknown = input) {
  const { startCheckout } = await import("@/leenkey/billing/actions");
  return startCheckout(value);
}

describe("startCheckout", () => {
  it("creates the session of the plan, with what the webhook needs", async () => {
    expect(await start()).toEqual({
      ok: true,
      data: { url: "https://checkout.stripe.com/c/pay/cs_test_1" },
    });
    expect(mocks.sessions).toHaveLength(1);
    const session = mocks.sessions[0];
    expect(session).toMatchObject({
      priceId: "price_a",
      customerEmail: "bruno@exemple.test",
      clientReferenceId: input.propertyId,
      successUrl: `https://leenkey-v2.vercel.app/vendeur/formule?bien=${input.propertyId}&paiement=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `https://leenkey-v2.vercel.app/vendeur/formule?bien=${input.propertyId}&paiement=annule`,
      metadata: {
        property_id: input.propertyId,
        owner_id: "u1",
        plan: "accompagne",
        kind: "new",
        early_start: "0",
        cgv_version: "2026-10-17",
      },
    });
  });

  it("passes Accompagné to Sérénité for the difference, with its own price", async () => {
    mocks.plan = "accompagne";
    mocks.stripeAmount = 51000;
    expect((await start({ ...input, plan: "serenite", earlyStart: true })).ok).toBe(true);
    expect(mocks.sessions[0]).toMatchObject({
      priceId: "price_u",
      metadata: { kind: "upgrade", plan: "serenite", early_start: "1" },
    });
  });

  it("never starts a payment without the CGU and CGV accepted", async () => {
    expect(await start({ ...input, acceptedTerms: false })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(mocks.sessions).toEqual([]);
  });

  it("refuses a visitor, a suspended account, a property of another or sold", async () => {
    mocks.user = null;
    expect(await start()).toEqual({ ok: false, error: "session" });
    mocks.user = { id: "u1", email: "bruno@exemple.test" };
    mocks.active = false;
    expect(await start()).toEqual({ ok: false, error: "session" });
    mocks.active = true;
    mocks.property = null;
    expect(await start()).toEqual({ ok: false, error: "not_found" });
    mocks.property = { id: "p1", listing: { status: "sold" } };
    expect(await start()).toEqual({ ok: false, error: "sold" });
    expect(mocks.sessions).toEqual([]);
  });

  it("refuses the plan in force and a lower one", async () => {
    mocks.plan = "accompagne";
    expect(await start()).toEqual({ ok: false, error: "current" });
    mocks.plan = "serenite";
    expect(await start()).toEqual({ ok: false, error: "lower" });
  });

  it("orders nothing when Stripe holds another amount, or without a price", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.stripeAmount = 89000;
    expect(await start()).toEqual({ ok: false, error: "unavailable" });
    mocks.stripeAmount = 99000;
    vi.stubEnv("STRIPE_PRICE_ACCOMPAGNE", "");
    expect(await start()).toEqual({ ok: false, error: "unavailable" });
    mocks.configured = false;
    expect(await start()).toEqual({ ok: false, error: "unavailable" });
    expect(mocks.sessions).toEqual([]);
    error.mockRestore();
  });

  it("stays closed in production until the final CGV and the mediator", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENV", "production");
    expect(await start()).toEqual({ ok: false, error: "closed" });
    expect(mocks.sessions).toEqual([]);
  });
});
