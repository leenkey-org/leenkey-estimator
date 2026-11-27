// The refunds of the back office (/admin/remboursements, DECISIONS.md
// 2026-11-25): where each plan renounced or refunded stands, from the facts
// admin_refunds() reads. Pure, without the database (tests/unit).

import { parisDay } from "@/leenkey/billing/orders";

/** A withdrawal is refunded within 14 days of the request (code de la consommation, L221-24). */
export const REFUND_DAYS = 14;

export type RefundStatus =
  /** Renounced, nothing refunded yet, within the 14 days. */
  | "to_refund"
  /** Renounced, nothing refunded, past the 14 days. */
  | "late"
  /** Part of the amount paid refunded by Stripe. */
  | "partial"
  /** Refunded in full (refunded_at, written by the webhook). */
  | "refunded";

/** The credit notes of the refunds: none refunded, all there, or some to create. */
export type CreditNoteState = "none" | "missing" | "done";

export type RefundFacts = {
  /** The withdrawal, null for a plan refunded without one. */
  requestedAt: string | null;
  refundedAt: string | null;
  amountPaidCents: number;
  /** What Stripe last said was refunded of the payment, in all. */
  refundedCents: number;
  /** The credit notes of the plan, in all. */
  creditedCents: number;
};

/**
 * The withdrawal a payment belongs to (DECISIONS.md 2026-11-26): a request
 * may renounce two payments (a plan and the passage that replaced it), each
 * refunded on its own in Stripe. Null without a withdrawal.
 */
export type WithdrawalFacts = {
  /** Everything due for the request, all its payments together. */
  withdrawalDueCents: number | null;
  /** What Stripe refunded of it so far. */
  withdrawalRefundedCents: number | null;
  /** How many payments the request renounced. */
  withdrawalPayments: number | null;
};

/** What Stripe refunded of this payment: never more than was paid, all of it once marked refunded. */
export function refundedOfPayment(
  facts: Pick<RefundFacts, "refundedAt" | "amountPaidCents" | "refundedCents">,
): number {
  if (facts.refundedAt) return facts.amountPaidCents;
  return Math.max(0, Math.min(facts.amountPaidCents, facts.refundedCents));
}

/** What is left to refund of this payment. */
export function leftOfPayment(
  facts: Pick<RefundFacts, "refundedAt" | "amountPaidCents" | "refundedCents">,
): number {
  return facts.amountPaidCents - refundedOfPayment(facts);
}

/** What is left to refund of the whole request; null without a withdrawal. */
export function leftOfWithdrawal(facts: WithdrawalFacts): number | null {
  if (facts.withdrawalDueCents === null) return null;
  return Math.max(0, facts.withdrawalDueCents - (facts.withdrawalRefundedCents ?? 0));
}

/**
 * « Rétractation – Remboursement en attente » (Cédric, 2026-11-26): a
 * withdrawal with money left to refund on this payment, late or not, partly
 * refunded or not.
 */
export function withdrawalPending(facts: RefundFacts, now: Date = new Date()): boolean {
  return waitsForRefund(facts, now);
}

/** The last day to refund a withdrawal, « YYYY-MM-DD » in Paris: the day of the request plus 14 days. */
export function refundLastDay(requestedAt: string | Date): string {
  const day = new Date(`${parisDay(new Date(requestedAt))}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + REFUND_DAYS);
  return day.toISOString().slice(0, 10);
}

/** The last day to refund, as a moment of that day (noon UTC), to show. */
export function refundDeadline(requestedAt: string | Date): Date {
  return new Date(`${refundLastDay(requestedAt)}T12:00:00Z`);
}

/** Late once that last day is over in Paris. */
function pastDeadline(requestedAt: string, now: Date): boolean {
  return parisDay(now) > refundLastDay(requestedAt);
}

export function refundStatus(facts: RefundFacts, now: Date = new Date()): RefundStatus {
  if (facts.refundedAt) return "refunded";
  if (facts.refundedCents > 0 && facts.refundedCents >= facts.amountPaidCents) return "refunded";
  if (facts.refundedCents > 0) return "partial";
  if (facts.requestedAt && pastDeadline(facts.requestedAt, now)) {
    return "late";
  }
  return "to_refund";
}

/**
 * « En retard »: a withdrawal with money left to refund on this payment once
 * its last day is over, whatever was refunded of it so far (a partial refund
 * past the 14 days is late too).
 */
export function refundLate(facts: RefundFacts, now: Date = new Date()): boolean {
  if (!facts.requestedAt) return false;
  return leftOfPayment(facts) > 0 && pastDeadline(facts.requestedAt, now);
}

export function creditNoteState(
  facts: Pick<RefundFacts, "refundedCents" | "creditedCents">,
): CreditNoteState {
  if (facts.refundedCents <= 0) return "none";
  return facts.creditedCents >= facts.refundedCents ? "done" : "missing";
}

/** Money still owed to the seller: a withdrawal not, or not fully, refunded. */
export function waitsForRefund(facts: RefundFacts, now: Date = new Date()): boolean {
  if (!facts.requestedAt) return false;
  const status = refundStatus(facts, now);
  return status === "to_refund" || status === "late" || status === "partial";
}

const RANK: Record<RefundStatus, number> = { late: 0, to_refund: 0, partial: 1, refunded: 2 };

/**
 * The order of the page: what is owed first, by deadline (the closest
 * first), then the partial refunds, then the refunds done, the latest first.
 */
export function sortRefunds<T extends RefundFacts & { lastRefundAt?: string | null }>(
  rows: readonly T[],
  now: Date = new Date(),
): T[] {
  const time = (value: string | null | undefined) => (value ? Date.parse(value) : 0);
  return [...rows].sort((a, b) => {
    const rank = RANK[refundStatus(a, now)] - RANK[refundStatus(b, now)];
    if (rank !== 0) return rank;
    if (RANK[refundStatus(a, now)] < 2) {
      // Owed: the closest deadline first; a refund without a withdrawal last.
      const da = a.requestedAt ? time(a.requestedAt) : Number.POSITIVE_INFINITY;
      const db = b.requestedAt ? time(b.requestedAt) : Number.POSITIVE_INFINITY;
      return da - db;
    }
    return (
      time(b.refundedAt ?? b.lastRefundAt ?? null) - time(a.refundedAt ?? a.lastRefundAt ?? null)
    );
  });
}
