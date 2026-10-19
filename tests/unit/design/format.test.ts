import { describe, expect, it } from "vitest";
import {
  NBSP,
  NNBSP,
  capitalize,
  formatClock,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatHour,
  formatMessageTime,
  formatPrice,
  formatPricePerSquareMetre,
  formatPriceShort,
  formatRelative,
  formatRooms,
  formatSurface,
} from "@/lib/format";

// docs/DESIGN.md section 3.3: amounts in cents, U+202F before € and m²,
// dates shown in Europe/Paris and never as 22/09/2026.

describe("amounts", () => {
  it("formats a price from cents with narrow no-break spaces", () => {
    expect(formatPrice(35_000_000)).toBe(`350${NNBSP}000${NNBSP}€`);
    expect(formatPrice(99_000)).toBe(`990${NNBSP}€`);
    expect(formatPrice(150_000_000)).toBe(`1${NNBSP}500${NNBSP}000${NNBSP}€`);
  });

  it("rounds to the euro", () => {
    expect(formatPrice(12_345_678)).toBe(`123${NNBSP}457${NNBSP}€`);
    expect(formatPrice(0)).toBe(`0${NNBSP}€`);
  });

  it("shortens prices for map markers", () => {
    expect(formatPriceShort(35_000_000)).toBe(`350${NNBSP}k€`);
    expect(formatPriceShort(28_900_000)).toBe(`289${NNBSP}k€`);
    expect(formatPriceShort(41_249_900)).toBe(`412${NNBSP}k€`);
    expect(formatPriceShort(41_250_000)).toBe(`413${NNBSP}k€`);
    expect(formatPriceShort(99_960_000)).toBe(`1${NNBSP}M€`);
    expect(formatPriceShort(120_000_000)).toBe(`1,2${NNBSP}M€`);
    expect(formatPriceShort(125_000_000)).toBe(`1,25${NNBSP}M€`);
    expect(formatPriceShort(50_000)).toBe(`500${NNBSP}€`);
  });

  it("formats a price per square metre", () => {
    expect(formatPricePerSquareMetre(35_000_000, 68)).toBe(
      `5${NNBSP}147${NNBSP}€${NBSP}/${NBSP}m²`,
    );
  });
});

describe("surfaces and rooms", () => {
  it("formats surfaces with one decimal at most", () => {
    expect(formatSurface(68)).toBe(`68${NNBSP}m²`);
    expect(formatSurface(68.5)).toBe(`68,5${NNBSP}m²`);
    expect(formatSurface(1250)).toBe(`1${NNBSP}250${NNBSP}m²`);
    expect(formatSurface(68.45, 0)).toBe(`68${NNBSP}m²`);
  });

  it("writes rooms in full, or « p » in compact cards", () => {
    expect(formatRooms(3)).toBe(`3${NBSP}pièces`);
    expect(formatRooms(1)).toBe(`1${NBSP}pièce`);
    expect(formatRooms(3, "short")).toBe(`3${NBSP}p`);
  });
});

describe("dates in Europe/Paris", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("writes the weekday and the month in full", () => {
    expect(formatDate("2026-09-22T10:00:00Z", now)).toBe("mardi 22 septembre");
  });

  it("uses the Paris day, not the UTC one", () => {
    // 22:30 UTC on 21 September is 00:30 on 22 September in Paris (UTC+2).
    expect(formatDate("2026-09-21T22:30:00Z", now)).toBe("mardi 22 septembre");
  });

  it("adds the year only when it is not the current one", () => {
    expect(formatDate("2025-09-22T10:00:00Z", now)).toBe("lundi 22 septembre 2025");
    expect(formatDateShort("2026-09-18T10:00:00Z", now)).toBe("18 sept.");
    expect(formatDateShort("2025-10-05T10:00:00Z", now)).toBe("5 oct. 2025");
  });

  it("writes hours the French way, across the time change", () => {
    expect(formatHour("2026-10-03T08:00:00Z")).toBe(`10${NBSP}h`);
    expect(formatHour("2026-10-03T08:30:00Z")).toBe(`10${NBSP}h${NBSP}30`);
    expect(formatHour("2026-11-03T09:05:00Z")).toBe(`10${NBSP}h${NBSP}05`);
    expect(formatDateTime("2026-10-03T08:00:00Z", now)).toBe(`3 oct. à 10${NBSP}h`);
    expect(formatDateTime("2026-11-03T09:00:00Z", now)).toBe(`3 nov. à 10${NBSP}h`);
  });

  it("never prints a numeric date", () => {
    expect(formatDate("2026-09-22T10:00:00Z", now)).not.toMatch(/\d+\/\d+/);
    expect(formatDateTime("2026-09-22T10:00:00Z", now)).not.toMatch(/\d+\/\d+/);
  });
});

describe("times of the messages", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("writes the time of a message as 9:12, in Paris", () => {
    expect(formatClock("2026-10-15T07:12:00Z")).toBe("9:12");
    expect(formatClock("2026-10-15T12:05:00Z")).toBe("14:05");
    expect(formatClock("2026-11-15T08:00:00Z")).toBe("9:00");
  });

  it("dates the last message of a conversation in the list", () => {
    expect(formatMessageTime("2026-10-15T07:12:00Z", now)).toBe("9:12");
    // 23:30 UTC on 14 October is 01:30 on 15 October in Paris: today.
    expect(formatMessageTime("2026-10-14T23:30:00Z", now)).toBe("1:30");
    expect(formatMessageTime("2026-10-14T08:00:00Z", now)).toBe("hier");
    expect(formatMessageTime("2026-10-12T08:00:00Z", now)).toBe("lun.");
    expect(formatMessageTime("2026-10-08T08:00:00Z", now)).toBe("8 oct.");
    expect(formatMessageTime("2025-10-15T08:00:00Z", now)).toBe("15 oct. 2025");
  });
});

describe("relative dates", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const minute = 60_000;
  const hour = 60 * minute;

  it("counts minutes and hours", () => {
    expect(formatRelative(ago(30_000), now)).toBe("à l'instant");
    expect(formatRelative(ago(12 * minute), now)).toBe(`il y a 12${NBSP}min`);
    expect(formatRelative(ago(2 * hour), now)).toBe(`il y a 2${NBSP}h`);
    expect(formatRelative(ago(23 * hour + 59 * minute), now)).toBe(`il y a 23${NBSP}h`);
  });

  it("switches to days, then to the date", () => {
    expect(formatRelative("2026-10-14T08:00:00Z", now)).toBe("hier");
    expect(formatRelative("2026-10-12T08:00:00Z", now)).toBe(`il y a 3${NBSP}j`);
    expect(formatRelative("2026-10-05T08:00:00Z", now)).toBe("5 oct.");
    expect(formatRelative("2025-10-05T08:00:00Z", now)).toBe("5 oct. 2025");
  });

  it("keeps hours when yesterday evening was less than a day ago", () => {
    // 23:30 then 00:30 in Paris: one hour, not « hier ».
    expect(formatRelative("2026-10-14T21:30:00Z", "2026-10-14T22:30:00Z")).toBe(`il y a 1${NBSP}h`);
  });

  it("handles the 25-hour day of the autumn time change", () => {
    // 25 October 2026: 00:30 then 24 h later is 23:30 the same day in Paris.
    expect(formatRelative("2026-10-24T22:30:00Z", "2026-10-25T22:30:00Z")).toBe(
      `il y a 24${NBSP}h`,
    );
  });

  it("shows a future date as a date and time", () => {
    expect(formatRelative("2026-10-17T08:00:00Z", now)).toBe(`17 oct. à 10${NBSP}h`);
  });

  it("capitalises the first letter for the start of a line", () => {
    expect(capitalize(formatRelative(ago(2 * hour), now))).toBe(`Il y a 2${NBSP}h`);
    expect(capitalize("à l'instant")).toBe("À l'instant");
  });
});
