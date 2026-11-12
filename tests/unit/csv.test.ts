import { describe, expect, it } from "vitest";
import { csvDateTime, toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("semicolons, CRLF, a byte order mark, decimal commas, empty cells", () => {
    expect(
      toCsv(
        ["Réf", "Prix (€)", "Écart (%)"],
        [
          ["LK-0001", 350000.5, null],
          ["LK-0002", -14, 0],
        ],
      ),
    ).toBe("\uFEFFRéf;Prix (€);Écart (%)\r\nLK-0001;350000,5;\r\nLK-0002;-14;0\r\n");
  });

  it("quotes a cell with a separator, a quote or a line break", () => {
    expect(toCsv(["a"], [['Maison "familiale"; jardin\nproche']])).toBe(
      '\uFEFFa\r\n"Maison ""familiale""; jardin\nproche"\r\n',
    );
  });

  it("text read as a formula by a spreadsheet is kept as text", () => {
    const rows = [['=HYPERLINK("x")'], ["+33 6"], ["-1+1"], ["@SUM(A1)"], ["\tx"], ["Épinay"]];
    expect(toCsv(["a"], rows).split("\r\n").slice(1, 7)).toEqual([
      `"'=HYPERLINK(""x"")"`,
      "'+33 6",
      "'-1+1",
      "'@SUM(A1)",
      "'\tx",
      "Épinay",
    ]);
  });
});

describe("csvDateTime", () => {
  it("in Europe/Paris, sortable as text", () => {
    expect(csvDateTime("2026-11-12T09:30:00Z")).toBe("2026-11-12 10:30");
    expect(csvDateTime("2026-07-01T22:15:00Z")).toBe("2026-07-02 00:15");
    expect(csvDateTime(null)).toBeNull();
  });
});
