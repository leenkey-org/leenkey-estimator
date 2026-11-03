import type { PlanView } from "@/core/billing/plan-text";
import type { CheckoutMetadata, OrderKind } from "@/lib/validations/billing";
import type { Database } from "@/types/database";

// What a seller may order for a property, as plain values (unit-tested):
// a plan bought on Autonomie, or the passage from one paid plan to a dearer
// one; never a plan lower than the one in force (SPEC-V2 8.8). The amounts
// come from the plans table, the Stripe prices from the environment (their
// ids change from one Stripe account to the other), and the price Stripe
// holds must be the amount of the table, or nothing is ordered.

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

/**
 * The Stripe price of an order (variables STRIPE_PRICE_*, CLAUDE.md section
 * 4): a paid plan bought, or the passage Accompagné → Sérénité, the one
 * upgrade on sale (SPEC 11). Null when not configured.
 */
export function priceIdFor(
  target: PlanCode,
  kind: OrderKind,
  env: Partial<Record<string, string | undefined>> = process.env,
): string | null {
  const name =
    kind === "upgrade"
      ? target === "serenite"
        ? "STRIPE_PRICE_UPGRADE"
        : null
      : target === "accompagne"
        ? "STRIPE_PRICE_ACCOMPAGNE"
        : target === "serenite"
          ? "STRIPE_PRICE_SERENITE"
          : null;
  const value = name ? env[name]?.trim() : undefined;
  return value ? value : null;
}

/** The price Stripe holds is the amount of the order: one-off, in euros, active. */
export function priceMatches(
  price: { unitAmount: number | null; currency: string; active: boolean; recurring: boolean },
  amountCents: number,
): boolean {
  return (
    price.active &&
    !price.recurring &&
    price.currency.toLowerCase() === "eur" &&
    price.unitAmount === amountCents
  );
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
  };
}

/**
 * When the advisor first gets in touch (SPEC 11, L1-40): at once when the
 * seller asked for an immediate start, otherwise once the 14 days of
 * withdrawal are over, from the 15th day.
 */
export function firstContactFrom(activatedAt: Date, earlyStart: boolean): Date | null {
  if (earlyStart) return null;
  const date = new Date(activatedAt);
  date.setUTCDate(date.getUTCDate() + 14);
  return date;
}
