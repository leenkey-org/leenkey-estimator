import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
  DataTable,
  DataTableCell,
  DataTableHeader,
  DataTableRow,
  DataTableRowHeader,
} from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { pillClassName, StatusBadge } from "@/components/shared/status-badge";
import { requireAdmin } from "@/core/auth/session";
import { dashboardPaymentUrl } from "@/core/billing/stripe";
import { CreditNoteRetry } from "@/leenkey/admin/components/credit-note-retry";
import { RefundEmailResend } from "@/leenkey/admin/components/refund-email-resend";
import { adminMetadata } from "@/leenkey/admin/metadata";
import { adminRefunds, refundCounts, type AdminRefundRow } from "@/leenkey/admin/refunds/queries";
import {
  creditNoteState,
  leftOfPayment,
  leftOfWithdrawal,
  refundDeadline,
  refundLate,
  refundedOfPayment,
  refundStatus,
  type RefundStatus,
  waitsForRefund,
  withdrawalPending,
} from "@/leenkey/admin/refunds/status";
import { pendingRefundEmails } from "@/leenkey/billing/refund-emails";
import { legalDate } from "@/leenkey/billing/withdrawal";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatAmount } from "@/lib/format";
import { isProduction } from "@/lib/env";
import { frAdminRefunds } from "@/lib/i18n/sections/adminRefunds";
import { frPlan } from "@/lib/i18n/sections/plan";
import { cn } from "@/lib/utils";
import { AdminPage } from "../_components/admin-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminRefunds: frAdminRefunds, plan: frPlan } as const;

const t = fr.adminRefunds;

export const generateMetadata = adminMetadata({ title: t.metaTitle });

const COLUMNS = [t.table.seller, t.table.plan, t.table.amount, t.table.requested, t.table.status];

const TONE: Record<RefundStatus, string> = {
  to_refund: "bg-lk-warning-bg text-lk-warning-fg",
  late: "bg-lk-danger-bg text-lk-danger-fg",
  partial: "bg-lk-warning-bg text-lk-warning-fg",
  refunded: "bg-lk-success-bg text-lk-success-fg",
};

const badge = cn(pillClassName, "px-2.5 py-1.25 text-lk-micro font-semibold");

/**
 * The status in words (« Remboursé le 25 novembre 2026 »): the colour never
 * alone. A withdrawal with money left says « Rétractation – Remboursement en
 * attente » (Cédric, 2026-11-26), and « En retard » beside it past the 14 days.
 */
function StatusPill({ row, now }: { row: AdminRefundRow; now: Date }) {
  const status = refundStatus(row, now);
  const date = row.refundedAt ?? row.lastRefundAt;
  if (withdrawalPending(row, now)) {
    return (
      <span className="flex flex-wrap items-center gap-1.5 self-start">
        <span className={cn(badge, TONE.to_refund)}>{t.status.withdrawalPending}</span>
        {refundLate(row, now) ? (
          <span className={cn(badge, TONE.late)}>{t.status.late}</span>
        ) : null}
      </span>
    );
  }
  const label =
    status === "refunded" && date ? t.status.refundedOn(legalDate(date)) : t.status[status];
  return <span className={cn(badge, TONE[status], "self-start")}>{label}</span>;
}

/** « LK-0009 · Savigny-sur-Orge », the town of a property without a listing. */
const propertyOf = (row: AdminRefundRow) =>
  [row.reference, row.city].filter(Boolean).join(" · ") || t.noProperty;

/** « Rembourser dans Stripe » while money is owed, « Voir le paiement » after. */
function StripeLink({ row, now }: { row: AdminRefundRow; now: Date }) {
  if (!row.paymentIntentId) {
    return <span className="text-lk-caption text-lk-ink-3">{t.noPayment}</span>;
  }
  const owed = waitsForRefund(row, now);
  const who = `${row.sellerName ?? t.noSeller}, ${propertyOf(row)}`;
  return (
    <a
      href={dashboardPaymentUrl(row.paymentIntentId, isProduction())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={owed ? t.stripeLabel(who) : t.stripeSeenLabel(who)}
      className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-lk-secondary font-semibold text-lk-blue underline-offset-2 hover:underline"
    >
      {owed ? t.stripe : t.stripeSeen}
      <ExternalLink aria-hidden="true" className="size-3.5" />
    </a>
  );
}

/** `emailPending`: a credit note of this plan whose email to the seller did not leave. */
function CreditNoteCell({ row, emailPending }: { row: AdminRefundRow; emailPending: boolean }) {
  const state = creditNoteState(row);
  const notes = row.creditNotes.map((note) =>
    note.pdfUrl ? (
      <a
        key={note.number}
        href={note.pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.creditNote.openLabel(note.number)}
        className="inline-flex min-h-11 items-center font-semibold text-lk-blue underline-offset-2 hover:underline"
      >
        {t.creditNote.open(note.number)}
      </a>
    ) : (
      <span key={note.number} className="font-semibold text-lk-ink">
        {t.creditNote.open(note.number)}
      </span>
    ),
  );
  if (state !== "missing" && notes.length === 0 && !emailPending) return null;
  return (
    <div className="flex flex-col items-start gap-1 text-lk-secondary">
      {notes}
      {state === "missing" ? <CreditNoteRetry subscriptionId={row.subscriptionId} /> : null}
      {state !== "missing" && emailPending ? (
        <RefundEmailResend subscriptionId={row.subscriptionId} />
      ) : null}
    </div>
  );
}

/** The date of the request and, while money is owed, the deadline (in red once past). */
function RequestDates({
  row,
  now,
  short = false,
}: {
  row: AdminRefundRow;
  now: Date;
  /** The date alone, under the column « Demande ». */
  short?: boolean;
}) {
  if (!row.requestedAt) return <span className="text-lk-ink-3">{t.noRequest}</span>;
  const late = refundLate(row, now);
  return (
    <span className="flex flex-col">
      <span className="text-lk-ink-2">
        {short ? legalDate(row.requestedAt) : t.requestedOn(legalDate(row.requestedAt))}
      </span>
      {waitsForRefund(row, now) ? (
        <span
          className={cn(
            "text-lk-caption",
            late ? "font-semibold text-lk-danger-fg" : "text-lk-ink-3",
          )}
        >
          {t.deadlineOn(legalDate(refundDeadline(row.requestedAt)))}
        </span>
      ) : null}
    </span>
  );
}

/**
 * What is to refund: the amount paid, and what Stripe already refunded of it.
 * For a withdrawal (2026-11-26): what is due, refunded and left for this
 * payment; for a request of two payments, what is left of the whole; and the
 * plan the seller is back on.
 */
function Amount({ row }: { row: AdminRefundRow }) {
  if (!row.requestedAt) {
    return (
      <span className="flex flex-col">
        <span className="font-semibold text-lk-ink tabular">
          {formatAmount(row.amountPaidCents)}
        </span>
        {row.refundedCents > 0 && row.refundedCents < row.amountPaidCents ? (
          <span className="text-lk-caption text-lk-ink-3 tabular">
            {t.refundedAmount(formatAmount(row.refundedCents))}
          </span>
        ) : null}
      </span>
    );
  }
  const left = leftOfPayment(row);
  const requestLeft = leftOfWithdrawal(row);
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-lk-ink tabular">
        {t.due(formatAmount(row.amountPaidCents))}
      </span>
      <span className="text-lk-caption text-lk-ink-2 tabular">
        {t.refunded(formatAmount(refundedOfPayment(row)))}
      </span>
      <span
        className={cn(
          "text-lk-caption tabular",
          left > 0 ? "font-semibold text-lk-ink" : "text-lk-ink-2",
        )}
      >
        {t.left(formatAmount(left))}
      </span>
      {row.withdrawalDueCents !== null &&
      requestLeft !== null &&
      (row.withdrawalPayments ?? 1) > 1 ? (
        <span className="max-w-56 text-lk-caption text-lk-ink-3 tabular">
          {t.requestTotal(
            formatAmount(row.withdrawalDueCents),
            formatAmount(requestLeft),
            row.withdrawalPayments ?? 2,
          )}
        </span>
      ) : null}
      {row.backToPlan ? (
        <span className="max-w-56 text-lk-caption text-lk-ink-3">
          {t.backTo(fr.plan[row.backToPlan])}
        </span>
      ) : null}
    </span>
  );
}

// The refunds of the team (DECISIONS.md 2026-11-25, Cédric): the plans
// renounced by their seller (L1-40) and the plans refunded in Stripe, what
// is owed first by deadline (the request plus 14 days, code de la
// consommation L221-24), then the partial ones, then those refunded. The
// status follows the webhook (charge.refunded) by itself; the credit note
// too, or « Créer l'avoir » when its creation failed. The refund itself is
// made in Stripe (« Rembourser dans Stripe »). Cards below 1024 px, a
// DataTable from 1024 px (template G7). The page checks the admin role itself.
export default async function AdminRefundsPage() {
  await requireAdmin();
  const list = await adminRefunds();
  const now = new Date();
  // The credit notes whose email to the seller did not leave: « Renvoyer
  // l'email » (a read that fails shows none, the page stays usable).
  const pending = list.ok
    ? await pendingRefundEmails(list.data.map((row) => row.subscriptionId))
    : null;
  const unsent = new Set((pending ?? []).map((email) => email.subscriptionId));

  let content: ReactNode;
  if (!list.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={ROUTES.adminRefunds}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {t.retry}
          </Link>
        }
      >
        {t.error}
      </InlineAlert>
    );
  } else if (list.data.length === 0) {
    content = <EmptyState className="py-10" title={t.empty.title} description={t.empty.text} />;
  } else {
    const rows = list.data;
    content = (
      <>
        <ul aria-label={t.table.label} className="flex flex-col gap-3 lg:hidden">
          {rows.map((row) => (
            <li
              key={row.subscriptionId}
              className="flex flex-col gap-2 rounded-lk-md border border-lk-line bg-lk-surface p-4"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill row={row} now={now} />
                <StatusBadge plan={row.plan} />
              </div>
              <p className="text-lk-label font-semibold text-lk-ink">
                {row.sellerName ?? t.noSeller}
              </p>
              <p className="text-lk-caption text-lk-ink-3">{propertyOf(row)}</p>
              <Amount row={row} />
              {row.replacingPlan ? (
                <p className="text-lk-caption text-lk-ink-2">
                  {t.replacedBy(fr.plan[row.replacingPlan])}
                </p>
              ) : null}
              <p className="text-lk-caption">
                <RequestDates row={row} now={now} />
              </p>
              <CreditNoteCell row={row} emailPending={unsent.has(row.subscriptionId)} />
              <StripeLink row={row} now={now} />
            </li>
          ))}
        </ul>

        <DataTable label={t.table.label} className="hidden lg:block">
          <DataTableHeader columns={COLUMNS} />
          <tbody>
            {rows.map((row) => (
              <DataTableRow key={row.subscriptionId}>
                <DataTableRowHeader>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold text-lk-ink">
                      {row.sellerName ?? t.noSeller}
                    </span>
                    <span className="text-lk-caption text-lk-ink-3">{propertyOf(row)}</span>
                    <StripeLink row={row} now={now} />
                  </div>
                </DataTableRowHeader>
                <DataTableCell>
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge plan={row.plan} />
                    {row.replacingPlan ? (
                      <span className="max-w-48 text-lk-caption text-lk-ink-3">
                        {t.replacedBy(fr.plan[row.replacingPlan])}
                      </span>
                    ) : null}
                  </div>
                </DataTableCell>
                <DataTableCell>
                  <Amount row={row} />
                </DataTableCell>
                <DataTableCell>
                  <RequestDates row={row} now={now} short />
                </DataTableCell>
                <DataTableCell>
                  {/* The credit note under the status: seven columns do not fit beside the sidebar. */}
                  <div className="flex flex-col items-start gap-1.5">
                    <StatusPill row={row} now={now} />
                    <CreditNoteCell row={row} emailPending={unsent.has(row.subscriptionId)} />
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))}
          </tbody>
        </DataTable>
      </>
    );
  }

  const counts = list.ok ? refundCounts(list.data, now) : null;
  return (
    <AdminPage title={t.title}>
      {counts ? (
        <p className="text-lk-secondary text-lk-ink-3 md:-mt-4">
          {[
            counts.toRefund > 0
              ? [
                  t.summary.toRefund(counts.toRefund),
                  counts.late > 0 ? t.summary.late(counts.late) : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : t.summary.none,
            counts.creditNotesMissing > 0 ? t.summary.creditNotes(counts.creditNotesMissing) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      <p className="max-w-3xl text-lk-secondary text-lk-ink-2">{t.lead}</p>
      {content}
    </AdminPage>
  );
}
