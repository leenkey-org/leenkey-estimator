import { frVisits } from "@/lib/i18n/sections/visits";
import type { VisitInterest } from "@/lib/validations/visit";
import { cn } from "@/lib/utils";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.feedback;

/**
 * What a buyer said after a visit (L3-03), as they gave it: « Intérêt 4 / 5 »
 * with the words they chose, and their comment; « Retour non donné » without
 * it. Never an average nor a judgement of Leenkey (DECISIONS.md 2026-11-20).
 */
export function BuyerFeedback({
  interest,
  comment,
  none = t.none,
  clamp = false,
  className,
}: {
  interest: VisitInterest | null;
  comment: string | null;
  /** What is said while the buyer gave nothing. */
  none?: string;
  /** In a list: three lines of the comment at most (its page shows it whole). */
  clamp?: boolean;
  className?: string;
}) {
  if (interest === null) {
    return <p className={cn("text-lk-caption text-lk-ink-3", className)}>{none}</p>;
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className="text-lk-secondary font-medium text-lk-ink tabular">
        {t.interestValue(interest)}
        <span className="font-normal text-lk-ink-2"> · {t.interestLabels[interest]}</span>
      </p>
      {comment ? (
        <p
          className={cn(
            "text-lk-secondary text-pretty break-words whitespace-pre-line text-lk-ink-2",
            clamp && "line-clamp-3",
          )}
        >
          {comment}
        </p>
      ) : null}
    </div>
  );
}
