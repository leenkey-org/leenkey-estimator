import { CalendarCheck, CalendarClock, type LucideIcon } from "lucide-react";
import { frAdvisorInterventions } from "@/lib/i18n/sections/advisorInterventions";
import { cn } from "@/lib/utils";
import {
  interventionsUsedPercent,
  type InitialMeeting,
  type InterventionSummary,
} from "../interventions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { advisorInterventions: frAdvisorInterventions } as const;

const t = fr.advisorInterventions;

const INITIAL_ICON: Record<InitialMeeting, LucideIcon> = {
  todo: CalendarClock,
  scheduled: CalendarClock,
  done: CalendarCheck,
};

/**
 * The counter of the interventions of a property (DECISIONS.md 2026-11-23):
 * « 2 interventions utilisées sur 4 » over its bar (the sentence carries the
 * meaning, the bar is decoration), the requests that wait, and, apart, the
 * initial appointment of the plan (« Rendez-vous initial : à planifier »),
 * which is never counted.
 */
export function InterventionCounter({
  summary,
  className,
}: {
  summary: InterventionSummary;
  className?: string;
}) {
  const Icon = INITIAL_ICON[summary.initialMeeting];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-lk-title font-semibold text-lk-ink tabular">
            {t.counter(summary.used, summary.quota)}
          </p>
          {summary.pending > 0 ? (
            <p className="text-lk-caption text-lk-ink-3 tabular">{t.pending(summary.pending)}</p>
          ) : null}
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-lk-line">
          <div
            className="h-full rounded-full bg-linear-90 from-lk-brand-blue to-lk-brand-violet"
            style={{ width: `${interventionsUsedPercent(summary)}%` }}
          />
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-lk-secondary text-lk-ink-2">
        <Icon
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0",
            summary.initialMeeting === "done" ? "text-lk-success" : "text-lk-ink-3",
          )}
        />
        {t.initialMeeting[summary.initialMeeting]}
      </p>
    </div>
  );
}
