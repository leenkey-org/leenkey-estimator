import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  ChartLine,
  Check,
  CircleX,
  Euro,
  LayoutPanelLeft,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CtaPanel } from "./cta-panel";
import { NumberBadge } from "./number-badge";
import { RichText } from "./rich-text";
import {
  card,
  cardDark,
  cardText,
  cardTextDark,
  cardTitle,
  iconTile,
  statement,
} from "./site-styles";

// Sections of /concept (L1-42), in the order of the V1 page, in its
// direction since L1-50 (DECISIONS 2026-10-23): its hero, its labels above
// the titles, its cards. Texts: fr.site.concept.

const t = fr.site.concept;

/** The icons of the four things the valuation opens, as in the V1. */
const NEXT_ICONS = [Camera, LayoutPanelLeft, Users, Euro] as const;

/** « Combien vaut vraiment votre bien ? » */
export function ConceptHero() {
  return (
    <ShowcaseHero
      id="concept"
      badge={{ text: t.hero.badge, icon: Search }}
      title={t.hero.title}
      accent={t.hero.accent}
      lead={t.hero.lead}
      actions={
        <Button
          asChild
          variant="cta"
          size="lg"
          trailingIcon={ArrowRight}
          className="focus-visible:outline-white"
        >
          <Link href={ROUTES.valuation}>{t.hero.action}</Link>
        </Button>
      }
    />
  );
}

/**
 * The agency, or alone without a tool, each behind the red cross of the V1
 * (« Option 1 », « Option 2 »), « ou » in a round between them; then the
 * one question that counts, centred, its end in the blue gradient.
 */
export function OptionsSection() {
  const [agency, alone] = t.options.items;
  return (
    <MarketingSection
      id="idee"
      look="showcase"
      eyebrow={t.options.eyebrow}
      title={t.options.title}
      lead={t.options.lead}
    >
      <OptionPair
        or={t.options.or}
        options={[agency, alone].map((option, index) => (
          <>
            <p className="flex items-center gap-1.5 text-lk-caption font-bold tracking-lk-caps text-lk-danger uppercase">
              <CircleX aria-hidden="true" className="size-4 shrink-0" />
              {t.options.option(index + 1)}
            </p>
            <h3 className={cardTitle}>{option.title}</h3>
            <p className={cardText}>{option.text}</p>
          </>
        ))}
      />
      <div className="mx-auto mt-12 flex max-w-lk-prose flex-col gap-4 text-center lg:mt-14">
        <p className={statement}>
          <RichText parts={t.options.question} strongClassName="lk-text-grad" />
        </p>
        <p className={cardText}>{t.options.answer}</p>
      </div>
    </MarketingSection>
  );
}

/**
 * Two options side by side from 1024 px, each in a card, « ou » in a round
 * between them (here, and the market of /investir).
 */
export function OptionPair({ options, or }: { options: readonly ReactNode[]; or: string }) {
  return (
    <div className="mx-auto grid max-w-220 items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-5">
      {options.map((content, index) => (
        <div key={index} className="contents">
          {index === 1 ? (
            <p className="mx-auto flex size-11 items-center justify-center rounded-full border border-lk-mist-line bg-lk-surface text-lk-caption font-semibold text-lk-ink-3">
              {or}
            </p>
          ) : null}
          <div className={cn(card, "flex h-full flex-col gap-2")}>{content}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * « L'outil de valorisation. », on navy as in the V1: what was studied,
 * taken into account, produced, in four glass cards numbered 01 to 04, then
 * the line of the V1 in a frame of the light blue with its icon.
 */
export function ToolSection() {
  return (
    <MarketingSection
      id="outil"
      look="showcase"
      tone="navy"
      eyebrow={t.tool.eyebrow}
      title={t.tool.title}
      lead={t.tool.lead}
      revealContent={false}
    >
      <ol data-reveal-stagger="" className="grid gap-5 md:grid-cols-2">
        {t.tool.items.map((item, index) => (
          <li key={item.title} className={cn(cardDark, "flex flex-col gap-3")}>
            <p className="flex items-center gap-3 text-lk-caption font-bold tracking-lk-caps text-lk-blue-light uppercase">
              <NumberBadge value={index + 1} size="sm" />
              {item.label}
            </p>
            <h3 className="text-lk-h3-lg font-bold text-white lg:text-lk-h2">{item.title}</h3>
            {"list" in item ? (
              <ul className="flex flex-col gap-2">
                {item.list.map((line) => (
                  <li key={line} className="flex gap-2.5 text-lk-compact text-white/80">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-lk-blue-light"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cardTextDark}>{item.text}</p>
            )}
          </li>
        ))}
      </ol>
      <div
        data-reveal=""
        className="mx-auto mt-10 flex max-w-220 flex-col items-start gap-5 rounded-lk-xl border border-lk-blue-light/25 bg-lk-blue/15 p-6 md:flex-row md:items-center md:px-8 lg:mt-12"
      >
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-lk-lg bg-linear-135 from-lk-blue to-lk-blue-mid text-white shadow-lk-cta"
        >
          <ChartLine className="size-6" />
        </span>
        <p className="text-lk-body-lg text-pretty text-white">
          <RichText parts={t.tool.quote} strongClassName="font-semibold text-lk-blue-light" />{" "}
          {t.tool.after}
        </p>
      </div>
    </MarketingSection>
  );
}

/** « La valorisation est le déclencheur. »: what the platform opens, each with its icon. */
export function NextSection() {
  return (
    <MarketingSection
      id="ensuite"
      look="showcase"
      eyebrow={t.next.eyebrow}
      title={t.next.title}
      lead={t.next.lead}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-5 md:grid-cols-2">
        {t.next.items.map((item, index) => {
          const Icon = NEXT_ICONS[index] ?? Users;
          return (
            <li key={item.title} className={cn(card, "flex flex-col gap-3")}>
              <div className="flex items-center gap-4">
                <span className={iconTile}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className={cardTitle}>{item.title}</h3>
              </div>
              <p className={cardText}>{item.text}</p>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/** « Commencez par la bonne question. » */
export function ConceptCta() {
  return (
    <CtaPanel
      title={t.final.title}
      text={t.final.text}
      action={t.final.action}
      href={ROUTES.valuation}
      note={t.final.note}
    />
  );
}
