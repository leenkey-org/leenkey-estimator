// Words written by a user (a first name, a message), put in an email sent by
// the platform (L1-22): the mail clients turn an address into a link
// (« www.… », « exemple.fr », « nom@exemple.fr »), which the application never
// does (messages in plain text, DECISIONS 2026-10-19). Such words stay out of
// the email: they are read in the application.

const LINK_LIKE =
  /(?:[a-z][a-z\d+.-]*:\/\/|www\.|[\p{L}\d._%+-]+@[\p{L}\d-]+\.|[\p{L}\d-]+\.[a-z]{2,}(?![\p{L}\d]))/iu;

/** Whether a mail client could make a link of these words. */
export function looksLikeLink(text: string): boolean {
  return LINK_LIKE.test(text);
}

/** The words, trimmed, when they can go in an email; null otherwise. */
export function emailSafeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && !looksLikeLink(text) ? text : null;
}
