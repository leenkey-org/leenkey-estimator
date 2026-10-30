import { pillClassName } from "./status-badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

export type FinancingStatus = Database["public"]["Enums"]["financing_status"];

// Colours of DESIGN.md 10.2 (FinancingBadge), labels of SPEC-V2 section 4,
// word for word: never « validé ».
const tone: Record<FinancingStatus, string> = {
  not_provided: "bg-lk-stone-2 text-lk-ink-2",
  declared: "bg-lk-warning-bg text-lk-warning-fg",
  document_provided: "bg-lk-blue-tint text-lk-blue",
  document_checked: "bg-lk-success-bg text-lk-success-fg",
};

/** Where the financing of a buyer stands: the label always carries the meaning. */
export function FinancingBadge({
  status,
  className,
}: {
  status: FinancingStatus;
  className?: string;
}) {
  return (
    <span className={cn(pillClassName, tone[status], className)}>{fr.financingStatus[status]}</span>
  );
}

/**
 * The mention due wherever a seller sees a financing status (SPEC-V2 section
 * 4): on a line, readable without a gesture, rather than in a tooltip.
 */
export function FinancingMention({ className }: { className?: string }) {
  return <p className={cn("text-lk-caption text-lk-ink-3", className)}>{fr.financingMention}</p>;
}
