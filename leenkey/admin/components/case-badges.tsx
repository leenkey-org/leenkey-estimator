import { pillClassName } from "@/components/shared/status-badge";
import { frAdminCases } from "@/lib/i18n/sections/adminCases";
import { frAdminReports } from "@/lib/i18n/sections/adminReports";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminCases: frAdminCases, adminReports: frAdminReports } as const;

// The status of a case or of a report and a payment to check (L1-30c), as the
// badges of DESIGN.md 10.2: a pill whose label carries the meaning, not the
// colour alone.

type CaseStatus = Database["public"]["Enums"]["case_status"];

const badge = cn(pillClassName, "px-2.5 py-1.25 text-lk-micro font-semibold");

const CASE_TONE: Record<CaseStatus, string> = {
  new: "bg-lk-blue-tint text-lk-blue-dark",
  in_progress: "bg-lk-warning-bg text-lk-warning-fg",
  closed: "bg-lk-stone-2 text-lk-ink-2",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span className={cn(badge, CASE_TONE[status], className)}>{fr.adminCases.status[status]}</span>
  );
}

/** « Paiement à vérifier »: a note Stripe wrote on the case (L1-26). */
export function CheckBadge({ className }: { className?: string }) {
  return (
    <span className={cn(badge, "bg-lk-danger-bg text-lk-danger-fg", className)}>
      {fr.adminCases.toCheck}
    </span>
  );
}

/** « Ouvert » (warning) or « Clos ». */
export function ReportStatusBadge({ closed, className }: { closed: boolean; className?: string }) {
  return (
    <span
      className={cn(
        badge,
        closed ? "bg-lk-stone-2 text-lk-ink-2" : "bg-lk-warning-bg text-lk-warning-fg",
        className,
      )}
    >
      {closed ? fr.adminCases.status.closed : fr.adminReports.detail.open}
    </span>
  );
}
