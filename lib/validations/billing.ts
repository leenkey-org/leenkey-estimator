import { z } from "zod";

// Ordering a plan (L1-26, SPEC-V2 section 11): what the page sends to
// startCheckout, and what the webhook reads back in the metadata of the
// Checkout Session it receives.

const planCode = z.enum(["autonomie", "accompagne", "serenite"]);
const version = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * « J'ai lu et j'accepte les CGU et les CGV » must be ticked, with the
 * versions the page showed; the immediate start is free to choose.
 */
export const checkoutSchema = z.object({
  propertyId: z.string().uuid(),
  plan: planCode,
  acceptedTerms: z.literal(true),
  cguVersion: version,
  cgvVersion: version,
  earlyStart: z.boolean(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderKind = z.enum(["new", "upgrade"]);
export type OrderKind = z.infer<typeof orderKind>;

/** Strings only (Stripe metadata). */
export const checkoutMetadataSchema = z.object({
  property_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  plan: planCode,
  kind: orderKind,
  early_start: z.enum(["0", "1"]),
  accepted_at: z.string().datetime({ offset: true }),
  cgu_version: version,
  cgv_version: version,
  /** Where the order was made: local and preprod share the test mode of one Stripe account. */
  env: z.enum(["local", "staging", "production"]),
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

/** The session of a return from Stripe (`?session_id=`), read to know whether it is active. */
export const sessionIdSchema = z.string().regex(/^cs_[A-Za-z0-9_]{1,200}$/);

/** « Renoncer au contrat » (L1-40): the subscription the seller renounces. */
export const withdrawSchema = z.object({ subscriptionId: z.string().uuid() });

/** The answer of subscription_withdraw (supabase/migrations/20261108180000_plan_withdrawal_term.sql). */
export const withdrawalResultSchema = z.object({
  status: z.enum(["recorded", "already"]),
  requested_at: z.string(),
  plan_name: z.string().nullable(),
  reference: z.string().nullable(),
  activated_at: z.string(),
  amount_paid_cents: z.number().int(),
  early_start: z.boolean(),
  property_id: z.string().uuid(),
});
