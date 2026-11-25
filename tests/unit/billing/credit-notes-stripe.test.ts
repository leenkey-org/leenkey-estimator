import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The credit notes of the refunds against the Stripe SDK, simulated
// (core/billing/stripe.ts, DECISIONS.md 2026-11-25): what is sent to create
// one (linked to its refund, never a new refund, its idempotency key, the
// email), what is skipped (pending refunds, refunds already linked), the
// cap when a credit note was made by hand, the order without an invoice,
// the credit notes voided since.

type Note = {
  id: string;
  number: string;
  total: number;
  pdf: string | null;
  created: number;
  status: "issued" | "void";
  refunds: { refund: string }[];
};

const sdk = vi.hoisted(() => ({
  invoice: "in_1" as string | null,
  notes: [] as Note[],
  refunds: [] as { id: string; amount: number; status: string }[],
  created: [] as { params: Record<string, unknown>; options: Record<string, unknown> }[],
}));

const iterable = <T>(items: T[]) => ({
  async *[Symbol.asyncIterator]() {
    yield* items;
  },
});

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class {
    checkout = {
      sessions: { retrieve: async () => ({ id: "cs_1", invoice: sdk.invoice }) },
    };
    creditNotes = {
      list: () => iterable(sdk.notes),
      create: async (params: Record<string, unknown>, options: Record<string, unknown>) => {
        sdk.created.push({ params, options });
        const refunds = params.refunds as { refund: string }[];
        return {
          id: `cn_${sdk.created.length}`,
          number: `LK-CN-0${sdk.created.length}`,
          total: params.amount,
          pdf: "https://pay.stripe.com/credit_notes/x/pdf",
          created: 1_764_064_800,
          status: "issued",
          refunds: refunds.map((item) => ({ refund: item.refund })),
        };
      },
    };
    refunds = { list: () => iterable(sdk.refunds) };
  },
}));

const note = (overrides: Partial<Note>): Note => ({
  id: "cn_hand",
  number: "LK-CN-HAND",
  total: 99000,
  pdf: "https://pay.stripe.com/credit_notes/hand/pdf",
  created: 1_764_000_000,
  status: "issued",
  refunds: [],
  ...overrides,
});

beforeEach(() => {
  sdk.invoice = "in_1";
  sdk.notes = [];
  sdk.refunds = [];
  sdk.created = [];
  vi.stubEnv("NEXT_PUBLIC_ENV", "staging");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit");
  vi.stubEnv("STRIPE_MOCK", "");
});
afterEach(() => vi.unstubAllEnvs());

async function ensure() {
  const { ensureCreditNotes } = await import("@/core/billing/stripe");
  return ensureCreditNotes({
    checkoutSessionId: "cs_1",
    paymentIntentId: "pi_1",
    memo: "Avoir de test",
  });
}

describe("ensureCreditNotes", () => {
  it("links the refund already made, with its key and the email, never a new refund", async () => {
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "succeeded" }];
    const result = await ensure();
    expect(sdk.created).toEqual([
      {
        params: {
          invoice: "in_1",
          amount: 99000,
          refunds: [{ refund: "re_1", amount_refunded: 99000 }],
          reason: "order_change",
          email_type: "credit_note",
          memo: "Avoir de test",
        },
        options: { idempotencyKey: "credit-note-re_1" },
      },
    ]);
    expect(sdk.created[0]?.params).not.toHaveProperty("refund_amount");
    expect(sdk.created[0]?.params).not.toHaveProperty("out_of_band_amount");
    expect(result).toMatchObject({
      status: "ok",
      created: 1,
      pending: 0,
      voidIds: [],
      creditNotes: [{ id: "cn_1", amountCents: 99000, refundIds: ["re_1"] }],
    });
  });

  it("skips a pending refund, and counts it", async () => {
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "pending" }];
    expect(await ensure()).toMatchObject({ status: "ok", created: 0, pending: 1 });
    expect(sdk.created).toEqual([]);
  });

  it("says when the order has no invoice", async () => {
    sdk.invoice = null;
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "succeeded" }];
    expect(await ensure()).toEqual({ status: "no_invoice" });
    expect(sdk.created).toEqual([]);
  });

  it("skips a refund an existing credit note links (a second delivery)", async () => {
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "succeeded" }];
    sdk.notes = [note({ id: "cn_0", refunds: [{ refund: "re_1" }] })];
    expect(await ensure()).toMatchObject({ created: 0, creditNotes: [{ id: "cn_0" }] });
    expect(sdk.created).toEqual([]);
  });

  it("a credit note made by hand without a link: nothing more, or the rest only", async () => {
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "succeeded" }];
    sdk.notes = [note({ total: 99000 })];
    expect(await ensure()).toMatchObject({ created: 0, creditNotes: [{ id: "cn_hand" }] });
    expect(sdk.created).toEqual([]);

    sdk.notes = [note({ total: 40000 })];
    await ensure();
    expect(sdk.created).toHaveLength(1);
    expect(sdk.created[0]?.params).toMatchObject({
      amount: 59000,
      refunds: [{ refund: "re_1", amount_refunded: 59000 }],
    });
  });

  it("a voided credit note neither counts nor stays", async () => {
    sdk.refunds = [{ id: "re_1", amount: 99000, status: "succeeded" }];
    sdk.notes = [note({ id: "cn_void", status: "void", refunds: [{ refund: "re_1" }] })];
    const result = await ensure();
    expect(result).toMatchObject({ created: 1, voidIds: ["cn_void"] });
    if (result.status === "ok") {
      expect(result.creditNotes.map((item) => item.id)).toEqual(["cn_1"]);
    }
  });
});
