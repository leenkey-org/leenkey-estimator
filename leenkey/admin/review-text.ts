import { fr } from "@/lib/i18n/fr";
import { REVIEW_PHOTOS_MIN, type ListingReview, type ReviewIssue } from "./review";

// The sentence of a pre-analysis (L1-30d), as the mobile card of the mockup
// writes it (AdminAnnonces: « Pré-analyse : annonce complète, prix cohérent
// avec l'estimation (+2 %), 12 photos, DPE renseigné. ») with the words of
// Leenkey (« analyse de valeur ») and « Rien à signaler » rather than
// « annonce complète » (the completeness may be below 100).

const t = fr.adminListings.review;

export function reviewIssueText(issue: ReviewIssue): string {
  switch (issue.code) {
    case "dpe":
      return t.issues.dpe;
    case "dpeExemption":
      return t.issues.dpeExemption;
    case "photos":
      return t.issues.photos(issue.count, REVIEW_PHOTOS_MIN);
    case "priceHigh":
      return t.issues.priceHigh(issue.gap);
    case "priceLow":
      return t.issues.priceLow(issue.gap);
    case "description":
      return t.issues.description(issue.length);
  }
}

export function reviewSentence(review: ListingReview): string {
  if (review.verdict === "check") return t.checkSentence(review.issues.map(reviewIssueText));
  return t.okSentence(
    [
      review.priceGapPct !== null ? t.facts.price(review.priceGapPct) : t.facts.noValue,
      t.facts.photos(review.photosCount),
      review.dpe === "ok" ? t.facts.dpe : review.dpe === "none" ? t.facts.noDpe : null,
    ].filter((part): part is string => part !== null),
  );
}
