import { describe, expect, it } from "vitest";
import { listingReview, type ReviewInput } from "@/leenkey/admin/review";
import { reviewSentence } from "@/leenkey/admin/review-text";

const complete: ReviewInput = {
  priceCents: 357_000_00,
  valueCents: 350_000_00,
  photosCount: 12,
  description: "x".repeat(900),
  dpe: "ok",
};

describe("listingReview", () => {
  it("a complete listing at its value: nothing to check", () => {
    const review = listingReview(complete);
    expect(review).toEqual({
      completeness: 100,
      priceGapPct: 2,
      photosCount: 12,
      descriptionLength: 900,
      dpe: "ok",
      issues: [],
      verdict: "ok",
    });
    expect(reviewSentence(review)).toBe(
      "Rien à signaler : prix cohérent avec l'analyse de valeur (+2\u00A0%), 12\u00A0photos, DPE renseigné.",
    );
  });

  it("the price beyond 10 % either side of the value is to check, 10 % is not", () => {
    expect(listingReview({ ...complete, priceCents: 385_000_00 }).issues).toEqual([]);
    expect(listingReview({ ...complete, priceCents: 389_000_00 }).issues).toEqual([
      { code: "priceHigh", gap: 11 },
    ]);
    expect(listingReview({ ...complete, priceCents: 300_000_00 }).issues).toEqual([
      { code: "priceLow", gap: -14 },
    ]);
  });

  it("no analysis of value: no gap, no issue, less complete", () => {
    const review = listingReview({ ...complete, valueCents: null });
    expect(review.priceGapPct).toBeNull();
    expect(review.verdict).toBe("ok");
    expect(review.completeness).toBe(85);
    expect(reviewSentence(review)).toContain("sans analyse de valeur pour comparer le prix");
  });

  it("issues in their order: DPE, price, photos, description", () => {
    const review = listingReview({
      priceCents: 500_000_00,
      valueCents: 350_000_00,
      photosCount: 3,
      description: "  Bel appartement.  ",
      dpe: "missing",
    });
    expect(review.issues).toEqual([
      { code: "dpe" },
      { code: "priceHigh", gap: 43 },
      { code: "photos", count: 3 },
      { code: "description", length: 16 },
    ]);
    expect(review.verdict).toBe("check");
    // 35 × 3/6 + 30 × 16/800 + 0 + 15
    expect(review.completeness).toBe(33);
    expect(reviewSentence(review)).toBe(
      "À vérifier : DPE manquant ou plus valable, prix 43\u00A0% au-dessus de l'analyse de valeur, 3\u00A0photos sur 6 conseillées, description courte (16\u00A0caractères).",
    );
  });

  it("an exemption is to check; land has no DPE to give", () => {
    expect(listingReview({ ...complete, dpe: "exempt" }).issues).toEqual([
      { code: "dpeExemption" },
    ]);
    const land = listingReview({ ...complete, dpe: "none" });
    expect(land.verdict).toBe("ok");
    expect(reviewSentence(land)).toContain("sans DPE à fournir");
  });

  it("no photo, no description: said plainly; characters counted as Postgres does", () => {
    const review = listingReview({ ...complete, photosCount: 0, description: "" });
    expect(reviewSentence(review)).toBe("À vérifier : aucune photo, pas de description.");
    expect(listingReview({ ...complete, description: "🏠".repeat(400) }).issues).toEqual([]);
  });

  it("a price below the value by less than half a percent reads 0", () => {
    const review = listingReview({ ...complete, priceCents: 349_000_00 });
    expect(review.priceGapPct).toBe(0);
    expect(reviewSentence(review)).toContain("(0\u00A0%)");
  });
});
