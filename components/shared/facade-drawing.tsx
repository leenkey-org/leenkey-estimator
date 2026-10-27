import type { SVGProps } from "react";
import {
  FACADE_DIMENSION,
  FACADE_OUTLINE,
  FACADE_VIEWBOX,
} from "@/components/shared/facade-drawing-shapes";

/** A rectangle of the drawing as a path, which can be traced like the others. */
function rectPath({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return `M${x} ${y}h${width}v${height}h-${width}z`;
}

/**
 * Brand drawing (docs/DESIGN.md 7.3), inline so that it takes the text colour
 * (currentColor): white on a blue flat, --lk-ink-3 on a light background. The
 * label inherits Sora from the Façade scope. Always decorative. Every line
 * is a path of length 1 (pathLength): the class lk-drawing traces it
 * (app/globals.css, DESIGN.md 9).
 */
export function FacadeDrawing(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={FACADE_VIEWBOX}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g stroke="currentColor" strokeWidth={FACADE_OUTLINE.strokeWidth} strokeLinejoin="round">
        {[...FACADE_OUTLINE.paths, ...FACADE_OUTLINE.rects.map(rectPath)].map((d) => (
          <path key={d} d={d} pathLength={1} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth={FACADE_DIMENSION.strokeWidth}>
        {FACADE_DIMENSION.paths.map((d) => (
          <path key={d} d={d} pathLength={1} />
        ))}
      </g>
      <text
        x={FACADE_DIMENSION.label.x}
        y={FACADE_DIMENSION.label.y}
        fill="currentColor"
        fontSize={FACADE_DIMENSION.label.fontSize}
        textAnchor="middle"
      >
        {FACADE_DIMENSION.label.text}
      </text>
    </svg>
  );
}
