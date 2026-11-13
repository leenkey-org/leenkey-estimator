// The legal withdrawal period of a buyer after an avant-contrat (SPEC-V2 13,
// « Avant-contrat signé »): ten calendar days from the day after the
// avant-contrat was notified or handed to them; when its last day is a
// Saturday, a Sunday or a public holiday, it goes on to the next working day.
// Indicative only, from the date the seller typed, never from the date of the
// signature: every screen says « Votre notaire fait foi ». Days are plain
// « YYYY-MM-DD », never a moment of a time zone.

const DAY_MS = 86_400_000;
export const WITHDRAWAL_PERIOD_DAYS = 10;

const iso = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Easter Sunday of a year (the anonymous Gregorian computus), as a UTC time. */
function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, dayOfMonth);
}

/**
 * The eleven public holidays of a year in metropolitan France (Code du
 * travail L3133-1), as « YYYY-MM-DD ». The two more of Alsace-Moselle are not
 * counted: the date is indicative.
 */
export function frenchPublicHolidays(year: number): string[] {
  const easter = easterSunday(year);
  const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"];
  return [
    ...fixed.map((monthDay) => `${year}-${monthDay}`),
    iso(easter + DAY_MS), // Easter Monday
    iso(easter + 39 * DAY_MS), // Ascension Thursday
    iso(easter + 50 * DAY_MS), // Whit Monday
  ].sort();
}

/**
 * The last day of the withdrawal period of a buyer whose avant-contrat was
 * notified or handed on `notifiedOn`: that day plus ten (the period starts
 * the day after), moved to the next working day when it falls on a Saturday,
 * a Sunday or a public holiday. Null when `notifiedOn` is not a day.
 */
export function withdrawalPeriodEnd(notifiedOn: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(notifiedOn);
  if (!match) return null;
  const start = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (iso(start) !== notifiedOn) return null;
  let end = start + WITHDRAWAL_PERIOD_DAYS * DAY_MS;
  for (;;) {
    const date = new Date(end);
    const weekDay = date.getUTCDay();
    const holiday = frenchPublicHolidays(date.getUTCFullYear()).includes(iso(end));
    if (weekDay !== 0 && weekDay !== 6 && !holiday) return iso(end);
    end += DAY_MS;
  }
}
