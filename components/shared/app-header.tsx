import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Header of the form screens and sub-pages (docs/DESIGN.md 10.4 AppHeader):
 * white, line border below, 20 × 20 × 14. Back on the left (IconButton
 * stone), title 15 px 600 in the middle, an action on the right (« Enregistrer
 * », ghost) or a 44 px space to keep the title centred; an optional progress
 * bar below, 14 px apart.
 */
export function AppHeader({
  title,
  titleAs: Title = "h1",
  back,
  action,
  progress,
  className,
}: {
  /** The H1 of the page. */
  title: string;
  /** Another level where the page has its own H1 (/design). */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  back: ReactNode;
  action?: ReactNode;
  progress?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-lk-line bg-lk-surface px-5 pt-5 pb-3.5", className)}>
      <div className="mx-auto flex max-w-lk-form flex-col gap-3.5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {back}
          <Title className="truncate text-center text-lk-title font-semibold text-lk-ink">
            {title}
          </Title>
          {action ?? <span aria-hidden="true" className="size-11" />}
        </div>
        {progress}
      </div>
    </header>
  );
}
