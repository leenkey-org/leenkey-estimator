import { z } from "zod";

// Ordering a plan (L1-26, SPEC-V2 section 11): what the page sends to
// startCheckout, and what the webhook reads back in the metadata of the
// Checkout Session it receives.

const planCode = z.enum(["autonomie", "accompagne", "serenite"]);
const version = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** « J'ai lu et j'accepte les CGU et les CGV » must be ticked; the immediate start is free to choose. */
export const checkoutSchema = z.object({
  propertyId: z.string().uuid(),
  plan: planCode,
  acceptedTerms: z.literal(true),
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
});

export type CheckoutMetadata = z.infer<typeof checkoutMetadataSchema>;

/** The session of a return from Stripe (`?session_id=`), read to know whether it is active. */
export const sessionIdSchema = z.string().regex(/^cs_[A-Za-z0-9_]{1,200}$/);
