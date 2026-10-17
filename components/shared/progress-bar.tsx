import { cn } from "@/lib/utils";

/**
 * Progress of a form in steps (docs/DESIGN.md 10.4 ProgressBar): « Étape 2
 * sur 4 · Caractéristiques » 12 px ink-3 and « 50 % » 12 px 600 blue above a
 * 6 px bar, line background, blue fill.
 */
export function ProgressBar({
  label,
  value,
  className,
}: {
  /** « Étape 2 sur 4 · Caractéristiques ». */
  label: string;
  /** 0 to 100. */
  value: number;
  className?: string;
}) {
  const percent = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div aria-hidden="true" className="flex items-baseline justify-between gap-3 text-lk-caption">
        <span className="text-lk-ink-3">{label}</span>
        <span className="font-semibold text-lk-blue">{percent}&nbsp;%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-lk-line"
      >
        <div className="h-full rounded-full bg-lk-blue" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
