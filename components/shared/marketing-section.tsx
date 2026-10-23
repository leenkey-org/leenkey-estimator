import type { ReactNode } from "react";
import { Accented } from "./accented";
import { cn } from "@/lib/utils";

export type MarketingSectionProps = {
  /** Anchor of the section (« #tarifs »), also the id of its title. */
  id?: string;
  /**
   * surface: white; stone: the neutral flat of the marketing pages (DESIGN.md
   * 2.1); mist: the light cool flat of the V1 home page (L1-49); navy: the
   * dark flat of the V1 showcase sections (white text, accent in
   * --lk-blue-light).
   */
  tone?: "surface" | "stone" | "mist" | "navy";
  /**
   * showcase: a section of the home page in the direction of the V1 (L1-49):
   * centred head, label above the title, larger title with its words in the
   * blue gradient (in plain blue on stone, where the gradient would not reach
   * 3:1), more room. Title on the left with its link on its right otherwise.
   */
  look?: "facade" | "showcase";
  /** The label above the title in the V1 (« Votre projet »), showcase only. */
  eyebrow?: string;
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

const BACKGROUND = {
  surface: "bg-lk-surface",
  stone: "bg-lk-stone",
  mist: "bg-lk-mist",
  navy: "bg-lk-navy",
} as const;

/**
 * Section of a public page (G1, docs/DESIGN.md 11): full width, white, stone,
 * mist or navy, 1200 px container, 48 then 72 px of vertical padding. Its
 * title is an h2 with the H1 role (26 then 40 px, wide, its accent in blue)
 * under the display title of the hero; no label above it (DESIGN.md 13.2).
 * Showcase (home page, L1-49): the V1 section head, its label in capitals
 * above the title, 32, 40 then 48 px, 56 then 96 px of vertical padding. The
 * title and the content rise into place when they enter the screen.
 */
export function MarketingSection({
  id,
  tone = "surface",
  look = "facade",
  eyebrow,
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
  const showcase = look === "showcase";
  const gradient = showcase && tone !== "stone";
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
      <div
        className={cn(
          "mx-auto max-w-lk-page px-5 md:px-10",
          showcase ? "py-14 md:py-18 lg:py-24" : "py-12 lg:py-18",
        )}
      >
        <div
          data-reveal=""
          className={cn(
            "flex flex-col gap-4",
            showcase
              ? "items-center text-center"
              : "md:flex-row md:items-end md:justify-between md:gap-10",
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-3 lg:gap-4",
              showcase ? "max-w-170" : "max-w-lk-heading",
              showcase && "items-center",
            )}
          >
            {showcase && eyebrow ? (
              <p
                className={cn(
                  "mb-1 text-lk-eyebrow font-extrabold tracking-lk-eyebrow uppercase lg:mb-2 lg:text-lk-eyebrow-lg",
                  dark ? "text-lk-blue-light" : "text-lk-blue",
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <Title
              id={titleId}
              className={cn(
                "font-bold text-wide text-balance",
                showcase
                  ? "text-lk-h1-lg md:text-lk-section-lg lg:text-lk-showcase"
                  : "text-lk-h1 lg:text-lk-section-lg",
                dark ? "text-white" : "text-lk-ink",
              )}
            >
              <Accented
                text={title}
                accent={accent}
                className={
                  gradient
                    ? dark
                      ? "lk-text-grad-light"
                      : "lk-text-grad"
                    : dark
                      ? "text-lk-blue-light"
                      : "text-lk-blue"
                }
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
            className={showcase ? "mt-10 lg:mt-14" : "mt-8 lg:mt-12"}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
