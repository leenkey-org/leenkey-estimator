import { z } from "zod";

// Interventions of the adviser (DECISIONS.md 2026-11-23): what a seller sends
// to ask for one, what the team sends to follow it; checked again by the
// database (advisor_intervention_request, admin_advisor_intervention_set,
// admin_advisor_initial_meeting).

/** The reasons a seller chooses from, in the order of the form. */
export const INTERVENTION_REASONS = [
  "price_strategy",
  "listing",
  "visits",
  "offer",
  "documents",
  "other",
] as const;

export type InterventionReason = (typeof INTERVENTION_REASONS)[number];

export const INTERVENTION_MESSAGE_MIN = 10;
export const INTERVENTION_MESSAGE_MAX = 2000;

/** « Demander une intervention »: a property, a reason, what the adviser should prepare. */
export const interventionRequestSchema = z.object({
  propertyId: z.string().uuid(),
  reason: z.enum(INTERVENTION_REASONS),
  message: z.string().trim().min(INTERVENTION_MESSAGE_MIN).max(INTERVENTION_MESSAGE_MAX),
});

export type InterventionRequestInput = z.infer<typeof interventionRequestSchema>;

/** The note of the team on an intervention (advisor_interventions.team_note). */
export const INTERVENTION_NOTE_MAX = 2000;

const note = z.string().trim().max(INTERVENTION_NOTE_MAX);

/**
 * An action of the team: the status of a request (« Planifiée », « Faite »,
 * « Annulée »), or the initial appointment of a property, which has no row
 * before it is scheduled or done.
 */
export const interventionCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("status"),
    interventionId: z.string().uuid(),
    status: z.enum(["scheduled", "done", "cancelled"]),
    note,
  }),
  z.object({
    action: z.literal("initial"),
    propertyId: z.string().uuid(),
    status: z.enum(["scheduled", "done"]),
    note,
  }),
]);

export type InterventionCommand = z.infer<typeof interventionCommandSchema>;

/** Filters of /admin/messages/interventions (without one: what waits for the team). */
export const ADMIN_INTERVENTION_FILTERS = [
  { filter: "done", param: "faites" },
  { filter: "cancelled", param: "annulees" },
  { filter: "all", param: "toutes" },
] as const;

export type AdminInterventionFilter =
  | "open"
  | (typeof ADMIN_INTERVENTION_FILTERS)[number]["filter"];

const INTERVENTIONS_PATH = "/admin/messages/interventions";

/** /admin/messages/interventions?statut=faites; anything unknown: what waits. */
export function parseAdminInterventionsQuery(
  params: Record<string, string | string[] | undefined>,
): AdminInterventionFilter {
  const value = Array.isArray(params.statut) ? params.statut[0] : params.statut;
  return ADMIN_INTERVENTION_FILTERS.find((entry) => entry.param === value)?.filter ?? "open";
}

export function adminInterventionsHref(filter: AdminInterventionFilter = "open"): string {
  const param = ADMIN_INTERVENTION_FILTERS.find((entry) => entry.filter === filter)?.param;
  return param ? `${INTERVENTIONS_PATH}?statut=${param}` : INTERVENTIONS_PATH;
}
