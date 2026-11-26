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
 * arrives. Asked a few times, a second apart (the webhook stays short),
 * then the email leaves with a link.
 */
const INVOICE_TRIES = 3;
const INVOICE_PAUSE_MS = 1_000;

export async function orderInvoiceAttachment(
  checkoutSessionId: string,
  options: { tries?: number; pauseMs?: number } = {},
): Promise<EmailAttachment | null> {
  const tries = options.tries ?? INVOICE_TRIES;
  const pauseMs = options.pauseMs ?? INVOICE_PAUSE_MS;
  try {
    for (let attempt = 1; attempt <= tries; attempt += 1) {
      const invoice = await checkoutInvoice(checkoutSessionId);
      const bytes = invoice ? await downloadPdf(invoice.pdfUrl) : null;
      if (invoice && bytes) return pdfAttachment("facture", invoice.number, bytes);
      if (attempt < tries) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
    console.warn("[billing] invoice not attached: no PDF yet", { session: checkoutSessionId });
    return null;
  } catch (error) {
    console.error("[billing] invoice not attached", {
      session: checkoutSessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** The PDF of a credit note, from the address Stripe gave when it was created. */
export async function creditNoteAttachment(note: {
  number: string;
  pdfUrl: string | null;
}): Promise<EmailAttachment | null> {
  const bytes = await downloadPdf(note.pdfUrl);
  return bytes ? pdfAttachment("avoir", note.number, bytes) : null;
}
