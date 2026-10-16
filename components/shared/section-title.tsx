import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionTitleProps = {
  children: ReactNode;
  /** HTML level, set by the page outline; the style stays the H3 role. */
  as?: "h2" | "h3" | "h4";
  id?: string;
  /** Link or button on the right, e.g. « Toutes les étapes ». */
  action?: ReactNode;
  className?: string;
};

/**
 * Section title (docs/DESIGN.md 3.2, « H3 / titre de section »): 16 px then
 * 17 px from 1024 px, weight 600, normal width and case, never numbered.
 */
export function SectionTitle({
  children,
  as: Tag = "h2",
  id,
  action,
  className,
}: SectionTitleProps) {
  const heading = (
    <Tag
      id={id}
      className={cn("text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg", !action && className)}
    >
      {children}
    </Tag>
  );
  if (!action) return heading;
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      {heading}
      {action}
    </div>
  );
}
