import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

export type ComingSoonProps = {
  /** « Votre messagerie arrive ». */
  title: string;
  /** HTML level, under the H1 of the page by default. */
  titleAs?: "h2" | "h3" | "h4";
  /** One sentence on the screen that arrives, never a date. */
  text: string;
  /** Optional single action, e.g. a way to go on meanwhile. */
  action?: ReactNode;
  className?: string;
};

/**
 * Page whose screen comes with a later task (docs/DESIGN.md 10.8): the
 * EmptyState, under the H1 of the page.
 */
export function ComingSoon({ title, titleAs = "h2", text, action, className }: ComingSoonProps) {
  return (
    <EmptyState
      titleAs={titleAs}
      title={title}
      description={text}
      action={action}
      className={cn("py-10 md:py-14", className)}
    />
  );
}
