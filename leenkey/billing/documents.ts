import "server-only";
import { checkoutInvoice, downloadPdf } from "@/core/billing/stripe";
import type { EmailAttachment } from "@/core/notifications/email";
import { absoluteUrl } from "@/lib/site";
import { PAYMENTS_ANCHOR, type DocumentKind } from "./payments";

// The documents of a paid plan as Stripe draws them (Cédric, 2026-11-26;
// DECISIONS.md): the invoice of an order and the credit note of a refund,
// fetched on the server to be attached to the emails of Leenkey. Nothing
// here throws: an email is never lost for a PDF, it carries a link to
// « Mes factures et paiements » instead.

/** « Mes factures et paiements » on the page of the plans of a property. */
export function paymentsUrl(propertyId: string): string {
  return absoluteUrl(`/vendeur/formule?bien=${propertyId}#${PAYMENTS_ANCHOR}`);
}

/** « facture-leenkey-LK-0001.pdf »: letters, digits and dashes of the number only. */
export function pdfFilename(kind: DocumentKind, number: string | null): string {
  const safe = (number ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 60);
  return safe ? `${kind}-leenkey-${safe}.pdf` : `${kind}-leenkey.pdf`;
}

export function pdfAttachment(
  kind: DocumentKind,
  number: string | null,
  bytes: Buffer,
): EmailAttachment {
  return { filename: pdfFilename(kind, number), content: bytes.toString("base64") };
}

/**
 * Stripe creates the invoice of a Checkout Session once the payment is
 * made: it may not be finalized yet when checkout.session.completed
 * arrives. One budget of time for the whole (the webhook must answer
 * Stripe, and the email of the order leaves after this, with a link when
 * there is no PDF): the invoice is asked again every second while it has no
 * PDF, its PDF is downloaded once (a download that failed is not tried
 * again), and whatever is still running when the budget ends is left
 * behind. Never throws.
 */
export const INVOICE_BUDGET_MS = 6_000;
const INVOICE_PAUSE_MS = 1_000;

export async function orderInvoiceAttachment(
  checkoutSessionId: string,
  options: { budgetMs?: number; pauseMs?: number } = {},
): Promise<EmailAttachment | null> {
  const budgetMs = options.budgetMs ?? INVOICE_BUDGET_MS;
  const pauseMs = options.pauseMs ?? INVOICE_PAUSE_MS;
  const deadline = Date.now() + budgetMs;
  let reason = "no PDF yet";
  const work = (async (): Promise<EmailAttachment | null> => {
    for (;;) {
      const invoice = await checkoutInvoice(checkoutSessionId);
      if (invoice?.pdfUrl) {
        const left = deadline - Date.now();
        const bytes = left > 0 ? await downloadPdf(invoice.pdfUrl, { timeoutMs: left }) : null;
        if (!bytes) reason = "PDF not downloaded";
        return bytes ? pdfAttachment("facture", invoice.number, bytes) : null;
      }
      if (deadline - Date.now() <= pauseMs) return null;
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  })().catch((error: unknown) => {
    reason = error instanceof Error ? error.message : String(error);
    return null;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      reason = "out of time";
      resolve(null);
    }, budgetMs);
  });
  const attachment = await Promise.race([work, late]);
  clearTimeout(timer);
  if (!attachment) {
    console.warn("[billing] invoice not attached", { session: checkoutSessionId, reason });
  }
  return attachment;
}

/** The PDF of a credit note, from the address Stripe gave when it was created. */
export async function creditNoteAttachment(note: {
  number: string;
  pdfUrl: string | null;
}): Promise<EmailAttachment | null> {
  const bytes = await downloadPdf(note.pdfUrl);
  return bytes ? pdfAttachment("avoir", note.number, bytes) : null;
}
