import { FileText } from "lucide-react";
import { InlineAlert } from "@/components/shared/inline-alert";
import { pillClassName } from "@/components/shared/status-badge";
import { formatAmount } from "@/lib/format";
import { frBilling } from "@/lib/i18n/sections/billing";
import { cn } from "@/lib/utils";
import { documentHref, PAYMENTS_ANCHOR, type PaymentStatus, type SellerPayment } from "../payments";
import { legalDate } from "../withdrawal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling } as const;

const t = fr.billing.payments;

const statusTone: Record<PaymentStatus, string> = {
  paid: "bg-lk-success-bg text-lk-success-fg",
  partly_refunded: "bg-lk-warning-bg text-lk-warning-fg",
  refunded: "bg-lk-stone-2 text-lk-ink-2",
};

const link =
  "inline-flex min-h-11 items-center text-lk-secondary font-semibold text-lk-blue underline-offset-2 hover:underline";

/**
 * « Mes factures et paiements » on /vendeur/formule (DECISIONS.md
 * 2026-11-26): every payment of the seller, most recent first: its date,
 * its plan and its property, its amount, whether it was refunded, its
 * invoice and the credit notes of its refunds, each a PDF of Stripe opened
 * through /vendeur/formule/document. `payments` null: they could not be
 * read (the rest of the page is shown all the same).
 */
export function Payments({
  payments,
  documentUnavailable = false,
}: {
  payments: readonly SellerPayment[] | null;
  /** A download just failed: the PDF is not drawn yet. */
  documentUnavailable?: boolean;
}) {
  return (
    <section
      id={PAYMENTS_ANCHOR}
      aria-labelledby="payments-title"
      className="flex scroll-mt-24 flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-5"
    >
      <h2 id="payments-title" className="text-lk-label font-semibold text-lk-ink">
        {t.title}
      </h2>
      {documentUnavailable ? (
        <InlineAlert tone="warning">{t.documentUnavailable}</InlineAlert>
      ) : null}
      {payments === null ? (
        <InlineAlert tone="danger">{t.error}</InlineAlert>
      ) : payments.length === 0 ? (
        <p className="text-lk-secondary text-lk-ink-2">{t.empty}</p>
      ) : (
        <>
          <p className="text-lk-secondary text-lk-ink-2">{t.text}</p>
          <ul className="flex flex-col">
            {payments.map((payment) => {
              const paidOn = legalDate(payment.paidAt);
              return (
                <li
                  key={payment.id}
                  className="flex flex-col gap-1 border-t border-lk-line py-4 first:border-t-0 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="text-lk-secondary font-semibold text-lk-ink">
                      {t.payment(payment.planName, payment.propertyName ?? t.unknownProperty)}
                    </p>
                    <span
                      className={cn(
                        pillClassName,
                        "px-2.5 py-1.25 text-lk-micro font-semibold",
                        statusTone[payment.status],
                      )}
                    >
                      {t.status[payment.status]}
                    </span>
                  </div>
                  <p className="tabular text-lk-secondary text-lk-ink-2">
                    {t.paidOn(paidOn)} · {formatAmount(payment.amountCents)}
                    {payment.status === "partly_refunded"
                      ? ` (${t.refunded(formatAmount(payment.refundedCents))})`
                      : null}
                  </p>
                  {payment.hasInvoice ? (
                    <a
                      href={documentHref("facture", payment.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.invoiceLabel(payment.planName, paidOn)}
                      className={cn(link, "gap-2 self-start")}
                    >
                      <FileText aria-hidden="true" className="size-4 shrink-0" />
                      {t.invoice}
                    </a>
                  ) : null}
                  {payment.creditNotes.length > 0 ? (
                    <ul className="flex flex-col">
                      {payment.creditNotes.map((note) => (
                        <li
                          key={note.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <span className="tabular text-lk-secondary text-lk-ink">
                            {t.creditNote(
                              note.number,
                              formatAmount(note.amountCents),
                              legalDate(note.issuedAt),
                            )}
                          </span>
                          {note.hasPdf ? (
                            <a
                              href={documentHref("avoir", note.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={t.creditNotePdfLabel(note.number)}
                              className={link}
                            >
                              {t.creditNotePdf}
                            </a>
                          ) : (
                            <span className="text-lk-caption text-lk-ink-3">{t.noPdf}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
