import "server-only";
import type { OrderKind } from "@/lib/validations/billing";
import type { Database } from "@/types/database";

// The Stripe price of an order (variables STRIPE_PRICE_*, CLAUDE.md section
// 4), on the server only: their ids change from one Stripe account to the
// other, and the price Stripe holds must be the amount of the plans table.

type PlanCode = Database["public"]["Enums"]["plan_code"];

/**
 * A paid plan bought, or the passage Accompagné → Sérénité, the one upgrade
 * on sale (SPEC 11). Null when not configured.
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
