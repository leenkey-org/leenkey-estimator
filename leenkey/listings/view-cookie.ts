// One counted view per visitor, per listing and per day (SPEC-V2 8.5): the
// listings seen today are kept in one functional cookie, without any personal
// data: « 2026-10-16_<id>.<id> ». A new day starts a new list.

export const VIEW_COOKIE = "lk_vues";
/** Listings remembered per day; beyond that the oldest are forgotten. */
export const VIEW_COOKIE_MAX = 40;
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Day in Paris, « 2026-10-16 ». */
export function parisDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Listings already counted today for this visitor. */
export function readViewCookie(value: string | undefined, today: string): string[] {
  if (!value) return [];
  const [day, ids = ""] = value.split("_");
  if (!DAY.test(day) || day !== today) return [];
  return ids.split(".").filter((id) => UUID.test(id));
}

export function writeViewCookie(today: string, ids: readonly string[]): string {
  const unique = [...new Set(ids)].slice(-VIEW_COOKIE_MAX);
  return `${today}_${unique.join(".")}`;
}
