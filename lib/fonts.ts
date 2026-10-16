import { Archivo } from "next/font/google";

// docs/DESIGN.md 3.1: Archivo with its width axis, for font-stretch: 116 % on
// titles, prices and key figures. Self-hosted by next/font at build time.
// Imported by <FacadeRoot> only: the V1 pages keep their fonts and never
// download or preload this one.
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});
