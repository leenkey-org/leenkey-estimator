import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FACADE_DIMENSION,
  FACADE_OUTLINE,
  FACADE_VIEWBOX,
} from "@/components/shared/facade-drawing-shapes";

// L1-08: public/brand/facade.svg follows docs/DESIGN.md 7.3, and the inline
// <FacadeDrawing> draws exactly the same shapes.

const svg = readFileSync(new URL("../../../public/brand/facade.svg", import.meta.url), "utf8");

const attribute = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function group(strokeWidth: number): string {
  const match = svg.match(
    new RegExp(`<g stroke="currentColor" stroke-width="${strokeWidth}"[^>]*>([\\s\\S]*?)</g>`),
  );
  if (!match) throw new Error(`group with stroke-width ${strokeWidth} not found`);
  return match[1];
}

const paths = (content: string) =>
  [...content.matchAll(/<path [^>]*>/g)].map((m) => attribute(m[0], "d"));

const rects = (content: string) =>
  [...content.matchAll(/<rect [^>]*>/g)].map((m) => ({
    x: Number(attribute(m[0], "x")),
    y: Number(attribute(m[0], "y")),
    width: Number(attribute(m[0], "width")),
    height: Number(attribute(m[0], "height")),
  }));

describe("public/brand/facade.svg", () => {
  it("is a decorative drawing coloured by currentColor", () => {
    const root = svg.match(/<svg [^>]*>/)?.[0] ?? "";
    expect(attribute(root, "viewBox")).toBe(FACADE_VIEWBOX);
    expect(attribute(root, "fill")).toBe("none");
    expect(attribute(root, "aria-hidden")).toBe("true");
    expect(svg).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("draws the house, the annex and the openings with a 1.5 stroke", () => {
    const outline = group(FACADE_OUTLINE.strokeWidth);
    expect(paths(outline).sort()).toEqual([...FACADE_OUTLINE.paths].sort());
    expect(rects(outline)).toEqual(FACADE_OUTLINE.rects);
  });

  it("draws the dimension line and its value", () => {
    expect(paths(group(FACADE_DIMENSION.strokeWidth))).toEqual([...FACADE_DIMENSION.paths]);
    const text = svg.match(/<text [^>]*>([^<]*)<\/text>/);
    expect(text?.[1]).toBe(FACADE_DIMENSION.label.text);
    expect(Number(attribute(text?.[0] ?? "", "x"))).toBe(FACADE_DIMENSION.label.x);
    expect(Number(attribute(text?.[0] ?? "", "y"))).toBe(FACADE_DIMENSION.label.y);
    expect(Number(attribute(text?.[0] ?? "", "font-size"))).toBe(FACADE_DIMENSION.label.fontSize);
    expect(attribute(text?.[0] ?? "", "fill")).toBe("currentColor");
  });
});
