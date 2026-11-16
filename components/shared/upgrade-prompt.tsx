"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type UpgradePromptProps = {
  /** Id of the title, which names the region. */
  id: string;
  title: string;
  children: ReactNode;
  /** The link to the plans (« Voir l'accompagnement »). */
  action: ReactNode;
  dismissLabel: string;
  onDismiss: () => void;
  headingAs?: "h2" | "h3";
  className?: string;
};

/**
 * A plan proposed in context (docs/DESIGN.md 10.4, SPEC-V2 11 bis): blue
 * tint, 1 px blue line, radius 6, padding 14 × 16; title 14 px 600, text
 * 13 px, a ghost link; a close button X of 16 px that hides it. Always after
 * the useful content of a page, never in a dialog, never before an action.
 */
export function UpgradePrompt({
  id,
  title,
  children,
  action,
  dismissLabel,
  onDismiss,
  headingAs: Heading = "h2",
  className,
}: UpgradePromptProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "relative flex flex-col gap-1.5 rounded-lk-md border border-lk-blue-line bg-lk-blue-tint py-3.5 pr-11 pl-4",
        className,
      )}
    >
      <Heading id={id} className="text-lk-label font-semibold text-lk-ink">
        {title}
      </Heading>
      <div className="text-lk-secondary text-lk-ink-2">{children}</div>
      <div className="pt-0.5">{action}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        // A target of 40 px around the 16 px icon.
        className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-full text-lk-ink-3 hover:bg-lk-surface hover:text-lk-ink focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-solid focus-visible:outline-lk-brand-blue"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </section>
  );
}
