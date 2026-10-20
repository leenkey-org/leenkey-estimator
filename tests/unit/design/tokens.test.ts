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
  it("keeps the Leenkey blue", () => {
    expect(token("blue")).toBe("#1156fc");
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
    ...(["a", "b", "c", "d", "e", "f", "g"].map((letter) => [
      `dpe-${letter}-fg`,
      `dpe-${letter}-bg`,
    ]) as Array<[string, string]>),
  ];

  it.each(textPairs)("%s on %s reaches 4.5:1", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
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
    expect(cn("tabular-nums", "tabular")).toBe("tabular");
    expect(cn("bg-primary", "bg-lk-blue")).toBe("bg-lk-blue");
  });

  it("lists exactly the font sizes declared in globals.css", () => {
    // Sizes only, not their "--line-height" sub-keys.
    const declared = [...css.matchAll(/--text-(lk-[a-z0-9]+(?:-[a-z0-9]+)*):/g)].map((m) => m[1]);
    expect([...FACADE_TEXT_SIZES].sort()).toEqual([...new Set(declared)].sort());
  });
});
