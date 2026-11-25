import { cn } from "@/lib/utils";

/**
 * Where a process stands, compact (docs/DESIGN.md 10.4 StepProgress): « Étape
 * 3 sur 6 · Contacts et visites » on the left, a short word on the right
 * (the plan), then one segment of 6 px per step, the steps reached in the
 * gradient of the charte. dark: on the night of a header (white text).
 * `heading` (« Ma vente », 2026-11-25): the position above, the name of the
 * step under it in larger type, the short word in a pill; the segments 8 px.
 */
export function StepProgress({
  current,
  total,
  label,
  trailing,
  heading,
  tone = "light",
  className,
}: {
  /** 1 to total. */
  current: number;
  total: number;
  /** « Étape 3 sur 6 · Contacts et visites »: the name of the progress bar. */
  label: string;
  trailing?: string;
  /** Shown in place of the label: « Étape 3 sur 6 », then the name of the step. */
  heading?: { position: string; title: string };
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col", heading ? "gap-3" : "gap-2.5", className)}>
      {heading ? (
        // The position and the short word on a line, the name of the step under them, its full width.
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                "text-lk-caption font-semibold tabular",
                dark ? "lk-gradient-text-night" : "text-lk-blue-dark",
              )}
            >
              {heading.position}
            </span>
            {trailing ? (
              <span
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-lk-caption font-semibold",
                  dark ? "bg-white/12 text-white" : "bg-lk-stone-2 text-lk-ink",
                )}
              >
                {trailing}
              </span>
            ) : null}
          </div>
          <p
            className={cn(
              "text-lk-h3 font-semibold text-wide lg:text-lk-h3-lg",
              dark ? "text-white" : "text-lk-ink",
            )}
          >
            {heading.title}
          </p>
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-3 text-lk-compact">
          <span className={cn("min-w-0", dark ? "text-white/80" : "text-lk-ink-3")}>{label}</span>
          {trailing ? (
            <span className={cn("shrink-0 font-semibold", dark ? "text-white" : "text-lk-ink")}>
              {trailing}
            </span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        // Read « Étape 3 sur 6 », not the 40 % of 3 between 1 and 6.
        aria-valuetext={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className={cn("flex", heading ? "gap-1.5" : "gap-1")}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "flex-1 rounded-full",
              heading ? "h-2" : "h-1.5",
              index < current ? "lk-gradient" : dark ? "bg-white/20" : "bg-lk-line",
              // The current step: its segment glows a little on the night.
              heading && dark && index === current - 1 && "shadow-lk-d-badge",
            )}
          />
        ))}
      </div>
    </div>
  );
}
