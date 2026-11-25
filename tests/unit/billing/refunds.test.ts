import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creditNoteState,
  refundDeadline,
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
  it("skips the refunds an issued credit note links, by hand or not", async () => {
    const { refundsWithoutCreditNote } = await import("@/core/billing/stripe");
    const refunds = [
      { id: "re_1", amountCents: 50000 },
      { id: "re_2", amountCents: 49000 },
    ];
    expect(refundsWithoutCreditNote(refunds, [])).toEqual(refunds);
    expect(refundsWithoutCreditNote(refunds, [{ refundIds: ["re_1"] }])).toEqual([
      { id: "re_2", amountCents: 49000 },
    ]);
    expect(refundsWithoutCreditNote(refunds, [{ refundIds: ["re_2", "re_1"] }])).toEqual([]);
  });

  it("never a credit note of nothing", async () => {
    const { refundsWithoutCreditNote } = await import("@/core/billing/stripe");
    expect(refundsWithoutCreditNote([{ id: "re_0", amountCents: 0 }], [])).toEqual([]);
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
      creditNotes: [{ number: "MOCK-0001", amountCents: 99000, pdfUrl: null }],
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

  it("is owed 14 days after the request (L221-24)", () => {
    expect(refundDeadline("2026-11-10T09:00:00Z").toISOString()).toBe("2026-11-24T09:00:00.000Z");
    expect(refundStatus(facts(), now)).toBe("to_refund");
    expect(refundStatus(facts(), new Date("2026-11-24T09:00:00Z"))).toBe("to_refund");
    expect(refundStatus(facts(), new Date("2026-11-24T09:00:01Z"))).toBe("late");
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
