import { beforeEach, describe, expect, it, vi } from "vitest";

// L1-40: the withdrawal of a plan (leenkey/billing/withdrawal.ts and
// withdrawPlan in leenkey/billing/actions.ts): its last day at the end of a
// day of Paris, the errors of the base told plainly, the acknowledgment sent
// once, and said when it did not leave.

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
    mocks.reads = [
      { id: SUBSCRIPTION, activated_at: daysAgo(3), withdrawal_requested_at: null },
      null,
    ];
    mocks.rpc = { data: recorded(), error: null };
    const result = await withdrawPlan({ subscriptionId: SUBSCRIPTION });
    expect(result).toMatchObject({ ok: true, data: { acknowledged: true } });
    expect(mocks.rpcArgs[0]).toEqual({ p_subscription_id: SUBSCRIPTION, p_with_replaced: false });
    expect(mocks.emails).toHaveLength(1);
    expect(mocks.emails[0]).toMatchObject({
      sellerEmail: "bruno@exemple.test",
      planName: "Accompagné",
      amountCents: 99000,
      replaced: null,
    });
  });

  it("after a passage, renounces the plan replaced too, both amounts refunded", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [
      { id: SUBSCRIPTION, activated_at: daysAgo(1), withdrawal_requested_at: null },
      { activated_at: daysAgo(5) },
    ];
    mocks.rpc = {
      data: recorded({
        plan_name: "Sérénité",
        amount_paid_cents: 51000,
        replaced_plan_name: "Accompagné",
        replaced_amount_paid_cents: 99000,
        replaced_activated_at: daysAgo(5),
      }),
      error: null,
    };
    await withdrawPlan({ subscriptionId: SUBSCRIPTION });
    expect(mocks.rpcArgs[0]).toMatchObject({ p_with_replaced: true });
    expect(mocks.emails[0]).toMatchObject({
      amountCents: 150000,
      replaced: { planName: "Accompagné" },
    });
  });

  it("a second request keeps the first and sends nothing", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    const first = daysAgo(1);
    mocks.reads = [
      { id: SUBSCRIPTION, activated_at: daysAgo(3), withdrawal_requested_at: first },
      null,
    ];
    mocks.rpc = { data: recorded({ status: "already", requested_at: first }), error: null };
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toMatchObject({
      ok: true,
      data: { requestedAt: first },
    });
    expect(mocks.emails).toHaveLength(0);
  });

  it("says when the acknowledgment did not leave", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.reads = [
      { id: SUBSCRIPTION, activated_at: daysAgo(3), withdrawal_requested_at: null },
      null,
    ];
    mocks.rpc = { data: recorded(), error: null };
    mocks.delivery = "failed";
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toMatchObject({
      ok: true,
      data: { acknowledged: false },
    });
    log.mockRestore();
  });

  it("refuses past the period without asking the base, and tells the errors plainly", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    mocks.reads = [{ id: SUBSCRIPTION, activated_at: daysAgo(30), withdrawal_requested_at: null }];
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toEqual({
      ok: false,
      error: "over",
    });
    expect(mocks.rpcArgs).toHaveLength(0);

    for (const [code, error] of [
      ["22023", "over"],
      ["55000", "not_in_force"],
      ["42501", "not_found"],
    ] as const) {
      mocks.reads = [
        { id: SUBSCRIPTION, activated_at: daysAgo(3), withdrawal_requested_at: null },
        null,
      ];
      mocks.rpc = { data: null, error: { code } };
      expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toEqual({ ok: false, error });
    }
  });

  it("refuses a visitor and an id that is not one", async () => {
    const { withdrawPlan } = await import("@/leenkey/billing/actions");
    expect(await withdrawPlan({ subscriptionId: "x" })).toEqual({ ok: false, error: "invalid" });
    mocks.user = null;
    expect(await withdrawPlan({ subscriptionId: SUBSCRIPTION })).toEqual({
      ok: false,
      error: "session",
    });
  });
});
