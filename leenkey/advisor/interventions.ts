import { firstContactFrom } from "@/leenkey/billing/orders";
import type { AdminInterventionFilter } from "@/lib/validations/advisor-intervention";
import type { Database } from "@/types/database";

// Interventions of the adviser (DECISIONS.md 2026-11-23), as plain values
// (unit-tested): the counter of a property and what the seller may do with
// it, the filters of the list of the team. The numbers come from the
// database (plans.advisor_interventions, advisor_intervention_summary):
// never from the name of a plan.

type Enums = Database["public"]["Enums"];

export type InterventionStatus = Enums["advisor_intervention_status"];
export type InterventionReasonCode = Enums["advisor_intervention_reason"];

/** Where a seller asks for an intervention on a property and reads their requests. */
export function interventionsHref(propertyId: string): string {
  return `/vendeur/biens/${propertyId}/intervention`;
}

/** The initial appointment of the plan in force: to plan, scheduled, done. */
export type InitialMeeting = "todo" | "scheduled" | "done";

export type InterventionSummary = {
  /** Interventions the plan in force sells for the property. */
  quota: number;
  /** Interventions done since the plan began (an upgrade keeps them). */
  used: number;
  /** Requests neither done nor cancelled yet. */
  pending: number;
  initialMeeting: InitialMeeting;
  /** The cheapest dearer plan on sale that sells more interventions, if any. */
  upgrade: { plan: Enums["plan_code"]; name: string; quota: number } | null;
};

/** A row of advisor_intervention_summary; its columns may be null. */
export type InterventionSummaryRow = {
  quota: number | null;
  used: number | null;
  pending: number | null;
  initial_meeting: InterventionStatus | null;
  next_plan: Enums["plan_code"] | null;
  next_plan_name: string | null;
  next_quota: number | null;
};

/** The counter of a property; null when its plan sells no intervention. */
export function toInterventionSummary(
  row: InterventionSummaryRow | undefined,
): InterventionSummary | null {
  if (!row || row.quota === null || row.quota <= 0) return null;
  const quota = row.quota;
  const upgrade =
    row.next_plan && row.next_plan_name && row.next_quota !== null && row.next_quota > quota
      ? { plan: row.next_plan, name: row.next_plan_name, quota: row.next_quota }
      : null;
  return {
    quota,
    used: Math.max(0, row.used ?? 0),
    pending: Math.max(0, row.pending ?? 0),
    initialMeeting:
      row.initial_meeting === "done"
        ? "done"
        : row.initial_meeting === "scheduled"
          ? "scheduled"
          : "todo",
    upgrade,
  };
}

/** Interventions still to use; never negative (the team may do one more as a gesture). */
export function interventionsLeft({ quota, used }: Pick<InterventionSummary, "quota" | "used">) {
  return Math.max(0, quota - used);
}

/**
 * What the seller may do: ask (« open »); wait, their requests already hold
 * the interventions left (« held »: an intervention counts once done, but a
 * request that waits holds one, so that there are never more requests than
 * interventions to give); or nothing more, the interventions of the plan are
 * used (« used »). Writing to the adviser never depends on it.
 */
export type InterventionAvailability = "open" | "held" | "used";

export function interventionAvailability({
  quota,
  used,
  pending,
}: Pick<InterventionSummary, "quota" | "used" | "pending">): InterventionAvailability {
  if (used >= quota) return "used";
  return used + pending >= quota ? "held" : "open";
}

export function canRequestIntervention(
  summary: Pick<InterventionSummary, "quota" | "used" | "pending">,
) {
  return interventionAvailability(summary) === "open";
}

/**
 * When the adviser starts, while they wait for the end of the withdrawal
 * period of a plan ordered without an immediate start (SPEC-V2 11): the same
 * day as the header of the conversation says (« Accompagnement à partir du
 * … »). Null once started, or with an immediate start: the delays of answer
 * apply.
 */
export function adviserStart(orderedAt: string | null, now: Date): Date | null {
  if (!orderedAt) return null;
  const from = firstContactFrom(new Date(orderedAt), false);
  return from && from.getTime() > now.getTime() ? from : null;
}

/** Share of the interventions used, 0 to 100, for the bar under the counter. */
export function interventionsUsedPercent({
  quota,
  used,
}: Pick<InterventionSummary, "quota" | "used">): number {
  if (quota <= 0) return 0;
  return Math.round((Math.min(used, quota) / quota) * 100);
}

/** What waits for the team: a request, or an intervention scheduled. */
export function isOpenIntervention(status: InterventionStatus): boolean {
  return status === "requested" || status === "scheduled";
}

export function matchesInterventionFilter(
  status: InterventionStatus,
  filter: AdminInterventionFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "open") return isOpenIntervention(status);
  return status === filter;
}

/** How many entries each filter of the list of the team shows. */
export function interventionFilterCounts(
  statuses: readonly InterventionStatus[],
): Record<AdminInterventionFilter, number> {
  return {
    open: statuses.filter(isOpenIntervention).length,
    done: statuses.filter((status) => status === "done").length,
    cancelled: statuses.filter((status) => status === "cancelled").length,
    all: statuses.length,
  };
}

/**
 * The actions the team may take on an entry: « Planifiée », « Faite »,
 * « Annulée », never the status it has already (a mistake is corrected by
 * choosing another one). An initial appointment not planned yet has no row:
 * it is scheduled or done, not cancelled; once cancelled, it is planned
 * again from the entry « À planifier » of its property, never from the
 * cancelled one (one initial appointment at a time).
 */
export function interventionActions(
  status: InterventionStatus,
  planned: boolean,
  initial = false,
): readonly Exclude<InterventionStatus, "requested">[] {
  if (!planned) return ["scheduled", "done"];
  if (initial && status === "cancelled") return [];
  return (["scheduled", "done", "cancelled"] as const).filter((action) => action !== status);
}
