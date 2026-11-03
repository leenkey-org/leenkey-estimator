import type { PlanView } from "@/core/billing/plan-text";
import type { AppEnv } from "@/lib/env";
import type { CheckoutMetadata, OrderKind } from "@/lib/validations/billing";
import type { Database } from "@/types/database";

// What a seller may order for a property, as plain values (unit-tested,
// shared with the page): a plan bought on Autonomie, or the passage from one
// paid plan to a dearer one; never a plan lower than the one in force
// (SPEC-V2 8.8). The amounts come from the plans table; the Stripe prices,
// on the server only, are in prices.ts.

type PlanCode = Database["public"]["Enums"]["plan_code"];

export type PlanChoice =
  | { status: "current" }
  | { status: "lower" }
  | { status: "free" }
  | { status: "order"; kind: OrderKind; amountCents: number };

/** What the seller may do with `target`, the plan `current` being in force. */
export function planChoice(
  plans: readonly Pick<PlanView, "code" | "priceCents">[],
  current: PlanCode,
  target: PlanCode,
): PlanChoice {
  if (target === current) return { status: "current" };
  const from = plans.find((plan) => plan.code === current);
  const to = plans.find((plan) => plan.code === target);
  if (!to || to.priceCents <= 0) return { status: "free" };
  const paid = from?.priceCents ?? 0;
  if (paid <= 0) return { status: "order", kind: "new", amountCents: to.priceCents };
  if (to.priceCents <= paid) return { status: "lower" };
  return { status: "order", kind: "upgrade", amountCents: to.priceCents - paid };
}

/** Read back by the webhook (lib/validations/billing.ts, checkoutMetadataSchema). */
export function checkoutMetadata(order: {
  propertyId: string;
  ownerId: string;
  plan: PlanCode;
  kind: OrderKind;
  earlyStart: boolean;
  acceptedAt: Date;
  cguVersion: string;
  cgvVersion: string;
  env: AppEnv;
}): CheckoutMetadata {
  return {
    property_id: order.propertyId,
    owner_id: order.ownerId,
    plan: order.plan,
    kind: order.kind,
    early_start: order.earlyStart ? "1" : "0",
    accepted_at: order.acceptedAt.toISOString(),
    cgu_version: order.cguVersion,
    cgv_version: order.cgvVersion,
    env: order.env,
  };
}

/** « 2026-11-03 », the day of Paris of a moment. */
function parisDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(date);
}

/** Easter Sunday of a year (anonymous Gregorian computus), « YYYY-MM-DD ». */
function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Adds days to a day « YYYY-MM-DD » (calendar days, no clock). */
function addDays(day: string, count: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

/** The public holidays of metropolitan France (Code du travail, L3133-1). */
function holiday(day: string): boolean {
  const year = Number(day.slice(0, 4));
  const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
  if (fixed.includes(day.slice(5))) return true;
  const sunday = easter(year);
  return [1, 39, 50].some((offset) => addDays(sunday, offset) === day);
}

/**
 * Last day of the 14 days of withdrawal (code de la consommation, L221-18
 * and L221-19; regulation 1182/71): they start the day after the order and
 * end at the end of the 14th; one ending on a Saturday, a Sunday or a public
 * holiday goes to the next working day. A provisional reading (Q72).
 */
export function withdrawalEnds(orderedAt: Date): string {
  let day = addDays(parisDay(orderedAt), 14);
  for (;;) {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !holiday(day)) return day;
    day = addDays(day, 1);
  }
}

/**
 * When the advisor first gets in touch (SPEC 11, L1-40): at once when the
 * seller asked for an immediate start, otherwise the day after the end of
 * the withdrawal period (noon in Paris, a day to show).
 */
export function firstContactFrom(orderedAt: Date, earlyStart: boolean): Date | null {
  if (earlyStart) return null;
  return new Date(`${addDays(withdrawalEnds(orderedAt), 1)}T12:00:00+01:00`);
}
