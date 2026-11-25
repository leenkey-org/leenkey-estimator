import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCreditNotes } from "@/core/billing/stripe";
import { frBilling } from "@/lib/i18n/sections/billing";
import type { Database } from "@/types/database";

// The credit note (« avoir ») of a refund of a plan (DECISIONS.md 2026-11-25,
// « Avoirs et remboursements »): after charge.refunded (webhook.ts) or again
// from /admin/remboursements (leenkey/admin/actions.ts) when it failed.
// Stripe creates it on the invoice of the order, linked to the refund
// already made, and emails it to the seller; credit_notes_record keeps it
// for /vendeur/formule and the back office. Always called with the service
// role client: the webhook's, or the admin action's after requireAdmin
// (CLAUDE.md section 14). Never throws: a failure is logged and told to the
// caller, the refund stays recorded.

type Client = SupabaseClient<Database>;

export type CreditNoteOutcome =
  | { status: "recorded"; created: number; total: number; pending: number }
  /** Not a plan of Leenkey, or its payment not recorded yet. */
  | { status: "unknown" }
  /** The order has no Stripe invoice: the credit note is made by hand. */
  | { status: "no_invoice" }
  | { status: "failed" };

export async function recordCreditNotes(
  supabase: Client,
  paymentIntentId: string,
  options: { mockRefundedCents?: number; actorId?: string } = {},
): Promise<CreditNoteOutcome> {
  try {
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("id, stripe_checkout_session_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`subscriptions: ${error.code}`);
    if (!subscription?.stripe_checkout_session_id) return { status: "unknown" };

    const result = await ensureCreditNotes({
      checkoutSessionId: subscription.stripe_checkout_session_id,
      paymentIntentId,
      memo: frBilling.creditNotes.memo,
      mockRefundedCents: options.mockRefundedCents,
    });
    if (result.status === "no_invoice") {
      console.warn("[billing] no invoice for the credit note", {
        entity_id: subscription.id,
      });
      return { status: "no_invoice" };
    }
    const { error: recordError } = await supabase.rpc("credit_notes_record", {
      p_payment_intent_id: paymentIntentId,
      p_notes: result.creditNotes.map((note) => ({
        id: note.id,
        number: note.number,
        amount_cents: note.amountCents,
        pdf_url: note.pdfUrl,
        issued_at: note.issuedAt,
      })),
      ...(options.actorId ? { p_actor: options.actorId } : {}),
    });
    if (recordError) throw new Error(`credit_notes_record: ${recordError.code}`);
    console.info("[billing] credit notes", {
      entity_id: subscription.id,
      created: result.created,
      total: result.creditNotes.length,
      pending: result.pending,
    });
    return {
      status: "recorded",
      created: result.created,
      total: result.creditNotes.length,
      pending: result.pending,
    };
  } catch (error) {
    console.error("[billing] credit note not created", {
      payment_intent: paymentIntentId,
      user_id: options.actorId ?? null,
      error: error instanceof Error ? error.message : String(error),
    });
    return { status: "failed" };
  }
}
