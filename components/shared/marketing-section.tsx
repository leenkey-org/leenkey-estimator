import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MarketingSectionProps = {
  /** Anchor of the section (« #tarifs »), also the id of its title. */
  id?: string;
  /** surface: white; stone: the neutral flat of the marketing pages (DESIGN.md 2.1). */
  tone?: "surface" | "stone";
  title: string;
  /** HTML level of the title: h1 for the first section of a page without a hero, h2 after one. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
  /** Body text under the title, 640 px wide at most. */
  lead?: string;
  /** Link on the right of the title from 768 px, under it before. */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Section of a public page (G1, docs/DESIGN.md 11): full width, white or
 * stone, 1200 px container, 48 then 72 px of vertical padding. Its title is
 * an h2 with the H1 role (26 then 32 px, wide) under the display title of
 * the hero; no label above it (DESIGN.md 13.2).
 */
export function MarketingSection({
  id,
  tone = "surface",
  title,
  titleAs: Title = "h2",
  lead,
  action,
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="flex max-w-lk-prose flex-col gap-3">
            <Title
              id={titleId}
              className="text-lk-h1 font-bold text-wide text-balance text-lk-ink lg:text-lk-h1-lg"
            >
              {title}
            </Title>
            {lead ? (
              <p className="text-lk-body text-pretty text-lk-ink-2 lg:text-lk-body-lg">{lead}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children ? <div className="mt-8 lg:mt-10">{children}</div> : null}
      </div>
    </section>
  );
}
