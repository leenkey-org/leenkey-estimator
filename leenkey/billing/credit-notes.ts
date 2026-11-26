import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCreditNotes } from "@/core/billing/stripe";
import { VAT_EXEMPTION_NOTICE } from "@/lib/config/sales";
import type { Database } from "@/types/database";
import { emailCreditNotes } from "./refund-emails";

// The credit note (« avoir ») of a refund of a plan (DECISIONS.md 2026-11-25,
// « Avoirs et remboursements »): after charge.refunded (webhook.ts) or again
// from /admin/remboursements (leenkey/admin/actions.ts) when it failed.
// Stripe creates it on the invoice of the order, linked to the refund
// already made; credit_notes_record keeps it for /vendeur/formule and the
// back office, and a credit note voided in Stripe since is forgotten. Then
// the seller gets the confirmation of the refund with the credit note
// (refund-emails.ts, once per credit note; Cédric, 2026-11-26). Always called with the service role client:
// the webhook's, or the admin action's once getProfile() has given an
// account with the admin role (retryCreditNote, CLAUDE.md section 14).
// Never throws: a failure is logged and told to the caller, the refund
// stays recorded.

/**
 * Printed on the credit note by Stripe (its memo), in place of the reason
 * of Stripe (« Modification de commande », a closed list): why the refund
 * (Cédric, 2026-11-26), then the VAT exemption notice the invoice carries
 * in its footer. Constants of the code, not texts of the interface: the
 * memo is a parameter of the idempotent creation (one key per refund),
 * which must not change from one call to the next. It is chosen from
 * `withdrawal_requested_at`, which is written before the refund and never
 * erased.
 */
export const CREDIT_NOTE_MEMO_WITHDRAWAL =
  "Remboursement suite à l'exercice du droit de rétractation";
export const CREDIT_NOTE_MEMO_REFUND = "Remboursement";

export function creditNoteMemo(withdrawn: boolean): string {
  return `${withdrawn ? CREDIT_NOTE_MEMO_WITHDRAWAL : CREDIT_NOTE_MEMO_REFUND}. ${VAT_EXEMPTION_NOTICE}`;
}

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
      .select("id, stripe_checkout_session_id, withdrawal_requested_at")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`subscriptions: ${error.code}`);
    if (!subscription?.stripe_checkout_session_id) return { status: "unknown" };

    const result = await ensureCreditNotes({
      checkoutSessionId: subscription.stripe_checkout_session_id,
      paymentIntentId,
      memo: creditNoteMemo(subscription.withdrawal_requested_at !== null),
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
    if (result.voidIds.length > 0) {
      // Voided in Stripe: neither the seller nor the team sees it any more.
      const { error: voidError } = await supabase
        .from("credit_notes")
        .delete()
        .in("stripe_credit_note_id", result.voidIds);
      if (voidError) throw new Error(`credit_notes void: ${voidError.code}`);
    }
    // Once recorded: the confirmation of the refund to the seller, with the
    // credit note. Never throws, never fails what was just recorded.
    const emails = await emailCreditNotes(supabase, subscription.id);
    console.info("[billing] credit notes", {
      entity_id: subscription.id,
      created: result.created,
      total: result.creditNotes.length,
      pending: result.pending,
      voided: result.voidIds.length,
      emails,
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
