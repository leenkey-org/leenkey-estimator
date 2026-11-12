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

const DAY_MS = 24 * 60 * 60 * 1000;

/** The choice, or null when absent, malformed or older than six months (asked again). */
export function parseConsent(
  value: string | null | undefined,
  now: Date = new Date(),
): Consent | null {
  const match = value ? FORMAT.exec(value) : null;
  if (!match) return null;
  const day = Date.parse(`${match[2]}T00:00:00Z`);
  if (Number.isNaN(day) || now.getTime() - day > CONSENT_MAX_AGE * 1000 + DAY_MS) return null;
  return { analytics: match[1] === "1", date: match[2] };
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

/**
 * Script of the <head> (P-06), before the first paint:
 * - marks <html> with data-consent="set" when a valid choice is kept (the
 *   rule of parseConsent), so that the banner sent in the page by the server
 *   is hidden by CSS for a visitor who already chose, and shows at once for
 *   one who has not;
 * - marks it data-fonts="pending" until Sora is loaded (2.5 s at most): the
 *   banner, anchored at the bottom, grows by a line when Sora replaces the
 *   fallback font, which counts as a layout shift; it shows once the font
 *   is there. Without JavaScript, nothing is marked: the banner shows.
 */
export function consentHeadScript(): string {
  const maxMs = CONSENT_MAX_AGE * 1000 + DAY_MS;
  const pattern = String.raw`/(?:^|;\s*)${CONSENT_COOKIE}=v1\.[01]\.(\d{4}-\d{2}-\d{2})(?:;|$)/`;
  return [
    "(function(){var h=document.documentElement;",
    `try{var m=${pattern}.exec(document.cookie);if(m){var d=Date.parse(m[1]+"T00:00:00Z");if(!isNaN(d)&&Date.now()-d<=${maxMs})h.setAttribute("data-consent","set")}}catch(e){}`,
    'try{if(document.fonts&&document.fonts.ready){h.setAttribute("data-fonts","pending");',
    'var r=function(){h.setAttribute("data-fonts","ready")};document.fonts.ready.then(r,r);setTimeout(r,2500)}}catch(e){}',
    "})();",
  ].join("");
}

/** Day in Paris, « 2026-10-17 ». */
export function consentDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

/** Google Analytics cookies (« _ga », « _ga_<id> », « _gid »), to clear on withdrawal. */
export function isAnalyticsCookie(name: string): boolean {
  return name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_");
}
