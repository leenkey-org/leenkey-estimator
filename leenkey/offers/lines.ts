import type { Json } from "@/types/database";
import { readPropertySnapshot, type OfferContent } from "./content";

// The offers of a buyer as the lines of their home (L2-04b): what is shown
// of each, and which ones. Pure: the rows come from `buyerOffers`.

/** An offer of the buyer, as a line of their home. */
export type BuyerOfferLine = {
  id: string;
  listingId: string;
  /** Read expired as soon as its validity is past, before the cron writes it. */
  status: OfferContent["status"];
  priceCents: number | null;
  submittedAt: string | null;
  /** The listing as the offer photographed it; of the listing itself for a draft. */
  title: string;
  city: string;
};

export type BuyerOfferRow = {
  id: string;
  listing_id: string;
  status: OfferContent["status"];
  price_cents: number | null;
  submitted_at: string | null;
  validity_until: string | null;
  property_snapshot: Json;
};

/**
 * The lines of the offers of a buyer, from their rows the most recent first:
 * - one line per listing for the last offer sent (a replaced offer is its
 *   history, read from the new one), one more for the draft in progress;
 * - an offer past its validity reads expired before the cron writes it;
 * - a draft on a listing whose offer is accepted is not shown: it can no
 *   longer be sent.
 * `online` names the listings of the drafts, as the public reads them.
 */
export function buyerOfferLines(
  rows: readonly BuyerOfferRow[],
  online: ReadonlyMap<string, { title: string; city: string }>,
  now: number,
): BuyerOfferLine[] {
  const accepted = new Set(
    rows.filter((row) => row.status === "accepted").map((row) => row.listing_id),
  );
  const seen = new Set<string>();
  const lines: BuyerOfferLine[] = [];
  for (const row of rows) {
    if (row.status === "superseded") continue;
    const draft = row.status === "draft";
    if (draft && accepted.has(row.listing_id)) continue;
    const key = `${row.listing_id}:${draft ? "draft" : "sent"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const snapshot = readPropertySnapshot(row.property_snapshot);
    const waiting = row.status === "submitted" || row.status === "viewed";
    const due = row.validity_until !== null && Date.parse(row.validity_until) <= now;
    lines.push({
      id: row.id,
      listingId: row.listing_id,
      status: waiting && due ? "expired" : row.status,
      priceCents: row.price_cents,
      submittedAt: row.submitted_at,
      title: snapshot?.title ?? online.get(row.listing_id)?.title ?? "",
      city: snapshot?.city ?? online.get(row.listing_id)?.city ?? "",
    });
  }
  return lines;
}
