import type { Database } from "@/types/database";

// « Mes factures et paiements » of /vendeur/formule (Cédric, 2026-11-26;
// DECISIONS.md) as plain values (unit-tested, shared with the page): every
// payment of the seller, most recent first, with the invoice Stripe drew
// for it and the credit notes of its refunds. A payment is a subscription
// paid by Checkout (a plan, or the passage to a dearer one); what was
// refunded is what its credit notes say (the seller does not read the
// events of Stripe), a plan ended by its refund counting as refunded.

type PlanCode = Database["public"]["Enums"]["plan_code"];

/** The anchor of the section on the page of the plans. */
export const PAYMENTS_ANCHOR = "factures";

export type DocumentKind = "facture" | "avoir";

/**
 * The download of an invoice (`id`: the subscription paid) or of a credit
 * note (`id`: its row), for their owner: app/(forms)/vendeur/formule/document.
 */
export function documentHref(kind: DocumentKind, id: string): string {
  return `/vendeur/formule/document?${kind}=${id}`;
}

export type PaymentStatus = "paid" | "partly_refunded" | "refunded";

export type PaymentRow = {
  id: string;
  property_id: string;
  plan: PlanCode;
  amount_paid_cents: number;
  activated_at: string;
  refunded_at: string | null;
  stripe_checkout_session_id: string | null;
};

export type CreditNoteRow = {
  id: string;
  subscription_id: string;
  number: string;
  amount_cents: number;
  pdf_url: string | null;
  issued_at: string;
};

export type SellerCreditNote = {
  id: string;
  number: string;
  amountCents: number;
  issuedAt: string;
  /** Stripe gave the address of its PDF. */
  hasPdf: boolean;
};

export type SellerPayment = {
  /** The subscription paid. */
  id: string;
  paidAt: string;
  planName: string;
  /** « 12 rue de la Gare, Savigny-sur-Orge », null for a property the seller no longer has. */
  propertyName: string | null;
  amountCents: number;
  /** What its credit notes refunded, never more than what was paid. */
  refundedCents: number;
  status: PaymentStatus;
  /** Paid by Checkout: Stripe drew an invoice for it. */
  hasInvoice: boolean;
  /** Most recent first. */
  creditNotes: SellerCreditNote[];
};

export function paymentStatus(
  amountCents: number,
  creditedCents: number,
  refundedAt: string | null,
): PaymentStatus {
  if (refundedAt !== null || (amountCents > 0 && creditedCents >= amountCents)) return "refunded";
  return creditedCents > 0 ? "partly_refunded" : "paid";
}

const byDateDesc = (a: string, b: string) => Date.parse(b) - Date.parse(a);

/** The payments of a seller, most recent first; a free plan or a free order is not one. */
export function sellerPayments(
  subscriptions: readonly PaymentRow[],
  creditNotes: readonly CreditNoteRow[],
  planNames: Readonly<Partial<Record<PlanCode, string>>>,
  propertyNames: Readonly<Record<string, string>>,
): SellerPayment[] {
  return subscriptions
    .filter((row) => row.amount_paid_cents > 0)
    .map((row) => {
      const notes = creditNotes
        .filter((note) => note.subscription_id === row.id)
        .sort((a, b) => byDateDesc(a.issued_at, b.issued_at));
      const credited = notes.reduce((sum, note) => sum + note.amount_cents, 0);
      const status = paymentStatus(row.amount_paid_cents, credited, row.refunded_at);
      return {
        id: row.id,
        paidAt: row.activated_at,
        planName: planNames[row.plan] ?? row.plan,
        propertyName: propertyNames[row.property_id] ?? null,
        amountCents: row.amount_paid_cents,
        refundedCents:
          status === "refunded" && credited === 0
            ? row.amount_paid_cents
            : Math.min(credited, row.amount_paid_cents),
        status,
        hasInvoice: row.stripe_checkout_session_id !== null,
        creditNotes: notes.map((note) => ({
          id: note.id,
          number: note.number,
          amountCents: note.amount_cents,
          issuedAt: note.issued_at,
          hasPdf: note.pdf_url !== null,
        })),
      };
    })
    .sort((a, b) => byDateDesc(a.paidAt, b.paidAt));
}
