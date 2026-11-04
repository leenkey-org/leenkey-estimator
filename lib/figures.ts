// A figure written as text (« 300+ », « 15 ans », « 15 000 € »): the number
// at its start and what follows it, for the figures that roll up
// (components/shared/count-up.tsx). Plain values, read on the server and in
// the browser.

/** The number at the start of a figure and what follows it, or null (« 24 / 7 »). */
export function countable(text: string): { value: number; suffix: string } | null {
  const match = /^(\d+(?:\s\d+)*)(\D*)$/u.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(/\s/gu, ""));
  return Number.isFinite(value) ? { value, suffix: match[2] } : null;
}
