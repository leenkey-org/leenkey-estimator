import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creditNoteState,
  refundDeadline,
  refundLastDay,
  refundStatus,
  sortRefunds,
  waitsForRefund,
  type RefundFacts,
} from "@/leenkey/admin/refunds/status";

// Credit notes and refunds (DECISIONS.md 2026-11-25): which refunds still
// need a credit note (never a second one, never a second refund), the
// mocked credit note of the end-to-end tests, the status and the deadline
// of a withdrawal on /admin/remboursements, and their order.

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

const facts = (overrides: Partial<RefundFacts> = {}): RefundFacts => ({
  requestedAt: "2026-11-10T09:00:00Z",
  refundedAt: null,
  amountPaidCents: 99000,
  refundedCents: 0,
  creditedCents: 0,
  ...overrides,
});

describe("the refunds that need a credit note", () => {
  it("one per refund no credit note links, of its amount", async () => {
    const { planCreditNotes } = await import("@/core/billing/stripe");
    const refunds = [
      { id: "re_1", amountCents: 50000 },
      { id: "re_2", amountCents: 49000 },
    ];
    expect(planCreditNotes(refunds, [])).toEqual([
      { refundId: "re_1", amountCents: 50000 },
      { refundId: "re_2", amountCents: 49000 },
    ]);
    expect(planCreditNotes(refunds, [{ refundIds: ["re_1"], amountCents: 50000 }])).toEqual([
      { refundId: "re_2", amountCents: 49000 },
    ]);
    expect(planCreditNotes(refunds, [{ refundIds: ["re_2", "re_1"], amountCents: 99000 }])).toEqual(
      [],
    );
  });

  it("a credit note made by hand without a link counts: never more credited than refunded", async () => {
    const { planCreditNotes } = await import("@/core/billing/stripe");
    const refund = [{ id: "re_1", amountCents: 99000 }];
    // « En dehors de Stripe », the whole amount: nothing more.
    expect(planCreditNotes(refund, [{ refundIds: [], amountCents: 99000 }])).toEqual([]);
    expect(planCreditNotes(refund, [{ refundIds: [], amountCents: 120000 }])).toEqual([]);
    // Part of it: the rest only.
    expect(planCreditNotes(refund, [{ refundIds: [], amountCents: 40000 }])).toEqual([
      { refundId: "re_1", amountCents: 59000 },
    ]);
  });

  it("never a credit note of nothing", async () => {
    const { planCreditNotes } = await import("@/core/billing/stripe");
    expect(planCreditNotes([{ id: "re_0", amountCents: 0 }], [])).toEqual([]);
    expect(planCreditNotes([], [])).toEqual([]);
  });

  it("one idempotency key per refund", async () => {
    const { creditNoteKey } = await import("@/core/billing/stripe");
    expect(creditNoteKey("re_1")).toBe("credit-note-re_1");
  });

  it("the mock: one credit note of the amount refunded, the same id each time", async () => {
    vi.stubEnv("STRIPE_MOCK", "1");
    vi.stubEnv("NEXT_PUBLIC_ENV", "local");
    const { ensureCreditNotes } = await import("@/core/billing/stripe");
    const input = { checkoutSessionId: "cs_mock_1", paymentIntentId: "pi_cs_mock_1" };
    const first = await ensureCreditNotes({ ...input, mockRefundedCents: 99000 });
    const again = await ensureCreditNotes({ ...input, mockRefundedCents: 99000 });
    expect(first).toMatchObject({
      status: "ok",
      created: 1,
      creditNotes: [
        {
          number: "MOCK-0001",
          amountCents: 99000,
          // An address of the mock: shown as a link, never fetched.
          pdfUrl: "https://pay.stripe.com/mock/credit_notes/cn_mock_picsmock1/pdf",
          ours: true,
        },
      ],
    });
    expect(first.status === "ok" && again.status === "ok").toBe(true);
    if (first.status === "ok" && again.status === "ok") {
      expect(again.creditNotes[0]?.id).toBe(first.creditNotes[0]?.id);
    }
    expect(await ensureCreditNotes(input)).toMatchObject({ creditNotes: [], created: 0 });
  });

  it("the page of the payment in the Stripe dashboard, test outside production", async () => {
    const { dashboardPaymentUrl } = await import("@/core/billing/stripe");
    expect(dashboardPaymentUrl("pi_1", false)).toBe(
      "https://dashboard.stripe.com/test/payments/pi_1",
    );
    expect(dashboardPaymentUrl("pi_1", true)).toBe("https://dashboard.stripe.com/payments/pi_1");
  });
});

describe("the status of a refund", () => {
  const now = new Date("2026-11-20T09:00:00Z");

  it("is owed until the end of the 14th day after the request, in Paris (L221-24)", () => {
    expect(refundLastDay("2026-11-10T09:00:00Z")).toBe("2026-11-24");
    expect(refundDeadline("2026-11-10T09:00:00Z").toISOString()).toBe("2026-11-24T12:00:00.000Z");
    // Asked at 23:30 in Paris on the 10th (22:30 UTC): the day of Paris counts.
    expect(refundLastDay("2026-11-10T22:30:00Z")).toBe("2026-11-24");
    // Asked at 00:30 in Paris on the 11th (23:30 UTC on the 10th).
    expect(refundLastDay("2026-11-10T23:30:00Z")).toBe("2026-11-25");
    expect(refundStatus(facts(), now)).toBe("to_refund");
    // 23:59 in Paris on the 24th (CET, UTC+1): still on time.
    expect(refundStatus(facts(), new Date("2026-11-24T22:59:59Z"))).toBe("to_refund");
    // Midnight in Paris: late.
    expect(refundStatus(facts(), new Date("2026-11-24T23:00:00Z"))).toBe("late");
  });

  it("refunded once the webhook says so, in full or in part", () => {
    expect(
      refundStatus(facts({ refundedAt: "2026-11-30T09:00:00Z", refundedCents: 99000 }), now),
    ).toBe("refunded");
    expect(refundStatus(facts({ refundedCents: 99000 }), now)).toBe("refunded");
    expect(refundStatus(facts({ refundedCents: 30000 }), new Date("2026-12-30T09:00:00Z"))).toBe(
      "partial",
    );
  });

  it("money still owed: a withdrawal not, or not fully, refunded", () => {
    expect(waitsForRefund(facts(), now)).toBe(true);
    expect(waitsForRefund(facts({ refundedCents: 30000 }), now)).toBe(true);
    expect(waitsForRefund(facts({ refundedAt: "2026-11-19T09:00:00Z" }), now)).toBe(false);
    // Refunded in Stripe without a withdrawal: nothing owed.
    expect(waitsForRefund(facts({ requestedAt: null }), now)).toBe(false);
  });

  it("the credit notes: none, missing, done", () => {
    expect(creditNoteState(facts())).toBe("none");
    expect(creditNoteState(facts({ refundedCents: 99000 }))).toBe("missing");
    expect(creditNoteState(facts({ refundedCents: 99000, creditedCents: 50000 }))).toBe("missing");
    expect(creditNoteState(facts({ refundedCents: 99000, creditedCents: 99000 }))).toBe("done");
  });

  it("what is owed first by deadline, then partial, then refunded, the latest first", () => {
    const rows = [
      { id: "done-old", ...facts({ refundedAt: "2026-11-12T09:00:00Z", refundedCents: 99000 }) },
      { id: "late", ...facts({ requestedAt: "2026-11-01T09:00:00Z" }) },
      { id: "partial", ...facts({ refundedCents: 100 }) },
      { id: "done-new", ...facts({ refundedAt: "2026-11-18T09:00:00Z", refundedCents: 99000 }) },
      { id: "soon", ...facts({ requestedAt: "2026-11-15T09:00:00Z" }) },
      {
        id: "no-request",
        ...facts({ requestedAt: null, refundedCents: 99000, refundedAt: "2026-11-15T09:00:00Z" }),
      },
    ];
    expect(sortRefunds(rows, now).map((row) => row.id)).toEqual([
      "late",
      "soon",
      "partial",
      "done-new",
      "no-request",
      "done-old",
    ]);
  });
});

// DECISIONS.md 2026-11-26: per withdrawal, what is due, refunded and left,
// and « Rétractation – Remboursement en attente » while something is left.
describe("a withdrawal on /admin/remboursements (2026-11-26)", () => {
  const now = new Date("2026-11-20T09:00:00Z");

  it("what is refunded and left of a payment, never more than was paid", async () => {
    const { leftOfPayment, refundedOfPayment } = await import("@/leenkey/admin/refunds/status");
    expect(refundedOfPayment(facts())).toBe(0);
    expect(leftOfPayment(facts())).toBe(99000);
    expect(refundedOfPayment(facts({ refundedCents: 40000 }))).toBe(40000);
    expect(leftOfPayment(facts({ refundedCents: 40000 }))).toBe(59000);
    // Marked refunded by the webhook: all of it, whatever the amount last read.
    expect(leftOfPayment(facts({ refundedAt: "2026-11-19T09:00:00Z", refundedCents: 0 }))).toBe(0);
    expect(refundedOfPayment(facts({ refundedCents: 120000 }))).toBe(99000);
  });

  it("what is left of a request of two payments, in any order of the refunds", async () => {
    const { leftOfWithdrawal } = await import("@/leenkey/admin/refunds/status");
    const request = (refunded: number) => ({
      withdrawalDueCents: 150000,
      withdrawalRefundedCents: refunded,
      withdrawalPayments: 2,
    });
    expect(leftOfWithdrawal(request(0))).toBe(150000);
    // The 510 € first, or the 990 € first.
    expect(leftOfWithdrawal(request(51000))).toBe(99000);
    expect(leftOfWithdrawal(request(99000))).toBe(51000);
    expect(leftOfWithdrawal(request(150000))).toBe(0);
    // A refund without a withdrawal has none.
    expect(
      leftOfWithdrawal({
        withdrawalDueCents: null,
        withdrawalRefundedCents: null,
        withdrawalPayments: null,
      }),
    ).toBeNull();
  });

  it("« Rétractation – Remboursement en attente » while something is left, late or partly refunded", async () => {
    const { withdrawalPending } = await import("@/leenkey/admin/refunds/status");
    const { frAdminRefunds } = await import("@/lib/i18n/sections/adminRefunds");
    expect(frAdminRefunds.status.withdrawalPending).toBe("Rétractation – Remboursement en attente");
    expect(withdrawalPending(facts(), now)).toBe(true);
    expect(withdrawalPending(facts({ refundedCents: 30000 }), now)).toBe(true);
    expect(withdrawalPending(facts(), new Date("2026-12-30T09:00:00Z"))).toBe(true);
    expect(withdrawalPending(facts({ refundedAt: "2026-11-19T09:00:00Z" }), now)).toBe(false);
    expect(withdrawalPending(facts({ refundedCents: 99000 }), now)).toBe(false);
    // A partial refund made by the team without a withdrawal is not one.
    expect(withdrawalPending(facts({ requestedAt: null, refundedCents: 30000 }), now)).toBe(false);
  });

  it("« En retard » past the 14 days while money is left, a partial refund included", async () => {
    const { refundLate } = await import("@/leenkey/admin/refunds/status");
    const after = new Date("2026-12-30T09:00:00Z");
    expect(refundLate(facts(), now)).toBe(false);
    expect(refundLate(facts(), after)).toBe(true);
    // Partly refunded: the status says « partial », the lateness is told apart.
    expect(refundStatus(facts({ refundedCents: 30000 }), after)).toBe("partial");
    expect(refundLate(facts({ refundedCents: 30000 }), after)).toBe(true);
    expect(refundLate(facts({ refundedCents: 30000 }), now)).toBe(false);
    // Nothing left, or no withdrawal: never late.
    expect(refundLate(facts({ refundedAt: "2026-12-29T09:00:00Z" }), after)).toBe(false);
    expect(refundLate(facts({ refundedCents: 99000 }), after)).toBe(false);
    expect(refundLate(facts({ requestedAt: null, refundedCents: 30000 }), after)).toBe(false);
  });
});
