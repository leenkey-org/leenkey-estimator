import type { ReactNode } from "react";
import { Accented } from "./accented";
import { cn } from "@/lib/utils";

export type MarketingSectionProps = {
  /** Anchor of the section (« #tarifs »), also the id of its title. */
  id?: string;
  /** surface: white; stone: the neutral flat of the marketing pages (DESIGN.md 2.1). */
  tone?: "surface" | "stone";
  title: string;
  /** The words of the title set in blue (« votre vente ? »), as in the V1 titles. */
  accent?: string;
  /** HTML level of the title: h1 for the first section of a page without a hero, h2 after one. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /** Body text under the title, 640 px wide at most (bold parts allowed). */
  lead?: ReactNode;
  /** Link on the right of the title from 768 px, under it before. */
  action?: ReactNode;
  /**
   * The content rises into place in one block when it enters the screen
   * (DESIGN.md 9); false when its items do it one after the other
   * (data-reveal-stagger on a grid).
   */
  revealContent?: boolean;
  children?: ReactNode;
  className?: string;
};

/**
 * Section of a public page (G1, docs/DESIGN.md 11): full width, white or
 * stone, 1200 px container, 48 then 72 px of vertical padding. Its title is
 * an h2 with the H1 role (26 then 40 px, wide, its accent in blue) under the
 * display title of the hero; no label above it (DESIGN.md 13.2). The title
 * and the content rise into place when they enter the screen.
 */
export function MarketingSection({
  id,
  tone = "surface",
  title,
  accent,
  titleAs: Title = "h2",
  lead,
  action,
  revealContent = true,
  children,
  className,
}: MarketingSectionProps) {
  const titleId = id ? `${id}-titre` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        // The sticky header (60 px, then the 72 px TopNav) never covers the
        // title of an anchor.
        "scroll-mt-15 md:scroll-mt-18",
        tone === "stone" ? "bg-lk-stone" : "bg-lk-surface",
        className,
      )}
    >
      <div className="mx-auto max-w-lk-page px-5 py-12 md:px-10 lg:py-18">
        <div
          data-reveal=""
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10"
        >
          <div className="flex max-w-lk-heading flex-col gap-3 lg:gap-4">
            <Title
              id={titleId}
              className="text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-section-lg"
            >
              <Accented text={title} accent={accent} className="text-lk-blue" />
            </Title>
            {lead ? (
              <p className="max-w-lk-prose text-lk-body text-pretty text-lk-ink-2 md:text-lk-body-lg lg:text-lk-lead-lg">
                {lead}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children ? (
          <div
            data-reveal={revealContent ? "" : undefined}
            data-reveal-delay={revealContent ? "1" : undefined}
            className="mt-8 lg:mt-12"
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
