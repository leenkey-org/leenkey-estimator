import type { Database } from "@/types/database";
import { parisDay, withdrawalEnds } from "./orders";

type PlanCode = Database["public"]["Enums"]["plan_code"];
type PlanFeature = Database["public"]["Enums"]["plan_feature"];

// The withdrawal of a plan (L1-40, SPEC-V2 section 11): how long the seller
// may renounce it, and the dates a legal text shows in full (« 8 novembre
// 2026 », never a weekday nor a year left out). The base refuses only far
// past the period (subscription_withdraw): the exact day is checked here.

const DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

/** « 8 novembre 2026 » (Paris). */
export function legalDate(value: Date | string): string {
  return DATE.format(toDate(value));
}

/** « 8 novembre 2026 à 14:05 » (Paris). */
export function legalDateTime(value: Date | string): string {
  const date = toDate(value);
  return `${DATE.format(date)} à ${TIME.format(date)}`;
}

/** The last day the seller may renounce, « YYYY-MM-DD », as a moment of that day. */
export function withdrawalLastDay(activatedAt: Date | string): Date {
  return new Date(`${withdrawalEnds(toDate(activatedAt))}T12:00:00Z`);
}

/** Whether the plan ordered at `activatedAt` may still be renounced at `now` (until the end of its last day, in Paris). */
export function canWithdraw(activatedAt: Date | string, now: Date = new Date()): boolean {
  return parisDay(now) <= withdrawalEnds(toDate(activatedAt));
}

// --- What may be renounced (DECISIONS.md 2026-11-26) --------------------------

/**
 * « full »: everything paid for the plan in force, back to the free plan.
 * « upgrade »: a passage alone (Accompagné, then Sérénité), back to the plan
 * it replaced. The values subscription_withdraw takes.
 */
export const WITHDRAWAL_SCOPES = ["full", "upgrade"] as const;
export type WithdrawalScope = (typeof WITHDRAWAL_SCOPES)[number];

/** A paid order: the plan in force, or the one a passage replaced. */
export type PaidOrder = { plan: PlanCode; activatedAt: string; amountPaidCents: number };

export type WithdrawalOption = {
  scope: WithdrawalScope;
  /** What is refunded. */
  refundCents: number;
  /** The last day this choice is open. */
  lastDay: Date;
  /** The plan the seller keeps; null: the free plan. */
  backTo: PlanCode | null;
};

/**
 * What the seller may renounce at `now`, the passage alone first:
 * - a single order (a plan bought alone, or bought directly): everything;
 * - after a passage, both orders within their own 14 days: the passage
 *   alone, or everything (until the last day of the first order);
 * - after a passage, the first order past its 14 days: the passage alone.
 * Nothing once the plan in force is past its own 14 days, or paid nothing.
 */
export function withdrawalOptions(
  active: PaidOrder,
  replaced: PaidOrder | null,
  now: Date = new Date(),
): WithdrawalOption[] {
  if (active.amountPaidCents <= 0 || !canWithdraw(active.activatedAt, now)) return [];
  const lastDay = withdrawalLastDay(active.activatedAt);
  if (!replaced || replaced.amountPaidCents <= 0) {
    return [{ scope: "full", refundCents: active.amountPaidCents, lastDay, backTo: null }];
  }
  const options: WithdrawalOption[] = [
    { scope: "upgrade", refundCents: active.amountPaidCents, lastDay, backTo: replaced.plan },
  ];
  if (canWithdraw(replaced.activatedAt, now)) {
    const replacedLastDay = withdrawalLastDay(replaced.activatedAt);
    options.push({
      scope: "full",
      refundCents: active.amountPaidCents + replaced.amountPaidCents,
      lastDay: replacedLastDay < lastDay ? replacedLastDay : lastDay,
      backTo: null,
    });
  }
  return options;
}

/**
 * The rights that stop with a withdrawal: those of the plan renounced that
 * the plan kept does not have (all of them when nothing paid is kept). Read
 * in plan_entitlements, never from a plan name; in the order of `order`.
 */
export function stoppedFeatures(
  features: ReadonlyMap<PlanCode, ReadonlySet<PlanFeature>> | null,
  from: PlanCode,
  backTo: PlanCode | null,
  order: readonly PlanFeature[],
): PlanFeature[] {
  const lost = features?.get(from);
  if (!lost) return [];
  const kept = backTo ? features?.get(backTo) : undefined;
  return order.filter((feature) => lost.has(feature) && !kept?.has(feature));
}
