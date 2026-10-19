import { Archivo } from "next/font/google";

// docs/DESIGN.md 3.1: Archivo with its width axis, for font-stretch: 116 % on
// titles, prices and key figures. Self-hosted by next/font at build time; the
// only font of the site since the V1 ones were removed (L1-44).
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});
