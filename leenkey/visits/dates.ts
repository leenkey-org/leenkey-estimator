import { formatDate, formatHour } from "@/lib/format";

// The dates of a visit (L3-02): stored in UTC, said and entered in Paris time
// (CLAUDE.md section 9), with Intl (as lib/format.ts). Pure, unit-tested.

const PARIS = "Europe/Paris";

function parisParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** « 2026-11-21 », the day in Paris. */
export function parisDayKey(value: string | Date): string {
  return parisParts(new Date(value)).day;
}

/**
 * The instant of a day (« 2026-11-21 ») and a time (« 10:30 ») in Paris; null
 * when there is none (a day that does not exist, the hour skipped in March).
 */
export function parisInstant(day: string, time: string): Date | null {
  const naive = Date.parse(`${day}T${time}:00Z`);
  if (Number.isNaN(naive)) return null;
  // Paris is 1 or 2 hours ahead of UTC: the one that reads back as asked.
  for (const hours of [1, 2]) {
    const candidate = new Date(naive - hours * 3_600_000);
    const read = parisParts(candidate);
    if (read.day === day && read.time === time) return candidate;
  }
  return null;
}

/** « samedi 21 novembre » */
export function visitDay(value: string | Date, now: Date = new Date()): string {
  return formatDate(value, now);
}

/** « samedi 21 novembre à 10 h 30 » */
export function visitDateTime(value: string | Date, now: Date = new Date()): string {
  return `${formatDate(value, now)} à ${formatHour(value)}`;
}

/** « 10 h 30 – 11 h » */
export function visitRange(start: string | Date, end: string | Date): string {
  return `${formatHour(start)} – ${formatHour(end)}`;
}

export type DayGroup<T> = { day: string; label: string; items: T[] };

/** Slots or visits grouped by day in Paris, in order (DESIGN.md 13.1: the date as the title of a group). */
export function groupByDay<T extends { startsAt: string }>(
  items: readonly T[],
  now: Date = new Date(),
): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const day = parisDayKey(item.startsAt);
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, label: visitDay(item.startsAt, now), items: [item] });
  }
  return groups;
}

/** The buyer cancels until 2 hours before the start (SPEC 14); the seller until the start. */
export function canCancel(
  startsAt: string,
  role: "buyer" | "seller",
  now: Date = new Date(),
): boolean {
  const start = new Date(startsAt).getTime();
  return role === "seller" ? start > now.getTime() : start > now.getTime() + 2 * 3_600_000;
}
