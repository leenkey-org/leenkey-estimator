// The greeting of a suggested reply (asked by Cédric on 2026-11-26,
// DECISIONS.md): « Bonjour » at the first message a seller writes to a buyer
// in a day, never again the same day. Whether the seller already wrote today
// is computed here, on the calendar of Paris, and said to the model in one
// line of the prompt (core/ai/prompts/reply-suggestion.md): the model does
// not have to guess it from the dates of the messages. Pure, unit-tested;
// read by the model of the tests too (leenkey/ai/mock.ts).

const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });

/** The day of a moment on the calendar of Paris, « 2026-11-26 ». */
export function parisDayOf(moment: Date | string): string {
  return parisDay.format(typeof moment === "string" ? new Date(moment) : moment);
}

/**
 * Whether the seller already wrote to the buyer today (in Paris): one of
 * their own messages is dated today. `sentAt`: when the seller wrote in the
 * conversation, any order; a date that is none counts for nothing.
 */
export function sellerWroteToday(sentAt: readonly string[], now: Date = new Date()): boolean {
  const today = parisDayOf(now);
  return sentAt.some((value) => {
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && parisDayOf(date) === today;
  });
}

/** The line of the prompt when the seller already wrote today. */
export const GREETING_FOLLOW_UP =
  "Le vendeur a déjà écrit à cet acquéreur aujourd'hui : ne commence pas par une salutation, poursuis la discussion.";

/** The line of the prompt at the first message of the day. */
export const GREETING_FIRST =
  "Premier message du vendeur à cet acquéreur aujourd'hui : commence par « Bonjour », suivi du prénom de l'acquéreur s'il est connu.";

export function greetingLine(wroteToday: boolean): string {
  return wroteToday ? GREETING_FOLLOW_UP : GREETING_FIRST;
}
