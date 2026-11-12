// CSV files for a spreadsheet in French (L1-30d export of the listings):
// « ; » between the cells (the comma is the decimal separator in French),
// lines ended by CRLF, a byte order mark so that Excel reads UTF-8, quotes
// around a cell that needs them. A text cell that a spreadsheet would read
// as a formula (« = », « + », « - », « @ », tab, carriage return first) is
// prefixed with an apostrophe: text written by a seller never runs as a
// formula on the team's computer (CSV injection).

export type CsvCell = string | number | null;

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell): string {
  if (value === null) return "";
  const text =
    typeof value === "number"
      ? String(value).replace(".", ",")
      : FORMULA_START.test(value)
        ? `'${value}`
        : value;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: CsvCell[][]): string {
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")}\r\n`;
}

const dateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** « 2026-11-12 10:30 » in Europe/Paris: sorted as text, read as a date. */
export function csvDateTime(value: string | Date | null): string | null {
  return value === null ? null : dateTime.format(new Date(value));
}
