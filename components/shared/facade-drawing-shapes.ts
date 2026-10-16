// Geometry of the brand drawing (docs/DESIGN.md 7.3): a house, its annex and a
// dimension line. Shared by <FacadeDrawing> and public/brand/facade.svg; a unit
// test keeps the two identical.

export const FACADE_VIEWBOX = "0 0 380 210";

/** House, ground, annex, windows and door: 1.5 stroke, round joins. */
export const FACADE_OUTLINE = {
  strokeWidth: 1.5,
  paths: ["M60 200V90l90-60 90 60v110", "M60 200h300", "M240 200V120h100v80", "M135 200v-34h30v34"],
  rects: [
    { x: 90, y: 120, width: 40, height: 40 },
    { x: 170, y: 120, width: 40, height: 40 },
    { x: 262, y: 140, width: 56, height: 30 },
  ],
} as const;

/** Dimension line above the house and its value. */
export const FACADE_DIMENSION = {
  strokeWidth: 1,
  paths: ["M60 22h180", "M60 16v12M240 16v12"],
  label: { x: 150, y: 14, fontSize: 10, text: "9,40 m" },
} as const;
