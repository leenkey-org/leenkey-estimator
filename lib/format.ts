import { fr } from "@/lib/i18n/fr";

// Number and date formatting for the interface (docs/DESIGN.md section 3.3).
// Amounts arrive in cents (CLAUDE.md section 9); dates are stored in UTC and
// shown in Europe/Paris. Intl handles the time zone natively, so no date
// library is needed for these display formats.

/** Narrow no-break space (U+202F): thousands separator and before € or m². */
export const NNBSP = "\u202F";
/** No-break space (U+00A0): keeps a number and its word together. */
export const NBSP = "\u00A0";

const TIME_ZONE = "Europe/Paris";
const LOCALE = "fr-FR";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

// ICU versions differ on the grouping space (U+202F or U+00A0): normalise so
// that the server and the browser render exactly the same string.
function normaliseSpaces(value: string): string {
  return value.replace(/[\s\u00A0\u202F]/g, NNBSP);
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  const format =
    maximumFractionDigits === 0
      ? integerFormat
      : new Intl.NumberFormat(LOCALE, { maximumFractionDigits });
  return normaliseSpaces(format.format(value));
}

/** « 350 000 € » from cents, rounded to the euro. */
export function formatPrice(cents: number): string {
  return `${formatNumber(Math.round(cents / 100))}${NNBSP}€`;
}

/** Map markers and filter chips: « 350 k€ », « 1,25 M€ ». */
export function formatPriceShort(cents: number): string {
  const euros = Math.round(cents / 100);
  if (euros >= 999_500) {
    return `${formatNumber(euros / 1_000_000, 2)}${NNBSP}M€`;
  }
  if (euros >= 1_000) {
    return `${formatNumber(Math.round(euros / 1_000))}${NNBSP}k€`;
  }
  return formatPrice(cents);
}

/** « 68 m² », one decimal at most (« 68,5 m² »). */
export function formatSurface(squareMetres: number, maximumFractionDigits = 1): string {
  return `${formatNumber(squareMetres, maximumFractionDigits)}${NNBSP}m²`;
}

/** « 5 147 € / m² ». */
export function formatPricePerSquareMetre(cents: number, squareMetres: number): string {
  const euros = Math.round(cents / 100 / squareMetres);
  return `${formatNumber(euros)}${NNBSP}€${NBSP}/${NBSP}m²`;
}

/** « 3 pièces » in titles, « 3 p » in compact cards only. */
export function formatRooms(rooms: number, style: "long" | "short" = "long"): string {
  if (style === "short") return `${rooms}${NBSP}${fr.format.roomsShort}`;
  return `${rooms}${NBSP}${rooms > 1 ? fr.format.rooms : fr.format.room}`;
}

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function parisParts(date: Date) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Calendar day number in Paris, to count days independently of the hour. */
function parisDayNumber(date: Date): number {
  const { year, month, day } = parisParts(date);
  return Math.round(Date.UTC(year, month - 1, day) / DAY);
}

function sameParisYear(a: Date, b: Date): boolean {
  return parisParts(a).year === parisParts(b).year;
}

/** « mardi 22 septembre » (the year is added when it is not the current one). */
export function formatDate(value: DateInput, now: DateInput = new Date()): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: sameParisYear(date, toDate(now)) ? undefined : "numeric",
  }).format(date);
}

/** « 18 sept. » (the year is added when it is not the current one). */
export function formatDateShort(value: DateInput, now: DateInput = new Date()): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: sameParisYear(date, toDate(now)) ? undefined : "numeric",
  }).format(date);
}

/** « 10 h », « 10 h 30 ». */
export function formatHour(value: DateInput): string {
  const { hour, minute } = parisParts(toDate(value));
  const minutes = minute === 0 ? "" : `${NBSP}${String(minute).padStart(2, "0")}`;
  return `${hour}${NBSP}h${minutes}`;
}

/** « 3 oct. à 10 h ». */
export function formatDateTime(value: DateInput, now: DateInput = new Date()): string {
  return `${formatDateShort(value, now)} ${fr.format.at} ${formatHour(value)}`;
}

/**
 * « à l'instant », « il y a 12 min », « il y a 2 h », « hier », « il y a 3 j »,
 * then the short date. A future date is shown as a date and time.
 */
export function formatRelative(value: DateInput, now: DateInput = new Date()): string {
  const date = toDate(value);
  const reference = toDate(now);
  const elapsed = reference.getTime() - date.getTime();
  if (elapsed < 0) return formatDateTime(date, reference);
  if (elapsed < MINUTE) return fr.format.justNow;
  if (elapsed < HOUR) return fr.format.minutesAgo(Math.floor(elapsed / MINUTE));
  if (elapsed < DAY) return fr.format.hoursAgo(Math.floor(elapsed / HOUR));
  const days = parisDayNumber(reference) - parisDayNumber(date);
  // The 25-hour day of the autumn time change can keep 24 h in the same day.
  if (days === 0) return fr.format.hoursAgo(Math.floor(elapsed / HOUR));
  if (days === 1) return fr.format.yesterday;
  if (days < 7) return fr.format.daysAgo(days);
  return formatDateShort(date, reference);
}

/** Capital at the start of a line (« Il y a 2 h ») without CSS text-transform. */
export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase(LOCALE) + value.slice(1);
}
