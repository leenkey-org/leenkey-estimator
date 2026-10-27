import { Sora } from "next/font/google";

// The font of the charte D (docs/design-handoff-d/SPECS.md 1): Sora, 400 to
// 800, the only font of the site since L1-58 (Archivo before). Self-hosted by
// next/font at build time: no request to Google before consent (L1-37).
export const sora = Sora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sora",
});
