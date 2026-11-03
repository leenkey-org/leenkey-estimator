import { verifyWebhook } from "@/core/billing/stripe";
import { handleStripeEvent } from "@/leenkey/billing/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhook (SPEC-V2 section 11, CLAUDE.md section 11): the raw body
// and its signature (STRIPE_WEBHOOK_SECRET), then leenkey/billing/webhook.ts.
// Listened to: checkout.session.completed, charge.refunded. Out of the
// password of the preprod (middleware.ts): Stripe has its own signature.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  let event;
  try {
    event = verifyWebhook(payload, request.headers.get("stripe-signature"));
  } catch (error) {
    console.warn("[billing] webhook refused", {
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }
  try {
    const result = await handleStripeEvent(event, createAdminClient());
    return Response.json({ received: true, outcome: result.outcome }, { status: result.status });
  } catch (error) {
    console.error("[billing] webhook failed", {
      event_id: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
