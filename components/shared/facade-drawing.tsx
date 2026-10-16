import type { SVGProps } from "react";
import {
  FACADE_DIMENSION,
  FACADE_OUTLINE,
  FACADE_VIEWBOX,
} from "@/components/shared/facade-drawing-shapes";

/**
 * Brand drawing (docs/DESIGN.md 7.3), inline so that it takes the text colour
 * (currentColor): white on a blue flat, --lk-ink-3 on a light background. The
 * label inherits Archivo from the Façade scope. Always decorative.
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
        {FACADE_OUTLINE.paths.map((d) => (
          <path key={d} d={d} />
        ))}
        {FACADE_OUTLINE.rects.map((rect) => (
          <rect key={`${rect.x}-${rect.y}`} {...rect} />
        ))}
      </g>
      <g stroke="currentColor" strokeWidth={FACADE_DIMENSION.strokeWidth}>
        {FACADE_DIMENSION.paths.map((d) => (
          <path key={d} d={d} />
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
