import { csvDateTime, toCsv } from "@/lib/csv";
import { fr } from "@/lib/i18n/fr";
import type { AdminListingRow } from "./queries";
import { reviewIssueText } from "./review-text";

// The export of /admin/annonces (L1-30d, SPEC-V2 17): the listings of the
// list as it is filtered, one line each, with their pre-analysis.

const t = fr.adminListings.csv;

export function listingsCsv(rows: AdminListingRow[], siteUrl: string): string {
  return toCsv(
    t.header,
    rows.map((row) => [
      row.reference,
      row.title,
      fr.listingStatus[row.status],
      row.city,
      row.postalCode,
      row.sellerName,
      fr.plan[row.plan],
      row.priceCents / 100,
      csvDateTime(row.submittedAt),
      csvDateTime(row.publishedAt),
      row.review
        ? row.review.verdict === "ok"
          ? fr.adminListings.review.ok
          : fr.adminListings.review.check
        : fr.adminListings.review.unavailable,
      row.review ? row.review.issues.map(reviewIssueText).join(" ; ") : null,
      row.review ? row.review.completeness : null,
      row.review ? row.review.priceGapPct : null,
      row.review ? row.review.photosCount : null,
      `${siteUrl}/admin/annonces/${row.id}`,
    ]),
  );
}
