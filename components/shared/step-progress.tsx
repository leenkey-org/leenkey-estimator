import { cn } from "@/lib/utils";

/**
 * Where a process stands, compact (docs/DESIGN.md 10.4 StepProgress): « Étape
 * 3 sur 6 · Contacts et visites » on the left, a short word on the right
 * (the plan), then one segment of 6 px per step, the steps reached in the
 * gradient of the charte. dark: on the night of a header (white text).
 */
export function StepProgress({
  current,
  total,
  label,
  trailing,
  tone = "light",
  className,
}: {
  /** 1 to total. */
  current: number;
  total: number;
  /** « Étape 3 sur 6 · Contacts et visites ». */
  label: string;
  trailing?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-lk-compact">
        <span className={cn("min-w-0", dark ? "text-white/80" : "text-lk-ink-3")}>{label}</span>
        {trailing ? (
          <span className={cn("shrink-0 font-semibold", dark ? "text-white" : "text-lk-ink")}>
            {trailing}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="flex gap-1"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < current ? "lk-gradient" : dark ? "bg-white/20" : "bg-lk-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
