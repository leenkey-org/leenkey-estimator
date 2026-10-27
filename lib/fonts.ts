import { Archivo, Sora } from "next/font/google";

// docs/DESIGN.md 3.1: Archivo with its width axis, for font-stretch: 116 % on
// titles, prices and key figures. Self-hosted by next/font at build time; the
// only font of the site since the V1 ones were removed (L1-44).
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// Redesign D (docs/design-handoff-d/SPECS.md 1, L1-57): Sora, 400 to 800,
// the font of the charte; read by `.lk-d` (app/globals.css) on the pages
// already moved to it. Not preloaded: the other pages would fetch it for
// nothing; a page in the charte loads it from its styles.
export const sora = Sora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--font-sora",
});
