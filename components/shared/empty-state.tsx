import type { ReactNode } from "react";
import { FacadeDrawing } from "./facade-drawing";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: string;
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /** One useful sentence (SPEC-V2 section 6, « Le ton »). */
  description?: string;
  /** A single action: Button primary, or inverse on the blue flat. */
  action?: ReactNode;
  /** light: on white or --lk-bg; blue: on a BrandPanel or the blue flat. */
  tone?: "light" | "blue";
  className?: string;
};

/**
 * Empty state (docs/DESIGN.md 10.8): facade.svg at 150 × 83, wide title,
 * one sentence, one action, centred in 360 px. Never « Aucun résultat » alone.
 */
export function EmptyState({
  title,
  titleAs: Title = "h2",
  description,
  action,
  tone = "light",
  className,
}: EmptyStateProps) {
  const onBlue = tone === "blue";
  return (
    <div
      className={cn("mx-auto flex max-w-90 flex-col items-center gap-4.5 text-center", className)}
    >
      <FacadeDrawing
        className={cn("h-20.75 w-37.5", onBlue ? "text-white opacity-55" : "text-lk-ink-3")}
      />
      <Title
        className={cn("text-lk-h2 font-bold text-wide", onBlue ? "text-white" : "text-lk-ink")}
      >
        {title}
      </Title>
      {description ? (
        <p className={cn("text-lk-compact", onBlue ? "text-lk-on-blue-2" : "text-lk-ink-2")}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
