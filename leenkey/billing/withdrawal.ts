import { parisDay, withdrawalEnds } from "./orders";

// The withdrawal of a plan (L1-40, SPEC-V2 section 11): how long the seller
// may renounce it, and the dates a legal text shows in full (« 8 novembre
// 2026 », never a weekday nor a year left out). The base refuses only far
// past the period (subscription_withdraw): the exact day is checked here.

const DATE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const TIME = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
});

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

/** « 8 novembre 2026 » (Paris). */
export function legalDate(value: Date | string): string {
  return DATE.format(toDate(value));
}

/** « 8 novembre 2026 à 14:05 » (Paris). */
export function legalDateTime(value: Date | string): string {
  const date = toDate(value);
  return `${DATE.format(date)} à ${TIME.format(date)}`;
}

/** The last day the seller may renounce, « YYYY-MM-DD », as a moment of that day. */
export function withdrawalLastDay(activatedAt: Date | string): Date {
  return new Date(`${withdrawalEnds(toDate(activatedAt))}T12:00:00Z`);
}

/** Whether the plan ordered at `activatedAt` may still be renounced at `now` (until the end of its last day, in Paris). */
export function canWithdraw(activatedAt: Date | string, now: Date = new Date()): boolean {
  return parisDay(now) <= withdrawalEnds(toDate(activatedAt));
}
