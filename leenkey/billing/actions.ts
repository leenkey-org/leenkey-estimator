"use server";

import { randomUUID } from "node:crypto";
import { activePlans } from "@/core/billing/plans";
import { createCheckoutSession, retrievePrice, stripeConfigured } from "@/core/billing/stripe";
import { getProfile, getUser } from "@/core/auth/session";
import { paidPlansOrderable, SALES_TERMS } from "@/lib/config/sales";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { absoluteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, sessionIdSchema } from "@/lib/validations/billing";
import type { Database } from "@/types/database";
import { checkoutMetadata, planChoice, priceIdFor, priceMatches } from "./orders";

type PlanCode = Database["public"]["Enums"]["plan_code"];

// Ordering a plan for a property (L1-26, SPEC-V2 section 11): the checks,
// then the Checkout Session of Stripe, where the browser goes. Nothing is
// activated here: the webhook does it once Stripe confirms the payment
// (leenkey/billing/webhook.ts). No revalidatePath: the page goes to Stripe,
// and comes back with its own request.

export type StartCheckoutError =
  | "session"
  | "invalid"
  | "not_found"
  | "sold"
  | "current"
  | "lower"
  | "closed"
  | "unavailable";

export type StartCheckoutResult =
  | { ok: true; data: { url: string } }
  | { ok: false; error: StartCheckoutError };

function refuse(
  error: StartCheckoutError,
  context: Record<string, unknown> = {},
): StartCheckoutResult {
  if (error === "unavailable") console.error("[billing] checkout not started", context);
  return { ok: false, error };
}

export async function startCheckout(input: unknown): Promise<StartCheckoutResult> {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  if (!user || !profile) return refuse("session");
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid");
  const { propertyId, plan, earlyStart } = parsed.data;
  if (!paidPlansOrderable()) return refuse("closed");
  const context = { user_id: profile.id, entity_id: propertyId, plan };
  if (!stripeConfigured()) return refuse("unavailable", { ...context, reason: "no key" });

  const supabase = await createClient();
  const [active, property, progress, plans] = await Promise.all([
    // A suspended account no longer writes (is_active_user(), L1-03): nor orders.
    supabase.rpc("is_active_user"),
    supabase
      .from("properties")
      .select("id, listing:listings(status)")
      .eq("id", propertyId)
      .eq("owner_id", profile.id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("sale_progress").select("plan").eq("property_id", propertyId).maybeSingle(),
    activePlans(),
  ]);
  if (active.error || property.error || progress.error || !plans) {
    return refuse("unavailable", { ...context, reason: "read" });
  }
  if (active.data !== true) return refuse("session");
  if (!property.data) return refuse("not_found");
  const listing = Array.isArray(property.data.listing)
    ? property.data.listing[0]
    : property.data.listing;
  if (listing?.status === "sold") return refuse("sold");

  const choice = planChoice(plans, progress.data?.plan ?? "autonomie", plan);
  if (choice.status === "current") return refuse("current");
  if (choice.status !== "order") return refuse("lower");
  const priceId = priceIdFor(plan, choice.kind);
  if (!priceId) return refuse("unavailable", { ...context, reason: "no price", kind: choice.kind });
  // The price Stripe holds must be the amount of the plans table (never from the code).
  try {
    const price = await retrievePrice(priceId);
    if (!priceMatches(price, choice.amountCents)) {
      return refuse("unavailable", {
        ...context,
        reason: "price mismatch",
        stripe_amount: price.unitAmount,
        expected: choice.amountCents,
      });
    }
  } catch (error) {
    return refuse("unavailable", { ...context, reason: "price", error: String(error) });
  }
  if (!user.email) return refuse("unavailable", { ...context, reason: "no email" });

  const back = `/vendeur/formule?bien=${propertyId}`;
  try {
    const session = await createCheckoutSession({
      priceId,
      customerEmail: user.email,
      metadata: checkoutMetadata({
        propertyId,
        ownerId: profile.id,
        plan,
        kind: choice.kind,
        earlyStart,
        acceptedAt: new Date(),
        cguVersion: LEGAL_VERSIONS.cgu,
        cgvVersion: SALES_TERMS.cgvVersion,
      }),
      clientReferenceId: propertyId,
      successUrl: absoluteUrl(`${back}&paiement=ok&session_id={CHECKOUT_SESSION_ID}`),
      cancelUrl: absoluteUrl(`${back}&paiement=annule`),
      idempotencyKey: randomUUID(),
    });
    return { ok: true, data: { url: session.url } };
  } catch (error) {
    return refuse("unavailable", { ...context, reason: "session", error: String(error) });
  }
}

export type CheckoutStatus =
  | {
      ok: true;
      data:
        | { active: false }
        | { active: true; plan: PlanCode; earlyStart: boolean; activatedAt: string };
    }
  | { ok: false; error: "invalid" | "unavailable" };

/**
 * Whether the payment of a session is recorded (the return from Stripe polls
 * it every 2 s, 30 s at most): its subscription, read with the seller's
 * session, exists.
 */
export async function checkoutStatus(sessionId: unknown): Promise<CheckoutStatus> {
  const parsed = sessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, activated_at, early_start_requested_at")
    .eq("stripe_checkout_session_id", parsed.data)
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (error) {
    console.error("[billing] checkout status failed", { user_id: profile.id, code: error.code });
    return { ok: false, error: "unavailable" };
  }
  if (!data) return { ok: true, data: { active: false } };
  return {
    ok: true,
    data: {
      active: true,
      plan: data.plan,
      earlyStart: data.early_start_requested_at !== null,
      activatedAt: data.activated_at,
    },
  };
}
