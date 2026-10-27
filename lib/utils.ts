import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Façade type scale (app/globals.css, `--text-lk-*`): font sizes, not colours. */
export const FACADE_TEXT_SIZES = [
  "lk-display",
  "lk-display-md",
  "lk-display-lg",
  "lk-h1",
  "lk-h1-lg",
  "lk-section-lg",
  "lk-showcase",
  "lk-eyebrow",
  "lk-eyebrow-lg",
  "lk-h2",
  "lk-h2-lg",
  "lk-h3",
  "lk-h3-lg",
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
  "lk-lead-lg",
  "lk-compact",
  "lk-label",
  "lk-button-lg",
  "lk-button-md",
  "lk-button-sm",
  "lk-c-hero",
  "lk-c-hero-md",
  "lk-c-hero-lg",
  "lk-c-lead-lg",
  "lk-c-title",
  "lk-c-title-lg",
  "lk-c-feature",
  "lk-c-feature-lg",
  "lk-c-banner",
  "lk-c-banner-lg",
  "lk-c-card",
  "lk-c-card-lg",
  "lk-c-plan",
  "lk-c-plan-lg",
  "lk-c-price",
  "lk-c-price-lg",
  "lk-c-amount",
  "lk-c-amount-lg",
  "lk-d-hero-lg",
  "lk-d-feature",
  "lk-d-feature-lg",
  "lk-d-section",
  "lk-d-lead",
  "lk-d-banner",
  "lk-d-price-lg",
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
      radius: [
        "lk-xs",
        "lk-sm",
        "lk-md",
        "lk-lg",
        "lk-xl",
        "lk-2xl",
        "lk-3xl",
        "lk-4xl",
        "lk-d-card",
        "lk-d-search",
        "lk-d-photo",
      ],
      shadow: [
        "float",
        "sheet",
        "lk-card",
        "lk-cta",
        "lk-cta-hover",
        "lk-raised",
        "lk-lift",
        "lk-photo",
        "lk-search",
        "lk-field",
        "lk-primary",
        "lk-featured",
        "lk-block",
        "lk-fab",
        "lk-badge",
        "lk-hover",
        "lk-tile",
        "lk-d-search",
        "lk-d-button",
        "lk-d-featured",
        "lk-d-block",
        "lk-d-example",
        "lk-d-hover",
        "lk-d-badge",
        "lk-d-field",
        "lk-d-pill",
      ],
      ease: ["out-lk", "reveal-lk"],
      tracking: ["lk-eyebrow", "lk-caps", "lk-d-tight", "lk-d-snug"],
      container: ["lk-frame", "lk-home", "lk-settings", "lk-heading", "lk-prose", "lk-form"],
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

/**
 * Splits a list in parts of `size` items at most: an `.in()` filter of
 * Supabase goes in the URL, which stays short with 100 ids (about 3.7 kB).
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    parts.push(items.slice(start, start + size));
  }
  return parts;
}
