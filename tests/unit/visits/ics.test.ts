import { describe, expect, it } from "vitest";
import { visitIcs, type VisitEvent } from "@/leenkey/visits/ics";

// L3-02: the calendar file of a visit (RFC 5545): one event in UTC, its
// texts escaped, lines of 75 octets at most, CRLF everywhere.

const event: VisitEvent = {
  id: "0b0e8f0a-1111-4222-8333-444455556666",
  startsAt: "2026-11-21T09:30:00.000Z",
  endsAt: "2026-11-21T10:00:00+00:00",
  summary: "Visite : Maison 5 pièces",
  location: "12 rue des Lilas, 91600 Savigny-sur-Orge",
  description: "Visite réservée sur Leenkey.",
  url: "https://leenkey.fr/visites/0b0e8f0a-1111-4222-8333-444455556666",
  now: new Date("2026-11-18T10:00:00.123Z"),
};

/** The lines as a calendar reads them: unfolded. */
const unfolded = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("visitIcs", () => {
  it("one event, its times in UTC, from the first line to the last", () => {
    const ics = visitIcs(event);
    const lines = unfolded(ics);
    expect(lines.slice(0, 6)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Leenkey//Visites//FR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
    ]);
    expect(lines).toContain("UID:visit-0b0e8f0a-1111-4222-8333-444455556666@leenkey.fr");
    expect(lines).toContain("DTSTAMP:20261118T100000Z");
    expect(lines).toContain("DTSTART:20261121T093000Z");
    expect(lines).toContain("DTEND:20261121T100000Z");
    expect(lines).toContain("SUMMARY:Visite : Maison 5 pièces");
    expect(lines).toContain("URL:https://leenkey.fr/visites/0b0e8f0a-1111-4222-8333-444455556666");
    expect(lines.slice(-3)).toEqual(["END:VEVENT", "END:VCALENDAR", ""]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("a slot given with an offset is written in UTC", () => {
    const lines = unfolded(
      visitIcs({
        ...event,
        startsAt: "2026-07-04T10:30:00+02:00",
        endsAt: "2026-07-04T11:15:00+02:00",
      }),
    );
    expect(lines).toContain("DTSTART:20260704T083000Z");
    expect(lines).toContain("DTEND:20260704T091500Z");
  });

  it("the time of the file is now by default", () => {
    const stamp = unfolded(visitIcs({ ...event, now: undefined })).find((line) =>
      line.startsWith("DTSTAMP:"),
    );
    expect(stamp).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  });

  it("ends every line with CRLF, never a bare line feed", () => {
    const ics = visitIcs({ ...event, description: "Ligne 1\nLigne 2\r\nLigne 3" });
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    // A line break of a text is written « \n », in the same property.
    expect(unfolded(ics)).toContain("DESCRIPTION:Ligne 1\\nLigne 2\\nLigne 3");
  });

  it("escapes the backslash, the comma and the semicolon of a text", () => {
    const lines = unfolded(
      visitIcs({
        ...event,
        summary: "Visite : Maison, jardin; garage",
        location: "12 rue des Lilas, 91600 Savigny-sur-Orge",
        description: "Code C:\\porte",
      }),
    );
    expect(lines).toContain("LOCATION:12 rue des Lilas\\, 91600 Savigny-sur-Orge");
    expect(lines).toContain("DESCRIPTION:Code C:\\\\porte");
    expect(lines).toContain("SUMMARY:Visite : Maison\\, jardin\\; garage");
  });

  it("folds the long lines at 75 octets, never inside a character", () => {
    const description = "Visite réservée à l'été, près de la forêt. ".repeat(8).trim();
    const ics = visitIcs({ ...event, description });
    const encoder = new TextEncoder();
    const physical = ics.split("\r\n");
    for (const line of physical) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
      // Cut between two characters: each part is valid text.
      expect(line).not.toContain("\uFFFD");
    }
    // The next parts of a folded line start with a space.
    const start = physical.findIndex((line) => line.startsWith("DESCRIPTION:"));
    expect(physical[start + 1].startsWith(" ")).toBe(true);
    // Unfolded, the text is whole.
    expect(unfolded(ics)).toContain(`DESCRIPTION:${description.replace(/,/g, "\\,")}`);
    // A short line is left as it is.
    expect(physical).toContain("VERSION:2.0");
  });
});
