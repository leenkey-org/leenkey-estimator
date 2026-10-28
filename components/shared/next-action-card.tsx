import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The one thing to do now (docs/DESIGN.md 10.4 NextActionCard): « Prochaine
 * action » above, then a white card, its pictogram in the gradient on the
 * light indigo, a title, a detail, and one or two actions side by side.
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
      <Heading id={id} className="text-lk-label font-semibold text-lk-blue">
        {label}
      </Heading>
      <div className="flex flex-col gap-4 rounded-lk-2xl border border-lk-line bg-lk-surface p-4 md:p-5">
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lk-sm bg-lk-blue-tint">
            <Icon aria-hidden="true" strokeWidth={1.8} className="lk-icon-gradient size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-lk-title font-semibold text-lk-ink">{title}</p>
            {detail ? <p className="text-lk-compact text-lk-ink-3">{detail}</p> : null}
          </div>
        </div>
        {actions ? (
          // Side by side on a phone, sharing the width (one under the other
          // when their labels need it); from 768 px their own width, under the text.
          <div className="flex flex-wrap gap-2.5 md:pl-13.5 [&>*]:flex-[1_1_9rem] [&>*]:md:flex-none">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
