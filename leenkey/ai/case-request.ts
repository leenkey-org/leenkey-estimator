// A request written by the person themselves (L1-31): the back office lists
// cases by their subject, so one is made of the first words of the request.

/** Longer, the subject is cut and ends with « … ». */
export const CASE_SUBJECT_FROM_TEXT_MAX = 80;

/** The subject of a request from its text: its first sentence, or its first words. */
export function caseSubject(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  const sentence = flat.split(/(?<=[.!?…])\s/)[0] ?? flat;
  // « Bonjour. » says nothing of the request: its first words then.
  const start = sentence.length >= 12 ? sentence : flat;
  if (start.length <= CASE_SUBJECT_FROM_TEXT_MAX) return start;
  return `${start.slice(0, CASE_SUBJECT_FROM_TEXT_MAX - 1).trimEnd()}…`;
}
