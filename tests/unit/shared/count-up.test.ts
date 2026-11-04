import { describe, expect, it } from "vitest";
import { countable } from "@/components/shared/count-up";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// The figures that roll up (components/shared/count-up.tsx, 2026-11-04): the
// number read at the start of a figure, what follows it kept as written, the
// figure drawn back exactly as the text says it.

describe("countable", () => {
  it("reads the number and keeps what follows it", () => {
    expect(countable("300+")).toEqual({ value: 300, suffix: "+" });
    expect(countable("15 ans")).toEqual({ value: 15, suffix: " ans" });
    expect(countable("100 %")).toEqual({ value: 100, suffix: " %" });
    expect(countable("15 000 €")).toEqual({ value: 15000, suffix: " €" });
  });

  it("leaves a figure that is not a number as it is written", () => {
    expect(countable("24 / 7")).toBeNull();
    expect(countable("Vendeur")).toBeNull();
    expect(countable("")).toBeNull();
  });

  it("draws the figures of the site back exactly as written, once rolled up", () => {
    const figures = [
      ...fr.site.about.figures.map((figure) => figure.value),
      fr.site.invest.market.example.value,
    ];
    for (const text of figures) {
      const figure = countable(text);
      if (figure) expect(`${formatInteger(figure.value)}${figure.suffix}`).toBe(text);
    }
    expect(figures.filter((text) => countable(text) !== null)).toHaveLength(4);
  });
});
