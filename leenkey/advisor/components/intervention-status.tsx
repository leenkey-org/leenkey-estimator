import { pillClassName } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import type { InterventionStatus } from "../interventions";

// Pastilles of docs/DESIGN.md 10.2, as the cases of the back office wear
// them: the label carries the meaning, never the colour alone.
const TONE: Record<InterventionStatus, string> = {
  requested: "bg-lk-warning-bg text-lk-warning-fg",
  scheduled: "bg-lk-blue-tint text-lk-blue-dark",
  done: "bg-lk-success-bg text-lk-success-fg",
  cancelled: "bg-lk-stone-2 text-lk-ink-3",
};

/** Where an intervention stands: « En attente », « Planifiée », « Faite », « Annulée ». */
export function InterventionStatusPill({
  status,
  label,
  className,
}: {
  status: InterventionStatus;
  /** The word of the viewer: « En attente » for the seller, « À traiter » for the team. */
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        pillClassName,
        "px-2.5 py-1.25 text-lk-micro font-semibold",
        TONE[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
