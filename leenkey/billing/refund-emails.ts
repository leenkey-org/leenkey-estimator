import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { creditNoteAttachment } from "./documents";
import { emailPlanRefunded } from "./emails";

// The confirmation of a refund to the seller, with its credit note (Cédric,
// 2026-11-26; DECISIONS.md): one email per credit note, hence per refund (a
// plan and the passage that followed it are two payments, two refunds, two
// credit notes, two emails). Called by recordCreditNotes once the credit
// notes are recorded, and by « Renvoyer l'email » of the back office
// (leenkey/admin/actions.ts), with a service role client (the webhook's, or
// the admin action's after its own check): the address of the seller is
// read from their account, a charge.refunded carries none we can trust.
//
// Once only, and never lost:
// - credit_note_email_claim takes the email of a credit note for one caller,
//   for 10 minutes (a second delivery of the webhook at the same time finds
//   it taken); a caller that died leaves a stale claim, taken back by the
//   next pass;
// - credit_note_email_sent, once the mail service took the email: final;
// - credit_note_email_release when it could not be handed over, for the
//   next pass (another delivery, the back office).
// The key given to the mail service says whether the PDF is attached
// (emails.ts, refundEmailKey): the same email asked twice leaves once.
// Never throws: the refund and its credit note stay recorded whatever
// happens here.

type Client = SupabaseClient<Database>;

/** What a pass did: emails handed to the mail service, emails that could not leave. */
export type RefundEmails = { sent: number; failed: number };

export const NO_REFUND_EMAILS: RefundEmails = { sent: 0, failed: 0 };

export async function emailCreditNotes(
  supabase: Client,
  subscriptionId: string,
): Promise<RefundEmails> {
  const summary: RefundEmails = { sent: 0, failed: 0 };
  try {
    const { data: notes, error } = await supabase
      .from("credit_notes")
      .select("id, stripe_credit_note_id, number, amount_cents, pdf_url, issued_at")
      .eq("subscription_id", subscriptionId)
      .is("refund_emailed_at", null)
      .order("issued_at", { ascending: true });
    if (error) throw new Error(`credit_notes: ${error.code}`);
    if (!notes || notes.length === 0) return summary;

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id, owner_id, property_id, plan, withdrawal_requested_at")
      .eq("id", subscriptionId)
      .maybeSingle();
    if (subscriptionError) throw new Error(`subscriptions: ${subscriptionError.code}`);
    if (!subscription) return summary;

    const [plan, listing, property, profile, account] = await Promise.all([
      supabase.from("plans").select("name").eq("code", subscription.plan).maybeSingle(),
      supabase
        .from("listings")
        .select("reference")
        .eq("property_id", subscription.property_id)
        .maybeSingle(),
      supabase.from("properties").select("city").eq("id", subscription.property_id).maybeSingle(),
      supabase.from("profiles").select("first_name").eq("id", subscription.owner_id).maybeSingle(),
      supabase.auth.admin.getUserById(subscription.owner_id),
    ]);
    const sellerEmail = account.data?.user?.email ?? null;
    if (!sellerEmail) {
      // An account deleted since: nobody to write to, the credit notes stay to send.
      console.warn("[billing] refund email: no address", { entity_id: subscriptionId });
      return summary;
    }

    for (const note of notes) {
      const { data: claimed, error: claimError } = await supabase.rpc("credit_note_email_claim", {
        p_credit_note_id: note.id,
      });
      if (claimError) throw new Error(`credit_note_email_claim: ${claimError.code}`);
      if (claimed !== true) continue;
      const attachment = await creditNoteAttachment({ number: note.number, pdfUrl: note.pdf_url });
      const delivery = await emailPlanRefunded(
        {
          sellerEmail,
          sellerFirstName: profile.data?.first_name ?? null,
          planName: plan.data?.name ?? subscription.plan,
          property: listing.data?.reference ?? property.data?.city ?? "",
          propertyId: subscription.property_id,
          amountCents: note.amount_cents,
          issuedAt: note.issued_at,
          withdrawnAt: subscription.withdrawal_requested_at,
          creditNote: { stripeId: note.stripe_credit_note_id, number: note.number },
        },
        attachment,
      );
      if (delivery === "failed") {
        summary.failed += 1;
        const { error: releaseError } = await supabase.rpc("credit_note_email_release", {
          p_credit_note_id: note.id,
        });
        console.error("[billing] refund email not sent", {
          entity_id: subscriptionId,
          credit_note: note.stripe_credit_note_id,
          released: !releaseError,
        });
        continue;
      }
      summary.sent += 1;
      const { error: sentError } = await supabase.rpc("credit_note_email_sent", {
        p_credit_note_id: note.id,
      });
      if (sentError) {
        // Left, not marked: the claim goes stale and the next pass asks the
        // mail service again, which sends nothing twice under the same key
        // for a day.
        console.error("[billing] refund email sent, not marked", {
          entity_id: subscriptionId,
          credit_note: note.stripe_credit_note_id,
          code: sentError.code,
        });
      }
      console.info("[billing] refund email", {
        entity_id: subscriptionId,
        credit_note: note.stripe_credit_note_id,
        delivery,
        attached: attachment !== null,
      });
    }
    return summary;
  } catch (error) {
    console.error("[billing] refund emails failed", {
      entity_id: subscriptionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return summary;
  }
}

/** A credit note whose confirmation of refund has not left yet. */
export type PendingRefundEmail = {
  subscriptionId: string;
  creditNoteId: string;
  /** « LK-0001-CN-01 » */
  number: string;
  amountCents: number;
  issuedAt: string;
};

/**
 * For the back office (/admin/remboursements): among these plans, the
 * credit notes whose email to the seller is still to send (it failed, or
 * its sender died), oldest first. Read with the session of the caller: the
 * RLS of credit_notes gives every row to the team, and to a seller their
 * own only. null when the read failed.
 */
export async function pendingRefundEmails(
  subscriptionIds: readonly string[],
): Promise<PendingRefundEmail[] | null> {
  if (subscriptionIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("credit_notes")
    .select("id, subscription_id, number, amount_cents, issued_at")
    .in("subscription_id", [...subscriptionIds])
    .is("refund_emailed_at", null)
    .order("issued_at", { ascending: true });
  if (error) {
    console.error("[billing] pending refund emails read failed", { code: error.code });
    return null;
  }
  return data.map((note) => ({
    subscriptionId: note.subscription_id,
    creditNoteId: note.id,
    number: note.number,
    amountCents: note.amount_cents,
    issuedAt: note.issued_at,
  }));
}
