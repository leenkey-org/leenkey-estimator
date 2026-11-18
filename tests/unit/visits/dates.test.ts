import { describe, expect, it } from "vitest";
import {
  canCancel,
  groupByDay,
  parisDayKey,
  parisInstant,
  visitDateTime,
  visitDay,
  visitRange,
} from "@/leenkey/visits/dates";

// L3-02: the dates of a visit, stored in UTC, said and entered in Paris time.

const plain = (value: string) => value.replace(/[\u00A0\u202F]/g, " ");
const NOW = new Date("2026-11-18T10:00:00Z");

describe("parisInstant", () => {
  it("winter time: Paris is one hour ahead of UTC", () => {
    expect(parisInstant("2026-11-21", "10:30")?.toISOString()).toBe("2026-11-21T09:30:00.000Z");
    expect(parisInstant("2026-01-01", "00:00")?.toISOString()).toBe("2025-12-31T23:00:00.000Z");
  });

  it("summer time: two hours ahead", () => {
    expect(parisInstant("2026-07-04", "10:30")?.toISOString()).toBe("2026-07-04T08:30:00.000Z");
    expect(parisInstant("2026-07-01", "00:15")?.toISOString()).toBe("2026-06-30T22:15:00.000Z");
  });

  it("the days the clocks change", () => {
    // 29 March 2026: 2 h becomes 3 h, the hour between does not exist.
    expect(parisInstant("2026-03-29", "01:30")?.toISOString()).toBe("2026-03-29T00:30:00.000Z");
    expect(parisInstant("2026-03-29", "02:30")).toBeNull();
    expect(parisInstant("2026-03-29", "03:00")?.toISOString()).toBe("2026-03-29T01:00:00.000Z");
    // 25 October 2026: 3 h becomes 2 h; a time said twice has an instant.
    expect(parisInstant("2026-10-25", "10:00")?.toISOString()).toBe("2026-10-25T09:00:00.000Z");
    const twice = parisInstant("2026-10-25", "02:30");
    expect(twice).not.toBeNull();
    expect(parisDayKey(twice as Date)).toBe("2026-10-25");
  });

  it("a day or a time that does not exist has no instant", () => {
    expect(parisInstant("2026-02-30", "10:00")).toBeNull();
    expect(parisInstant("2026-13-01", "10:00")).toBeNull();
    expect(parisInstant("2026-11-21", "24:30")).toBeNull();
    expect(parisInstant("demain", "10:00")).toBeNull();
    expect(parisInstant("2026-11-21", "")).toBeNull();
  });
});

describe("the words of a date", () => {
  it("the day in Paris, not in UTC", () => {
    expect(parisDayKey("2026-11-20T23:30:00Z")).toBe("2026-11-21");
    expect(parisDayKey("2026-07-03T21:59:00Z")).toBe("2026-07-03");
    expect(parisDayKey(new Date("2026-07-03T22:00:00Z"))).toBe("2026-07-04");
  });

  it("« samedi 21 novembre à 10 h 30 », the year when it is another one", () => {
    expect(plain(visitDay("2026-11-21T09:30:00Z", NOW))).toBe("samedi 21 novembre");
    expect(plain(visitDateTime("2026-11-21T09:30:00Z", NOW))).toBe("samedi 21 novembre à 10 h 30");
    expect(plain(visitDateTime("2026-11-21T09:00:00Z", NOW))).toBe("samedi 21 novembre à 10 h");
    expect(plain(visitDateTime("2027-01-09T13:00:00Z", NOW))).toBe("samedi 9 janvier 2027 à 14 h");
  });

  it("« 10 h 30 – 11 h »", () => {
    expect(plain(visitRange("2026-11-21T09:30:00Z", "2026-11-21T10:00:00Z"))).toBe(
      "10 h 30 – 11 h",
    );
  });
});

describe("groupByDay", () => {
  it("groups by day in Paris, in order, without changing the list given", () => {
    const items = [
      { id: "c", startsAt: "2026-11-22T09:00:00Z" },
      { id: "b", startsAt: "2026-11-21T14:00:00Z" },
      // 00:30 in Paris on the 22nd, still the 21st in UTC.
      { id: "d", startsAt: "2026-11-21T23:30:00Z" },
      { id: "a", startsAt: "2026-11-21T09:30:00Z" },
    ];
    const groups = groupByDay(items, NOW);
    expect(groups.map((group) => group.day)).toEqual(["2026-11-21", "2026-11-22"]);
    expect(groups.map((group) => plain(group.label))).toEqual([
      "samedi 21 novembre",
      "dimanche 22 novembre",
    ]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ["a", "b"],
      ["d", "c"],
    ]);
    expect(items.map((item) => item.id)).toEqual(["c", "b", "d", "a"]);
  });

  it("nothing gives nothing", () => {
    expect(groupByDay([], NOW)).toEqual([]);
  });
});

describe("canCancel", () => {
  const start = "2026-11-21T09:30:00Z";

  it("the buyer until 2 hours before the start", () => {
    expect(canCancel(start, "buyer", new Date("2026-11-21T07:29:59Z"))).toBe(true);
    expect(canCancel(start, "buyer", new Date("2026-11-21T07:30:00Z"))).toBe(false);
    expect(canCancel(start, "buyer", new Date("2026-11-21T09:00:00Z"))).toBe(false);
  });

  it("the seller until the start", () => {
    expect(canCancel(start, "seller", new Date("2026-11-21T09:29:59Z"))).toBe(true);
    expect(canCancel(start, "seller", new Date("2026-11-21T09:30:00Z"))).toBe(false);
    expect(canCancel(start, "seller", new Date("2026-11-22T09:30:00Z"))).toBe(false);
  });
});
