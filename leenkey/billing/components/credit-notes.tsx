import { FileText } from "lucide-react";
import { formatAmount } from "@/lib/format";
import { frBilling } from "@/lib/i18n/sections/billing";
import { legalDate } from "../withdrawal";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { billing: frBilling } as const;

const t = fr.billing.creditNotes;

export type SellerCreditNote = {
  id: string;
  number: string;
  amountCents: number;
  pdfUrl: string | null;
  issuedAt: string;
};

/**
 * « Vos avoirs » on /vendeur/formule (DECISIONS.md 2026-11-25): the credit
 * notes of the refunds of the plans of the property, each with its PDF
 * (Stripe emails it too). Nothing without one.
 */
export function CreditNotes({ notes }: { notes: readonly SellerCreditNote[] }) {
  if (notes.length === 0) return null;
  return (
    <section
      aria-labelledby="credit-notes-title"
      className="flex flex-col gap-3 rounded-lk-md border border-lk-line bg-lk-surface p-4 md:p-5"
    >
      <h2 id="credit-notes-title" className="text-lk-label font-semibold text-lk-ink">
        {t.title}
      </h2>
      <p className="text-lk-secondary text-lk-ink-2">{t.text}</p>
      <ul className="flex flex-col">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex flex-col gap-1 border-t border-lk-line py-3 first:border-t-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="flex items-center gap-2 text-lk-secondary text-lk-ink">
              <FileText aria-hidden="true" className="size-4 shrink-0 text-lk-ink-3" />
              <span className="tabular">
                {t.item(note.number, formatAmount(note.amountCents), legalDate(note.issuedAt))}
              </span>
            </span>
            {note.pdfUrl ? (
              <a
                href={note.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.pdfLabel(note.number)}
                className="inline-flex min-h-11 items-center text-lk-secondary font-semibold text-lk-blue underline-offset-2 hover:underline"
              >
                {t.pdf}
              </a>
            ) : (
              <span className="text-lk-caption text-lk-ink-3">{t.noPdf}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
