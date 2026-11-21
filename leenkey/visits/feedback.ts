import { VISIT_INTERESTS, type VisitInterest } from "@/lib/validations/visit";
import type { Database } from "@/types/database";

// The feedback after a visit (L3-03, SPEC-V2 14): when a party may give it,
// and what the seller reads of the buyer's. Pure, unit-tested. The database
// decides (visit_feedback_buyer, visit_feedback_seller); this only chooses
// what the page shows. Never a score: the interest is shown as given
// (DECISIONS.md 2026-11-20).

type VisitStatus = Database["public"]["Enums"]["visit_status"];

/** A party writes its feedback until 7 days after the end of the visit. */
export const FEEDBACK_DAYS = 7;

/** A visit took place: not cancelled, its slot ended. */
export function visitTookPlace(
  status: VisitStatus,
  endsAt: string,
  now: Date = new Date(),
): boolean {
  return (status === "confirmed" || status === "done") && new Date(endsAt) <= now;
}

/** Until when the feedback of a visit is written or changed. */
export function feedbackDeadline(endsAt: string): Date {
  return new Date(new Date(endsAt).getTime() + FEEDBACK_DAYS * 86_400_000);
}

/**
 * `none`: no feedback about this visit (to come, cancelled); `open`: the form;
 * `closed`: 7 days have passed, what was written is read only.
 */
export type FeedbackWindow = "none" | "open" | "closed";

export function feedbackWindow(
  status: VisitStatus,
  endsAt: string,
  now: Date = new Date(),
): FeedbackWindow {
  if (!visitTookPlace(status, endsAt, now)) return "none";
  return feedbackDeadline(endsAt) > now ? "open" : "closed";
}

/** An interest from 1 to 5 as the database keeps it; null for anything else. */
export function interestOf(value: unknown): VisitInterest | null {
  return VISIT_INTERESTS.find((interest) => interest === value) ?? null;
}
