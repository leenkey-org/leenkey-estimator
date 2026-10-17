// Cookie consent (L1-37, DECISIONS Q23): the visitor's choice for the
// optional trackers, kept six months in a first-party cookie. Only one
// optional category today: audience measurement (GA4 through GTM).
// « v1.1.2026-10-17 »: format version, audience measurement (1 accepted,
// 0 refused), day of the choice.

export const CONSENT_COOKIE = "lk_consent";
/** Six months: the choice is asked again afterwards (CNIL recommendation). */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 182;

/** Event that reopens the preferences (« Gérer mes cookies » links). */
export const CONSENT_OPEN_EVENT = "lk:cookies";

export type Consent = { analytics: boolean; date: string };

const FORMAT = /^v1\.([01])\.(\d{4}-\d{2}-\d{2})$/;

export function parseConsent(value: string | null | undefined): Consent | null {
  const match = value ? FORMAT.exec(value) : null;
  return match ? { analytics: match[1] === "1", date: match[2] } : null;
}

export function serializeConsent(consent: Consent): string {
  return `v1.${consent.analytics ? 1 : 0}.${consent.date}`;
}

/** Value of a cookie in a `document.cookie` string. */
export function cookieValue(cookies: string, name: string): string | undefined {
  const prefix = `${name}=`;
  return cookies
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length);
}

/** Day in Paris, « 2026-10-17 ». */
export function consentDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

/** Google Analytics cookies (« _ga », « _ga_<id> », « _gid »), to clear on withdrawal. */
export function isAnalyticsCookie(name: string): boolean {
  return name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_");
}
