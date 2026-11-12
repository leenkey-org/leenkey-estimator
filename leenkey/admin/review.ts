import { priceGap } from "@/leenkey/properties/creation";
import { textLength } from "@/lib/validations/listing";

// The pre-analysis of a listing in the back office (SPEC-V2 12 and 17,
// L1-30d): computed in code when the page shows it (DECISIONS 2026-11-03),
// from what the listing holds; no model call, nothing stored. Pure: unit
// tested. It helps the team decide; it never decides (publication is theirs).

/** Photos the seller is asked for (task « photos_min6 » of the sale steps). */
export const REVIEW_PHOTOS_MIN = 6;
/** Below, a description says too little to sell (SPEC 12: 800 to 1 100 written by the assistant). */
export const REVIEW_DESCRIPTION_MIN = 400;
/** A description of this length counts as complete. */
export const REVIEW_DESCRIPTION_FULL = 800;
/** Gap to the analysis of value, in whole percents, beyond which the price is to check. */
export const REVIEW_PRICE_GAP_MAX = 10;

/** The DPE as the rules of publication read it (dpeIssue, L1-65). */
export type ReviewDpe = "ok" | "missing" | "exempt" | "none";

export type ReviewInput = {
  priceCents: number;
  /** Value of the analysis of value of the property, null without one. */
  valueCents: number | null;
  photosCount: number;
  description: string;
  /**
   * "ok": complete and valid; "missing": the publication is refused;
   * "exempt": not subject, motive to check; "none": land, no DPE asked.
   */
  dpe: ReviewDpe;
};

export type ReviewIssue =
  | { code: "dpe" }
  | { code: "dpeExemption" }
  | { code: "photos"; count: number }
  | { code: "priceHigh"; gap: number }
  | { code: "priceLow"; gap: number }
  | { code: "description"; length: number };

/** The shape of SPEC 12 (`listings.review`), computed rather than stored. */
export type ListingReview = {
  /** 0 to 100: photos, description, DPE, analysis of value. */
  completeness: number;
  /** Whole percents above (+) or below (−) the analysis of value; null without one. */
  priceGapPct: number | null;
  photosCount: number;
  descriptionLength: number;
  dpe: ReviewDpe;
  /** Most important first: what stops the publication, then the price, the photos, the text. */
  issues: ReviewIssue[];
  verdict: "ok" | "check";
};

export function listingReview(input: ReviewInput): ListingReview {
  const photosCount = Math.max(0, input.photosCount);
  const descriptionLength = textLength(input.description.trim());
  const priceGapPct =
    input.valueCents !== null && input.priceCents > 0
      ? priceGap(input.priceCents, input.valueCents)
      : null;

  const issues: ReviewIssue[] = [];
  if (input.dpe === "missing") issues.push({ code: "dpe" });
  if (input.dpe === "exempt") issues.push({ code: "dpeExemption" });
  if (priceGapPct !== null && priceGapPct > REVIEW_PRICE_GAP_MAX) {
    issues.push({ code: "priceHigh", gap: priceGapPct });
  }
  if (priceGapPct !== null && priceGapPct < -REVIEW_PRICE_GAP_MAX) {
    issues.push({ code: "priceLow", gap: priceGapPct });
  }
  if (photosCount < REVIEW_PHOTOS_MIN) issues.push({ code: "photos", count: photosCount });
  if (descriptionLength < REVIEW_DESCRIPTION_MIN) {
    issues.push({ code: "description", length: descriptionLength });
  }

  // Weights: what a buyer sees first (photos, text), then the rules.
  const completeness = Math.round(
    35 * Math.min(photosCount / REVIEW_PHOTOS_MIN, 1) +
      30 * Math.min(descriptionLength / REVIEW_DESCRIPTION_FULL, 1) +
      (input.dpe === "missing" ? 0 : 20) +
      (input.valueCents !== null ? 15 : 0),
  );

  return {
    completeness,
    priceGapPct,
    photosCount,
    descriptionLength,
    dpe: input.dpe,
    issues,
    verdict: issues.length === 0 ? "ok" : "check",
  };
}
