import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { NEXT_MS, delay, heroTitle } from "./hero-title";
import { cn } from "@/lib/utils";

export type ShowcaseHeroProps = {
  /** Anchor of the hero (« #valoriser »), also the id of its title. */
  id: string;
  /** The pill above the title (« Ni agence, ni seul · Vendre accompagné »), its icon first. */
  badge?: { text: string; icon: LucideIcon };
  /** Or the label in capitals of the V1 pages (« Qui sommes-nous »). */
  eyebrow?: string;
  title: string;
  /** The words of the title in the light blue gradient (« votre vente. »). */
  accent?: string;
  lead?: ReactNode;
  /** The calls to action, under the text. */
  actions?: ReactNode;
  /** What follows them (the three promises of the home page). */
  children?: ReactNode;
  /** The right column from 1024 px, under the text before: a photo and what lies on it. */
  aside?: ReactNode;
  /** HTML level of the title: h1 on a page, lower in the /design catalogue. */
  titleAs?: "h1" | "h2" | "h3" | "h4";
};

/**
 * Hero of the public pages in the direction of the V1 (docs/DESIGN.md 1 and
 * 13.1, L1-49, L1-50): deep navy towards the brand blue with a grid of
 * dots, the pill or the label in capitals above the display title, the
 * title word by word with its words in the light blue gradient over the
 * dimension line (one line under each of its lines when it is long), the
 * text, the actions, then what follows, one after the other on the first
 * paint. A photo on the right from 1024 px (columns 1.05 / 0.95), under the
 * text before; without one, the text keeps a reading width.
 */
export function ShowcaseHero({
  id,
  badge,
  eyebrow,
  title,
  accent,
  lead,
  actions,
  children,
  aside,
  titleAs: Title = "h1",
}: ShowcaseHeroProps) {
  const titleId = `${id}-titre`;
  const words = heroTitle(title, accent, {
    accentClassName: "lk-text-grad-light",
    lineClassName: "text-lk-blue-light",
    decorationClassName: "decoration-lk-blue-light",
  });
  const Icon = badge?.icon;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="lk-hero-bg relative isolate scroll-mt-15 overflow-hidden text-white md:scroll-mt-18"
    >
      <div aria-hidden="true" className="lk-dots pointer-events-none absolute inset-0 -z-10" />
      <div
        className={cn(
          "mx-auto grid max-w-lk-page items-center gap-12 px-5 pt-10 pb-16 md:px-10 md:pt-14 md:pb-20 lg:gap-12 lg:pt-16 lg:pb-24",
          aside && "lg:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        <div className={cn("flex flex-col items-start", !aside && "max-w-190")}>
          {badge && Icon ? (
            <p className="lk-rise inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/10 px-3.25 py-1.5 text-lk-caption font-semibold">
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {badge.text}
            </p>
          ) : eyebrow ? (
            <p className="lk-rise text-lk-secondary font-bold tracking-lk-eyebrow text-lk-blue-light uppercase">
              {eyebrow}
            </p>
          ) : null}
          <Title
            id={titleId}
            // Word by word, the title is read whole: by its name, the words
            // hidden from assistive technologies.
            aria-label={title}
            className={cn(
              "text-lk-display font-extrabold text-wide md:text-lk-display-md lg:text-lk-display-lg",
              (badge || eyebrow) && "mt-5 lg:mt-6",
            )}
          >
            <span aria-hidden="true">{words.content}</span>
          </Title>
          {lead ? (
            <div
              style={delay(words.last + NEXT_MS)}
              className="lk-rise mt-5 flex max-w-140 flex-col gap-4 text-lk-body-lg text-pretty text-white/80 lg:mt-6 lg:text-lk-lead-lg"
            >
              {typeof lead === "string" ? <p>{lead}</p> : lead}
            </div>
          ) : null}
          {actions ? (
            <div
              style={delay(words.last + 2 * NEXT_MS)}
              // On the dark of the hero, the focus ring of the actions turns
              // white (the blue would not reach 3:1).
              className="lk-rise mt-8 flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-6 [&_:focus-visible]:outline-white"
            >
              {actions}
            </div>
          ) : null}
          {children ? (
            <div style={delay(words.last + 3 * NEXT_MS)} className="lk-rise w-full">
              {children}
            </div>
          ) : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
