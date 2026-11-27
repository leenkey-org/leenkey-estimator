import { describe, expect, it } from "vitest";
import {
  documentHref,
  paymentStatus,
  sellerPayments,
  type CreditNoteRow,
  type PaymentRow,
} from "@/leenkey/billing/payments";
import { documentQuerySchema } from "@/lib/validations/billing";

// « Mes factures et paiements » (Cédric, 2026-11-26; DECISIONS.md): every
// payment of the seller, most recent first, with its status, its invoice
// and the credit notes of its refunds.

const payment = (overrides: Partial<PaymentRow>): PaymentRow => ({
  id: "s1",
  property_id: "p1",
  plan: "accompagne",
  amount_paid_cents: 99000,
  activated_at: "2026-11-02T10:00:00Z",
  refunded_at: null,
  stripe_checkout_session_id: "cs_1",
  ...overrides,
});

const note = (overrides: Partial<CreditNoteRow>): CreditNoteRow => ({
  id: "n1",
  subscription_id: "s1",
  number: "LK-0001-CN-01",
  amount_cents: 99000,
  pdf_url: "https://pay.stripe.com/credit_notes/x/pdf",
  issued_at: "2026-11-10T10:00:00Z",
  ...overrides,
});

const plans = { accompagne: "Accompagné", serenite: "Sérénité" };
const properties = { p1: "12 rue de la Gare, Savigny-sur-Orge" };

describe("paymentStatus", () => {
  it("paid, refunded partly, refunded", () => {
    expect(paymentStatus(99000, 0, null)).toBe("paid");
    expect(paymentStatus(99000, 40000, null)).toBe("partly_refunded");
    expect(paymentStatus(99000, 99000, null)).toBe("refunded");
    // The plan ended by its refund, its credit note still to create.
    expect(paymentStatus(99000, 0, "2026-11-10T10:00:00Z")).toBe("refunded");
  });
});

describe("sellerPayments", () => {
  it("lists every payment, most recent first, with its plan and its property", () => {
    const list = sellerPayments(
      [
        payment({}),
        payment({
          id: "s2",
          plan: "serenite",
          amount_paid_cents: 51000,
          activated_at: "2026-11-05T10:00:00Z",
          stripe_checkout_session_id: "cs_2",
        }),
      ],
      [],
      plans,
      properties,
    );
    expect(list.map((item) => item.id)).toEqual(["s2", "s1"]);
    expect(list[0]).toEqual({
      id: "s2",
      paidAt: "2026-11-05T10:00:00Z",
      planName: "Sérénité",
      propertyName: "12 rue de la Gare, Savigny-sur-Orge",
      amountCents: 51000,
      refundedCents: 0,
      status: "paid",
      hasInvoice: true,
      creditNotes: [],
    });
  });

  it("a refund in two parts: two credit notes, the latest first, then refunded", () => {
    const partly = sellerPayments(
      [payment({})],
      [note({ amount_cents: 40000 })],
      plans,
      properties,
    );
    expect(partly[0]).toMatchObject({ status: "partly_refunded", refundedCents: 40000 });
    const full = sellerPayments(
      [payment({ refunded_at: "2026-11-12T10:00:00Z" })],
      [
        note({ amount_cents: 40000 }),
        note({
          id: "n2",
          number: "LK-0001-CN-02",
          amount_cents: 59000,
          issued_at: "2026-11-12T10:00:00Z",
          pdf_url: null,
        }),
      ],
      plans,
      properties,
    );
    expect(full[0]).toMatchObject({ status: "refunded", refundedCents: 99000 });
    expect(full[0]?.creditNotes).toEqual([
      {
        id: "n2",
        number: "LK-0001-CN-02",
        amountCents: 59000,
        issuedAt: "2026-11-12T10:00:00Z",
        hasPdf: false,
      },
      {
        id: "n1",
        number: "LK-0001-CN-01",
        amountCents: 40000,
        issuedAt: "2026-11-10T10:00:00Z",
        hasPdf: true,
      },
    ]);
  });

  it("refunded before its credit note exists: the whole amount, no credit note yet", () => {
    const [item] = sellerPayments(
      [payment({ refunded_at: "2026-11-10T10:00:00Z" })],
      [],
      plans,
      properties,
    );
    expect(item).toMatchObject({ status: "refunded", refundedCents: 99000, creditNotes: [] });
  });

  it("the credit notes of another payment are not its own; never more refunded than paid", () => {
    const list = sellerPayments(
      [payment({}), payment({ id: "s2", activated_at: "2026-11-05T10:00:00Z" })],
      [note({ subscription_id: "s2", amount_cents: 120000 })],
      plans,
      properties,
    );
    expect(list[0]).toMatchObject({ id: "s2", status: "refunded", refundedCents: 99000 });
    expect(list[1]).toMatchObject({ id: "s1", status: "paid", creditNotes: [] });
  });

  it("a free order is not a payment; a payment without Checkout has no invoice; a property gone has no name", () => {
    const list = sellerPayments(
      [
        payment({ id: "free", amount_paid_cents: 0 }),
        payment({ id: "hand", stripe_checkout_session_id: null, property_id: "gone" }),
      ],
      [],
      {},
      properties,
    );
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: "hand",
      hasInvoice: false,
      propertyName: null,
      planName: "accompagne",
    });
  });
});

describe("the download of a document", () => {
  const id = "00000000-0000-4000-a000-000000000001";
  it("an invoice by its payment, a credit note by its row", () => {
    expect(documentHref("facture", id)).toBe(`/vendeur/formule/document?facture=${id}`);
    expect(documentHref("avoir", id)).toBe(`/vendeur/formule/document?avoir=${id}`);
  });
  it("one of the two, a uuid", () => {
    expect(documentQuerySchema.safeParse({ facture: id }).success).toBe(true);
    expect(documentQuerySchema.safeParse({ avoir: id }).success).toBe(true);
    expect(documentQuerySchema.safeParse({}).success).toBe(false);
    expect(documentQuerySchema.safeParse({ facture: id, avoir: id }).success).toBe(false);
    expect(documentQuerySchema.safeParse({ facture: "cs_1" }).success).toBe(false);
  });
});
