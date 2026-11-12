import { csvDateTime, toCsv } from "@/lib/csv";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import { frListingStatus } from "@/lib/i18n/sections/listingStatus";
import { frPlan } from "@/lib/i18n/sections/plan";
import type { AdminListingRow } from "./queries";
import { reviewIssueText } from "./review-text";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  adminListings: frAdminListings,
  listingStatus: frListingStatus,
  plan: frPlan,
} as const;

// The export of /admin/annonces (L1-30d, SPEC-V2 17): the listings of the
// list as it is filtered, one line each, with their pre-analysis.

const t = fr.adminListings.csv;

/** `limited`: more listings match than the list holds; a last line says so. */
export function listingsCsv(rows: AdminListingRow[], siteUrl: string, limited = false): string {
  const lines = rows.map((row) => [
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
  ]);
  return toCsv(t.header, limited ? [...lines, [t.limited(rows.length)]] : lines);
}
