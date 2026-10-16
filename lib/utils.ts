import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Façade type scale (app/globals.css, `--text-lk-*`): font sizes, not colours. */
export const FACADE_TEXT_SIZES = [
  "lk-display",
  "lk-display-lg",
  "lk-h1",
  "lk-h1-lg",
  "lk-h2",
  "lk-h2-lg",
  "lk-h3",
  "lk-h3-lg",
  "lk-logo",
  "lk-title",
  "lk-price",
  "lk-price-lg",
  "lk-card-price",
  "lk-card-price-sm",
  "lk-card-price-lg",
  "lk-figure",
  "lk-figure-lg",
  "lk-stat",
  "lk-body",
  "lk-body-lg",
  "lk-compact",
  "lk-label",
  "lk-button-lg",
  "lk-button-md",
  "lk-button-sm",
  "lk-secondary",
  "lk-caption",
  "lk-tag",
  "lk-micro",
] as const;

// tailwind-merge cannot read the Façade tokens of app/globals.css: without
// this, cn("text-lk-h1", "text-lk-ink") would drop the size as a colour, and
// cn("rounded-md", "rounded-lk-sm") would keep both radii.
const twMerge = extendTailwindMerge<"lk-width">({
  extend: {
    theme: {
      text: [...FACADE_TEXT_SIZES],
      radius: ["lk-sm", "lk-md"],
      shadow: ["float", "sheet"],
      ease: ["out-lk"],
      container: ["lk-page", "lk-home", "lk-settings", "lk-prose", "lk-form"],
    },
    classGroups: {
      "lk-width": ["text-wide", "text-display"],
      "fvn-spacing": ["tabular"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
