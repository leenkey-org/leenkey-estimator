import type { ReactNode } from "react";
import { Accented } from "./accented";
import { cn } from "@/lib/utils";

export type MarketingSectionProps = {
  /** Anchor of the section (« #tarifs »), also the id of its title. */
  id?: string;
  /**
   * surface: white; stone: the neutral flat of the marketing pages (DESIGN.md
   * 2.1); navy: the dark flat of the V1 showcase sections (white text, accent
   * in --lk-blue-light).
   */
  tone?: "surface" | "stone" | "navy";
  /** start: title on the left, link on its right; center: the V1 showcase sections. */
  align?: "start" | "center";
  title: string;
  /** The words of the title set in blue (« votre vente ? »), as in the V1 titles. */
  accent?: string;
  /** HTML level of the title: h1 for the first section of a page without a hero, h2 after one. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /** Body text under the title, 640 px wide at most (bold parts allowed). */
  lead?: ReactNode;
  /** Link on the right of the title from 768 px, under it before (and when centred). */
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

const BACKGROUND = { surface: "bg-lk-surface", stone: "bg-lk-stone", navy: "bg-lk-navy" } as const;

/**
 * Section of a public page (G1, docs/DESIGN.md 11): full width, white, stone
 * or navy, 1200 px container, 48 then 72 px of vertical padding. Its title is
 * an h2 with the H1 role (26 then 40 px, wide, its accent in blue) under the
 * display title of the hero; no label above it (DESIGN.md 13.2). The title
 * and the content rise into place when they enter the screen.
 */
export function MarketingSection({
  id,
  tone = "surface",
  align = "start",
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
  const dark = tone === "navy";
  const center = align === "center";
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        // The sticky header (60 px, then the 72 px TopNav) never covers the
        // title of an anchor.
        "scroll-mt-15 md:scroll-mt-18",
        BACKGROUND[tone],
        className,
      )}
    >
      <div className="mx-auto max-w-lk-page px-5 py-12 md:px-10 lg:py-18">
        <div
          data-reveal=""
          className={cn(
            "flex flex-col gap-4",
            center
              ? "items-center text-center"
              : "md:flex-row md:items-end md:justify-between md:gap-10",
          )}
        >
          <div
            className={cn(
              "flex max-w-lk-heading flex-col gap-3 lg:gap-4",
              center && "items-center",
            )}
          >
            <Title
              id={titleId}
              className={cn(
                "text-lk-h1 font-bold text-wide text-balance lg:text-lk-section-lg",
                dark ? "text-white" : "text-lk-ink",
              )}
            >
              <Accented
                text={title}
                accent={accent}
                className={dark ? "text-lk-blue-light" : "text-lk-blue"}
              />
            </Title>
            {lead ? (
              <p
                className={cn(
                  "max-w-lk-prose text-lk-body text-pretty md:text-lk-body-lg lg:text-lk-lead-lg",
                  dark ? "text-white/72" : "text-lk-ink-2",
                )}
              >
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
