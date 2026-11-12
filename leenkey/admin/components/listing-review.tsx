import { CircleAlert, CircleCheck } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { pillClassName } from "@/components/shared/status-badge";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { ListingReview } from "../review";
import { reviewSentence } from "../review-text";

const t = fr.adminListings.review;

// The pre-analysis of a listing (L1-30d, SPEC-V2 17, DESIGN.md 12.12 and
// 12.13): a pill and its sentence in the table, a note in the mobile card
// (blue tint when nothing is to check, warning otherwise), all of it on the
// page of the listing. The words carry the meaning, never the colour alone.

export function ReviewBadge({ review }: { review: ListingReview }) {
  const ok = review.verdict === "ok";
  return (
    <span
      className={cn(
        pillClassName,
        "gap-1 px-2.5 py-1.25 text-lk-micro font-semibold",
        ok ? "bg-lk-blue-tint text-lk-blue-dark" : "bg-lk-warning-bg text-lk-warning-fg",
      )}
    >
      {ok ? (
        <CircleCheck aria-hidden="true" className="size-3.5" />
      ) : (
        <CircleAlert aria-hidden="true" className="size-3.5" />
      )}
      {ok ? t.ok : t.check}
    </span>
  );
}

/** The cell of the table: the pill, then the sentence. */
export function ReviewCell({ review }: { review: ListingReview | null }) {
  if (!review) return <span className="text-lk-caption text-lk-ink-3">{t.unavailable}</span>;
  return (
    <div className="flex max-w-72 flex-col items-start gap-1">
      <ReviewBadge review={review} />
      <p className="text-lk-caption text-lk-ink-2">{reviewSentence(review)}</p>
    </div>
  );
}

/** The note of the mobile card (AdminAnnonces). */
export function ReviewNote({ review }: { review: ListingReview | null }) {
  if (!review) {
    return <p className="mt-3 text-lk-caption text-lk-ink-3">{t.unavailable}</p>;
  }
  const ok = review.verdict === "ok";
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <p
      className={cn(
        "mt-3 flex items-start gap-2 rounded-lk-sm px-3 py-2.5 text-lk-caption",
        ok ? "bg-lk-blue-tint text-lk-ink" : "bg-lk-warning-bg text-lk-warning-fg",
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-3.5 shrink-0", ok && "text-lk-blue")} />
      <span>
        <span className="font-semibold">{t.title} · </span>
        {reviewSentence(review)}
      </span>
    </p>
  );
}

/** The whole pre-analysis, on the page of the listing. */
export function ReviewPanel({
  review,
  priceCents,
  valueCents,
}: {
  review: ListingReview | null;
  priceCents: number;
  valueCents: number | null;
}) {
  if (!review) return <p className="text-lk-secondary text-lk-ink-3">{t.unavailable}</p>;
  const rows = [
    { label: t.detail.photos, value: t.detail.photosValue(review.photosCount) },
    { label: t.detail.description, value: t.detail.descriptionValue(review.descriptionLength) },
    {
      label: t.detail.price,
      value:
        review.priceGapPct !== null && valueCents !== null
          ? `${formatPrice(priceCents)} · ${t.detail.priceValue(review.priceGapPct, formatPrice(valueCents))}`
          : t.detail.noValue,
    },
    { label: t.detail.dpe, value: t.detail.dpeValue[review.dpe] },
  ];
  return (
    <div className="flex flex-col gap-4 rounded-lk-md border border-lk-line bg-lk-surface p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <ReviewBadge review={review} />
        <p className="text-lk-secondary text-lk-ink-2">{reviewSentence(review)}</p>
      </div>
      <ProgressBar label={t.detail.completeness} value={review.completeness} className="max-w-md" />
      <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-lk-caption text-lk-ink-3">{row.label}</dt>
            <dd className="text-lk-label font-semibold text-lk-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-lk-caption text-lk-ink-3">{t.detail.note}</p>
    </div>
  );
}
