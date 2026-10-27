import { badgeVariants } from "@/components/ui/badge";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type ListingStatus = Database["public"]["Enums"]["listing_status"];
type PlanCode = Database["public"]["Enums"]["plan_code"];

/** Pill shape shared by the status and DPE badges (docs/DESIGN.md 10.2). */
export const pillClassName = cn(
  badgeVariants({ variant: null }),
  "whitespace-nowrap rounded-full border-0 shadow-none",
);

// Colours of DESIGN.md 10.2, labels of SPEC-V2 section 7 (lib/i18n/fr.ts).
const listingTone: Record<ListingStatus, string> = {
  draft: "bg-lk-stone-2 text-lk-ink-2",
  pending: "bg-lk-warning-bg text-lk-warning-fg",
  published: "bg-lk-success text-white",
  paused: "bg-lk-blue-tint text-lk-blue-dark",
  suspended: "bg-lk-danger-bg text-lk-danger-fg",
  sold: "bg-lk-ink text-white",
  rejected: "bg-lk-danger-bg text-lk-danger-fg",
};

const planTone: Record<PlanCode, string> = {
  serenite: "bg-lk-navy text-white",
  accompagne: "bg-lk-blue-tint text-lk-blue-dark",
  autonomie: "bg-lk-stone-2 text-lk-ink-2",
};

export type StatusBadgeProps = (
  | { status: ListingStatus; plan?: never }
  | { plan: PlanCode; status?: never }
) & { className?: string };

/** Listing status or plan. The label always carries the meaning, not the colour alone. */
export function StatusBadge({ className, ...props }: StatusBadgeProps) {
  const [tone, label] =
    props.plan !== undefined
      ? [planTone[props.plan], fr.plan[props.plan]]
      : [listingTone[props.status], fr.listingStatus[props.status]];
  return (
    <span
      className={cn(pillClassName, "px-2.5 py-1.25 text-lk-micro font-semibold", tone, className)}
    >
      {label}
    </span>
  );
}
