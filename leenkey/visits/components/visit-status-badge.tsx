import { pillClassName } from "@/components/shared/status-badge";
import { frVisits } from "@/lib/i18n/sections/visits";
import { cn } from "@/lib/utils";
import type { VisitStatus } from "../queries";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const tones = {
  confirmed: "bg-lk-success-bg text-lk-success-fg",
  cancelled: "bg-lk-stone-2 text-lk-ink-2",
  past: "bg-lk-stone-2 text-lk-ink-2",
} as const;

/** The status of a visit; a confirmed one whose time is past reads « Passée ». */
export function VisitStatusBadge({
  status,
  past = false,
  className,
}: {
  status: VisitStatus;
  past?: boolean;
  className?: string;
}) {
  const key =
    status === "cancelled" ? "cancelled" : past || status === "done" ? "past" : "confirmed";
  return (
    <span
      className={cn(
        pillClassName,
        "px-2.5 py-1.25 text-lk-micro font-semibold",
        tones[key],
        className,
      )}
    >
      {fr.visits.status[key]}
    </span>
  );
}
