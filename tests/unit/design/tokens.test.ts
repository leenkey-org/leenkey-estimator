import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACADE_TEXT_SIZES, cn } from "@/lib/utils";

// Façade tokens (app/globals.css, docs/DESIGN.md section 2): contrast of the
// pairs used by the components, and the class names cn() must understand.

const css = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-lk-${name}:\\s*(#[0-9a-f]{6});`, "i"));
  if (!match) throw new Error(`token --color-lk-${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [a, b] = [luminance(token(foreground)), luminance(token(background))].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

describe("palette (DESIGN.md 2.1)", () => {
  // The charte D since L1-58 (docs/design-handoff-d/SPECS.md 1): the blue of
  // the actions, the night, the ink.
  it("keeps the colours of the charte D", () => {
    expect(token("blue")).toBe("#2563eb");
    expect(token("night")).toBe("#020d21");
    expect(token("ink")).toBe("#0f172a");
  });

  // Text pairs used by the components: WCAG AA, 4.5:1.
  const textPairs: Array<[string, string]> = [
    ["surface", "blue"],
    ["surface", "blue-hover"],
    ["blue", "surface"],
    ["blue", "blue-tint"],
    ["on-blue-2", "blue"],
    ["surface", "navy"],
    ["surface", "ink"],
    ["ink", "surface"],
    ["ink-2", "surface"],
    ["ink-2", "stone-2"],
    ["ink-2", "blue-tint"],
    ["ink-3", "surface"],
    ["ink-3", "stone-2"],
    ["ink-3", "bg"],
    ["surface", "success"],
    ["success", "surface"],
    ["success-fg", "success-bg"],
    ["warning", "surface"],
    ["warning-fg", "warning-bg"],
    ["surface", "warning"],
    ["danger", "surface"],
    ["danger-fg", "danger-bg"],
    ["danger", "danger-bg"],
    ["navy", "blue-tint"],
    // Key figures, facts and strengths on the light blue (L1-55, « pas de gris »).
    ["blue-dark", "blue-tint"],
    ["ink-3", "blue-tint"],
    // Home page in the direction of the V1 (L1-49): its labels and texts on
    // the mist flat, the light blue on the deep navy, the pill « Exemple ».
    ["blue", "mist"],
    ["ink", "mist"],
    ["ink-2", "mist"],
    ["ink-3", "mist"],
    ["blue-light", "navy"],
    ["blue-light", "ink"],
    // White on the lighter end of the gradients of the calls to action.
    ["surface", "blue-mid"],
    ...(["a", "b", "c", "d", "e", "f", "g"].map((letter) => [
      `dpe-${letter}-fg`,
      `dpe-${letter}-bg`,
    ]) as Array<[string, string]>),
  ];

  it.each(textPairs)("%s on %s reaches 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  // The hover of an unread notification, its dates on the light blue.
  it("ink-3 on blue-line reaches 4.5:1", () => {
    expect(contrast("ink-3", "blue-line")).toBeGreaterThanOrEqual(4.5);
  });

  it("the swatches of /design show the values of the tokens", async () => {
    const { paletteSwatches } = await import("@/app/design/_content");
    for (const swatch of paletteSwatches) {
      expect(swatch.hex.toLowerCase(), swatch.token).toBe(token(swatch.token.slice(3)));
    }
  });

  // Field borders are user interface components: WCAG 1.4.11, 3:1.
  it("field borders reach 3:1 on white", () => {
    expect(contrast("field", "surface")).toBeGreaterThanOrEqual(3);
  });

  // Large text, 24 px and more: WCAG 1.4.3, 3:1. The blue words of the title
  // of a section of the public pages, on white or on stone (L1-45).
  it.each([
    ["blue", "surface"],
    ["blue", "stone"],
    // The gradient of the words of a title of the home page (L1-49), at its
    // lightest on a light flat, at its darkest on navy.
    ["blue-bright", "surface"],
    ["blue-bright", "mist"],
    ["blue-bright", "navy"],
    ["blue-bright", "ink"],
  ])("the accent of a title, %s on %s, reaches 3:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3);
  });
});

describe("cn() knows the Façade classes", () => {
  it("keeps a Façade font size next to a Façade colour", () => {
    expect(cn("text-lk-h1", "text-lk-ink")).toBe("text-lk-h1 text-lk-ink");
    expect(cn("text-display", "text-lk-ink")).toBe("text-display text-lk-ink");
    expect(cn("text-wide", "text-lk-blue")).toBe("text-wide text-lk-blue");
  });

  it("replaces conflicting Façade classes", () => {
    expect(cn("text-lk-h1", "text-lk-h2")).toBe("text-lk-h2");
    expect(cn("text-base", "text-lk-body")).toBe("text-lk-body");
    expect(cn("rounded-md", "rounded-lk-sm")).toBe("rounded-lk-sm");
    // The corner of a message bubble on the side of its sender (DESIGN.md 5).
    expect(cn("rounded-lk-md", "rounded-br-lk-xs")).toBe("rounded-lk-md rounded-br-lk-xs");
    expect(cn("rounded-br-lk-sm", "rounded-br-lk-xs")).toBe("rounded-br-lk-xs");
    expect(cn("shadow", "shadow-float")).toBe("shadow-float");
    // L1-49: the radii and shadows of the home page in the direction of the V1.
    expect(cn("rounded-lk-md", "rounded-lk-xl")).toBe("rounded-lk-xl");
    expect(cn("shadow-lk-card", "shadow-lk-cta")).toBe("shadow-lk-cta");
    expect(cn("text-lk-eyebrow", "text-lk-blue")).toBe("text-lk-eyebrow text-lk-blue");
    expect(cn("tracking-wide", "tracking-lk-eyebrow")).toBe("tracking-lk-eyebrow");
    expect(cn("tabular-nums", "tabular")).toBe("tabular");
    expect(cn("bg-primary", "bg-lk-blue")).toBe("bg-lk-blue");
  });

  it("lists exactly the font sizes declared in globals.css", () => {
    // Sizes only, not their "--line-height" sub-keys.
    const declared = [...css.matchAll(/--text-(lk-[a-z0-9]+(?:-[a-z0-9]+)*):/g)].map((m) => m[1]);
    expect([...FACADE_TEXT_SIZES].sort()).toEqual([...new Set(declared)].sort());
  });
});
