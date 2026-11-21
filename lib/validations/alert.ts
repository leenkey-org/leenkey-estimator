import { z } from "zod";
import { SearchFilters } from "./search";

// L3-06 (SPEC-V2 16): a buyer alert is a search kept under a name. Its
// criteria are the stored form of SearchFilters (lib/validations/search.ts,
// amounts in cents), the same the search page reads from its address; an
// alert without any criterion would match every listing: refused.

export const ALERTS_MAX = 5;
export const ALERT_NAME_MAX = 80;

export const alertNameSchema = z.string().trim().min(1).max(ALERT_NAME_MAX);

/** At least one criterion: the commune, a type, a budget… */
export function hasCriterion(filters: SearchFilters): boolean {
  return Object.values(filters).some((value) => value !== undefined);
}

export const alertCriteriaSchema = SearchFilters.refine(hasCriterion, {
  message: "an alert needs a criterion",
});

export const createAlertSchema = z.object({
  name: alertNameSchema,
  criteria: alertCriteriaSchema,
});

export const renameAlertSchema = z.object({ id: z.string().uuid(), name: alertNameSchema });
export const alertActiveSchema = z.object({ id: z.string().uuid(), active: z.boolean() });
export const alertIdSchema = z.string().uuid();

/** The criteria of an alert as stored; null when they are no longer a search the site knows. */
export function readAlertCriteria(value: unknown): SearchFilters | null {
  const parsed = alertCriteriaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The name proposed for an alert: its criteria on one line, cut at 80 characters. */
export function defaultAlertName(summary: readonly string[]): string {
  const name = summary.join(" · ").trim();
  return name.length > ALERT_NAME_MAX ? `${name.slice(0, ALERT_NAME_MAX - 1).trimEnd()}…` : name;
}
