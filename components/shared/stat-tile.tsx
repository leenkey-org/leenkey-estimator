import { cn } from "@/lib/utils";

/**
 * A figure and what it counts (docs/DESIGN.md 10.2 StatTile): white card,
 * 1 px line, the figure 22 px 700 tabular (--text-lk-stat), its label 12 px ink-3 under it.
 * By three in a grid on the dashboard of a sale (« 248 vues · 7 j »).
 */
export function StatTile({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-lk-xl border border-lk-line bg-lk-surface px-4 py-3.5",
        className,
      )}
    >
      <span className="text-lk-stat font-bold tracking-lk-d-snug tabular text-lk-ink">{value}</span>
      <span className="text-lk-caption text-lk-ink-3">{label}</span>
    </div>
  );
}
