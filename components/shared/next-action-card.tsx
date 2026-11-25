import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one thing to do now (docs/DESIGN.md 10.4 NextActionCard): « Prochaine
 * action » above, then a white card in the outline of the gradient, its
 * pictogram white on the gradient (48 px), a title, a detail, and one or
 * two actions side by side.
 */
export function NextActionCard({
  label,
  icon: Icon,
  title,
  detail,
  actions,
  headingLevel = "h2",
  id = "prochaine-action",
  className,
}: {
  /** « Prochaine action ». */
  label: string;
  icon: LucideIcon;
  title: string;
  detail?: string | null;
  /** The buttons (a primary one first). */
  actions?: ReactNode;
  headingLevel?: "h2" | "h3";
  /** Of its heading: another one when the card is shown twice on a page. */
  id?: string;
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-2.5", className)}>
      <Heading
        id={id}
        className="inline-flex items-center gap-2 text-lk-label font-semibold text-lk-blue-dark"
      >
        <span aria-hidden="true" className="lk-gradient-brand size-2 shrink-0 rounded-full" />
        {label}
      </Heading>
      {/* In the outline of the gradient (2026-11-25): the one thing to do now stands out. */}
      <div className="lk-gradient-border flex flex-col gap-4 rounded-lk-3xl p-4 shadow-lk-d-featured md:p-6">
        <div className="flex items-start gap-4">
          <span className="lk-gradient flex size-12 shrink-0 items-center justify-center rounded-lk-lg shadow-lk-d-badge">
            <Icon aria-hidden="true" strokeWidth={1.75} className="size-6 text-white" />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pt-0.5">
            <p className="text-lk-c-card font-semibold text-wide text-lk-ink">{title}</p>
            {detail ? <p className="text-lk-compact text-lk-ink-2">{detail}</p> : null}
          </div>
        </div>
        {actions ? (
          // Side by side on a phone, sharing the width (one under the other
          // when their labels need it); from 768 px their own width, under the text.
          <div className="flex flex-wrap gap-2.5 md:pl-16 [&>*]:flex-[1_1_9rem] [&>*]:md:flex-none">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
