import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database";

type PlanCode = Database["public"]["Enums"]["plan_code"];
type PlanFeature = Database["public"]["Enums"]["plan_feature"];

/** The rights of the plans, as planFeatures() reads them. */
const rights = (plans: Partial<Record<PlanCode, PlanFeature[]>>) =>
  new Map<PlanCode, Set<PlanFeature>>(
    (Object.keys(plans) as PlanCode[]).map((plan) => [plan, new Set(plans[plan])]),
  );

// L1-40: the withdrawal of a plan (leenkey/billing/withdrawal.ts and
// withdrawPlan in leenkey/billing/actions.ts): its last day at the end of a
// day of Paris, the errors of the base told plainly, the acknowledgment sent
// once, and said when it did not leave. DECISIONS.md 2026-11-26: what may be
// renounced after a passage (the passage alone, or everything), and what
// stops with it, named from the rights of the plans.

const mocks = vi.hoisted(() => ({
  user: { id: "u1", email: "bruno@exemple.test" } as { id: string; email?: string } | null,
  profile: { id: "u1", firstName: "Bruno", roles: ["seller"] } as Record<string, unknown> | null,
  reads: [] as unknown[],
  rpc: { data: null as unknown, error: null as { code: string } | null },
  rpcArgs: [] as Record<string, unknown>[],
  emails: [] as Record<string, unknown>[],
  delivery: "sent" as "sent" | "failed",
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/core/auth/session", () => ({
  getUser: async () => mocks.user,
  getProfile: async () => mocks.profile,
}));
vi.mock("@/core/billing/plans", () => ({
  allPlans: async () => [],
  planFeatures: async () =>
    new Map([
      ["accompagne", new Set(["advisor", "human_price_strategy"])],
      ["serenite", new Set(["advisor", "human_price_strategy", "notary_coordination"])],
    ]),
}));
vi.mock("@/leenkey/billing/emails", () => ({
  emailWithdrawalReceived: async (request: Record<string, unknown>) => {
    mocks.emails.push(request);
    return mocks.delivery;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => {
      const self: Record<string, unknown> = {};
      for (const name of ["select", "eq", "is", "gt"]) self[name] = () => self;
      self.maybeSingle = async () => ({ data: mocks.reads.shift() ?? null, error: null });
      return self;
    },
    rpc: async (_fn: string, args: Record<string, unknown>) => {
      mocks.rpcArgs.push(args);
      return mocks.rpc;
    },
  }),
}));

const SUBSCRIPTION = "0b7d4c1e-5f3a-4b8e-9c2d-1a6e8f4b3c27";
const PROPERTY = "5eed1000-0000-4000-8000-000000000009";
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** The subscription the action reads: a plan paid `days` ago. */
const order = (days: number, overrides: Record<string, unknown> = {}) => ({
  id: SUBSCRIPTION,
  plan: "accompagne",
  activated_at: daysAgo(days),
  amount_paid_cents: 99000,
  withdrawal_requested_at: null,
  ...overrides,
});

const recorded = (overrides: Record<string, unknown> = {}) => ({
  status: "recorded",
  requested_at: new Date().toISOString(),
  plan_name: "Accompagné",
  reference: "LK-0009",
  activated_at: daysAgo(3),
  amount_paid_cents: 99000,
  early_start: false,
  property_id: PROPERTY,
  ...overrides,
});

beforeEach(() => {
  mocks.user = { id: "u1", email: "bruno@exemple.test" };
  mocks.profile = { id: "u1", firstName: "Bruno", roles: ["seller"] };
  mocks.reads = [];
  mocks.rpc = { data: null, error: null };
  mocks.rpcArgs = [];
  mocks.emails = [];
  mocks.delivery = "sent";
});

describe("the period of withdrawal", () => {
  it("ends at the end of its last day in Paris", async () => {
    const { canWithdraw, withdrawalLastDay } = await import("@/leenkey/billing/withdrawal");
    // Ordered on Monday 2 November 2026: the 14 days end on Monday 16.
    const ordered = new Date("2026-11-02T10:00:00Z");
    expect(withdrawalLastDay(ordered).toISOString().slice(0, 10)).toBe("2026-11-16");
    expect(canWithdraw(ordered, new Date("2026-11-16T22:59:00Z"))).toBe(true);
    expect(canWithdraw(ordered, new Date("2026-11-16T23:01:00Z"))).toBe(false);
  });

  it("goes to the next working day after a public holiday", async () => {
    const { withdrawalLastDay } = await import("@/leenkey/billing/withdrawal");
    // 28 October + 14 days: Wednesday 11 November, a public holiday.
    expect(withdrawalLastDay("2026-10-28T09:00:00Z").toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("writes legal dates in full", async () => {
    const { legalDate, legalDateTime } = await import("@/leenkey/billing/withdrawal");
    expect(legalDate("2026-11-02T10:00:00Z")).toBe("2 novembre 2026");
    expect(legalDateTime("2026-11-02T13:05:00Z")).toBe("2 novembre 2026 à 14:05");
  });
});

describe("withdrawPlan", () => {
  it("records the request and sends the acknowledgment once", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [order(3), null];
    mocks.rpc = { data: recorded(), error: null };
    const result = await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" });
    expect(result).toMatchObject({ ok: true, data: { acknowledged: true } });
    expect(mocks.rpcArgs[0]).toEqual({ p_subscription_id: SUBSCRIPTION, p_scope: "full" });
    expect(mocks.emails).toHaveLength(1);
    expect(mocks.emails[0]).toMatchObject({
      sellerEmail: "bruno@exemple.test",
      planName: "Accompagné",
      amountCents: 99000,
      replaced: null,
      keptPlanName: null,
      // Everything paid stops: the rights of the plan, in the words of the comparison table.
      stops: ["Conseiller dédié", "Regard personnalisé sur le prix et la stratégie"],
    });
  });

  it("after a passage, renounces the plan replaced too, both amounts refunded", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [
      order(1, { plan: "serenite", amount_paid_cents: 51000 }),
      { plan: "accompagne", activated_at: daysAgo(5), amount_paid_cents: 99000 },
    ];
    mocks.rpc = {
      data: recorded({
        plan_name: "Sérénité",
        amount_paid_cents: 51000,
        replaced_plan_name: "Accompagné",
        replaced_amount_paid_cents: 99000,
        replaced_activated_at: daysAgo(5),
        scope: "full",
        refund_due_cents: 150000,
        back_to_plan: "autonomie",
        back_to_plan_name: "Autonomie",
      }),
      error: null,
    };
    await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" });
    expect(mocks.rpcArgs[0]).toMatchObject({ p_scope: "full" });
    expect(mocks.emails[0]).toMatchObject({
      amountCents: 150000,
      replaced: { planName: "Accompagné" },
      keptPlanName: null,
      stops: [
        "Conseiller dédié",
        "Regard personnalisé sur le prix et la stratégie",
        "Aide à la préparation des échanges avec le notaire",
      ],
    });
  });

  it("after a passage, renounces the passage alone: back to the plan replaced, 510 € refunded", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [
      order(1, { plan: "serenite", amount_paid_cents: 51000 }),
      { plan: "accompagne", activated_at: daysAgo(5), amount_paid_cents: 99000 },
    ];
    mocks.rpc = {
      data: recorded({
        plan_name: "Sérénité",
        amount_paid_cents: 51000,
        scope: "upgrade",
        refund_due_cents: 51000,
        back_to_plan: "accompagne",
        back_to_plan_name: "Accompagné",
      }),
      error: null,
    };
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "upgrade" })).toMatchObject({
      ok: true,
    });
    expect(mocks.rpcArgs[0]).toEqual({ p_subscription_id: SUBSCRIPTION, p_scope: "upgrade" });
    expect(mocks.emails[0]).toMatchObject({
      amountCents: 51000,
      replaced: null,
      keptPlanName: "Accompagné",
      // Only what the plan kept does not have.
      stops: ["Aide à la préparation des échanges avec le notaire"],
    });
  });

  it("never asks the base for a choice that is not offered", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    // A single plan: no passage to renounce alone.
    mocks.reads = [order(3), null];
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "upgrade" })).toEqual({
      ok: false,
      error: "not_offered",
    });
    // The plan replaced past its own 14 days: not everything.
    mocks.reads = [
      order(2, { plan: "serenite", amount_paid_cents: 51000 }),
      { plan: "accompagne", activated_at: daysAgo(30), amount_paid_cents: 99000 },
    ];
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toEqual({
      ok: false,
      error: "not_offered",
    });
    expect(mocks.rpcArgs).toHaveLength(0);
    // The base refuses it too (a page opened before the last day).
    mocks.reads = [order(3), null];
    mocks.rpc = { data: null, error: { code: "0A000" } };
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toEqual({
      ok: false,
      error: "not_offered",
    });
  });

  it("a second request keeps the first and sends nothing", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    const first = daysAgo(1);
    mocks.reads = [order(3, { withdrawal_requested_at: first }), null];
    mocks.rpc = { data: recorded({ status: "already", requested_at: first }), error: null };
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toMatchObject({
      ok: true,
      data: { requestedAt: first },
    });
    expect(mocks.emails).toHaveLength(0);
  });

  it("says when the acknowledgment did not leave", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.reads = [order(3), null];
    mocks.rpc = { data: recorded(), error: null };
    mocks.delivery = "failed";
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toMatchObject({
      ok: true,
      data: { acknowledged: false },
    });
    log.mockRestore();
  });

  it("refuses past the period without asking the base, and tells the errors plainly", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [order(30)];
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toEqual({
      ok: false,
      error: "over",
    });
    expect(mocks.rpcArgs).toHaveLength(0);

    for (const [code, error] of [
      ["22023", "over"],
      ["55000", "not_in_force"],
      ["42501", "not_found"],
    ] as const) {
      mocks.reads = [order(3), null];
      mocks.rpc = { data: null, error: { code } };
      expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toEqual({
        ok: false,
        error,
      });
    }
  });

  it("refuses a visitor and an id that is not one", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    expect(await withdrawPlan({ subscriptionId: "x", scope: "full" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "half" })).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toEqual({
      ok: false,
      error: "invalid",
    });
    mocks.user = null;
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION, scope: "full" })).toEqual({
      ok: false,
      error: "session",
    });
  });
});

describe("the acknowledgment of a withdrawal (2026-11-26)", () => {
  const props = {
    firstName: "Bruno",
    planName: "Sérénité",
    property: "LK-0009",
    requestedAt: "26 novembre 2026 à 10:05",
    orderedOn: "25 novembre 2026",
    earlyStart: false,
    replaced: null,
    planUrl: "https://leenkey.fr/vendeur/formule",
    siteUrl: "https://leenkey.fr",
  };

  it("says what stops at once, what stays and the refund within 14 days", async () => {
    const { render } = await import("@react-email/components");
    const { EMAIL_PLAIN_TEXT } = await import("@/emails/components/email-layout");
    const { WithdrawalReceivedEmail } = await import("@/emails/withdrawal-received");
    const text = await render(
      WithdrawalReceivedEmail({
        ...props,
        amount: "1 500 €",
        keptPlanName: null,
        stops: ["Conseiller dédié", "Suivi jusqu'à la signature"],
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toContain(
      "Ce qui s'arrête dès votre demande : Conseiller dédié ; Suivi jusqu'à la signature.",
    );
    expect(text).toMatch(/Ce qui reste : votre annonce, vos documents, vos messages/);
    expect(text).toMatch(/Nous vous remboursons 1 500 € au plus tard 14 jours après votre demande/);
    expect(text).not.toContain("Vous revenez à la formule");
  });

  it("after a passage renounced alone, names the plan kept", async () => {
    const { render } = await import("@react-email/components");
    const { EMAIL_PLAIN_TEXT } = await import("@/emails/components/email-layout");
    const { WithdrawalReceivedEmail } = await import("@/emails/withdrawal-received");
    const text = await render(
      WithdrawalReceivedEmail({
        ...props,
        amount: "510 €",
        keptPlanName: "Accompagné",
        stops: [],
      }),
      EMAIL_PLAIN_TEXT,
    );
    expect(text).toMatch(
      /Vous revenez à la formule Accompagné : elle continue jusqu'à son échéance/,
    );
    expect(text).toContain(
      "Les prestations payantes de votre formule s'arrêtent dès votre demande.",
    );
    expect(text).toMatch(/Nous vous remboursons 510 € au plus tard 14 jours/);
  });
});

describe("what may be renounced (2026-11-26)", () => {
  const NOW = new Date("2026-11-26T10:00:00Z");
  const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
  const accompagne = (days: number) => ({
    plan: "accompagne" as const,
    activatedAt: ago(days),
    amountPaidCents: 99000,
  });
  const passage = (days: number) => ({
    plan: "serenite" as const,
    activatedAt: ago(days),
    amountPaidCents: 51000,
  });
  const day = (date: Date) => date.toISOString().slice(0, 10);

  it("a single order: everything, until its last day", async () => {
    const { withdrawalOptions } = await import("@/leenkey/billing/withdrawal");
    const options = withdrawalOptions(accompagne(3), null, NOW);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ scope: "full", refundCents: 99000, backTo: null });
    // Ordered on Monday 23 November: 14 days end on Monday 7 December.
    expect(day(options[0]!.lastDay)).toBe("2026-12-07");
    // Sérénité bought directly: the same, for its price.
    expect(
      withdrawalOptions(
        { plan: "serenite", activatedAt: ago(2), amountPaidCents: 150000 },
        null,
        NOW,
      ),
    ).toMatchObject([{ scope: "full", refundCents: 150000, backTo: null }]);
  });

  it("after a passage, both within their 14 days: the passage alone (510 €) or everything (1 500 €)", async () => {
    const { withdrawalOptions } = await import("@/leenkey/billing/withdrawal");
    const options = withdrawalOptions(passage(1), accompagne(5), NOW);
    expect(options).toMatchObject([
      { scope: "upgrade", refundCents: 51000, backTo: "accompagne" },
      { scope: "full", refundCents: 150000, backTo: null },
    ]);
    // The passage until its own last day; everything until the last day of the first order.
    expect(day(options[0]!.lastDay)).toBe("2026-12-09");
    expect(day(options[1]!.lastDay)).toBe("2026-12-07");
  });

  it("after a passage, the first order past its 14 days: the passage alone", async () => {
    const { withdrawalOptions } = await import("@/leenkey/billing/withdrawal");
    expect(withdrawalOptions(passage(2), accompagne(30), NOW)).toMatchObject([
      { scope: "upgrade", refundCents: 51000, backTo: "accompagne" },
    ]);
  });

  it("nothing past the 14 days of the plan in force, nor for a plan paid nothing", async () => {
    const { withdrawalOptions } = await import("@/leenkey/billing/withdrawal");
    expect(withdrawalOptions(passage(20), accompagne(40), NOW)).toEqual([]);
    expect(withdrawalOptions({ ...accompagne(2), amountPaidCents: 0 }, null, NOW)).toEqual([]);
  });

  it("names what stops from the rights of the plans, never from their names", async () => {
    const { stoppedFeatures } = await import("@/leenkey/billing/withdrawal");
    const features = rights({
      accompagne: ["advisor", "human_price_strategy"],
      serenite: ["advisor", "human_price_strategy", "sale_file_building"],
    });
    const order = ["advisor", "human_price_strategy", "sale_file_building"] as const;
    expect(stoppedFeatures(features, "serenite", "accompagne", order)).toEqual([
      "sale_file_building",
    ]);
    expect(stoppedFeatures(features, "serenite", null, order)).toEqual([...order]);
    expect(stoppedFeatures(features, "accompagne", null, order)).toEqual([
      "advisor",
      "human_price_strategy",
    ]);
    expect(stoppedFeatures(null, "serenite", null, order)).toEqual([]);
  });

  it("the panel: the choices with their amounts and last days, and the requests still to refund", async () => {
    const { withdrawalView } = await import("@/leenkey/billing/withdrawal-view");
    const prices = [
      { code: "autonomie" as const, name: "Autonomie", priceCents: 0 },
      { code: "accompagne" as const, name: "Accompagné", priceCents: 99000 },
      { code: "serenite" as const, name: "Sérénité", priceCents: 150000 },
    ];
    const features = rights({
      accompagne: ["advisor"],
      serenite: ["advisor", "notary_coordination"],
    });
    const view = withdrawalView(
      {
        prices,
        withdrawals: [],
        active: {
          id: SUBSCRIPTION,
          plan: "serenite",
          activatedAt: ago(1),
          endsAt: null,
          earlyStart: false,
          amountPaidCents: 51000,
          replaced: accompagne(5),
        },
      },
      features,
      NOW,
    );
    expect(view.current?.planName).toBe("Sérénité");
    expect(view.current?.choices).toEqual([
      {
        scope: "upgrade",
        refund: "510\u202F€",
        lastDay: "9 décembre 2026",
        keptName: "Accompagné",
        stops: ["Aide à la préparation des échanges avec le notaire"],
        includes: null,
      },
      {
        scope: "full",
        refund: "1\u202F500\u202F€",
        lastDay: "7 décembre 2026",
        keptName: "Autonomie",
        stops: ["Conseiller dédié", "Aide à la préparation des échanges avec le notaire"],
        includes: { planName: "Accompagné", orderedOn: "21 novembre 2026" },
      },
    ]);
    expect(view.recorded).toEqual([]);

    // Back on Accompagné, past its own 14 days: nothing more to renounce, 510 € to come.
    const after = withdrawalView(
      {
        prices,
        active: {
          id: SUBSCRIPTION,
          plan: "accompagne",
          activatedAt: ago(30),
          endsAt: null,
          earlyStart: false,
          amountPaidCents: 99000,
          replaced: null,
        },
        withdrawals: [
          {
            requestedAt: "2026-11-26T09:00:00Z",
            scope: "upgrade",
            dueCents: 51000,
            backTo: "accompagne",
          },
        ],
      },
      features,
      NOW,
    );
    expect(after.current).toBeNull();
    expect(after.recorded).toEqual([
      {
        requestedAt: "2026-11-26T09:00:00Z",
        scope: "upgrade",
        amount: "510\u202F€",
        deadline: "10 décembre 2026",
        keptName: "Accompagné",
      },
    ]);
  });
});
