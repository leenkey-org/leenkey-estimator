import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Eye,
  HeartHandshake,
  KeyRound,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Accented } from "@/components/shared/accented";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { frSiteAbout } from "@/lib/i18n/sections/site/about";
import { cn } from "@/lib/utils";
import {
  card,
  cardDark,
  cardText,
  cardTextDark,
  cardTitle,
  cardTitleDark,
  iconTile,
} from "./site-styles";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { site: { about: frSiteAbout } } as const;

// Sections of /qui-sommes-nous, in the order of the text given by Cédric on
// 2026-11-19 (word for word, fr.site.about): the hero on the night with his
// photo and his name on it, his story, the mission, the assistant, the
// adviser, the plans, the commitments, what comes next, the last call. No
// figure on this page: none of them is confirmed.

const t = fr.site.about;
/** Photo of the founder, reduced to 720 × 960 in WebP (38 KB). */
const PHOTO = { src: "/brand/cedric.webp", width: 720, height: 960 } as const;
/** The icons of the five commitments, in their order. */
const COMMITMENT_ICONS = [KeyRound, ListChecks, Eye, Sparkles, HeartHandshake] as const;

/** « Vendre son bien immobilier autrement. Sans agence, mais jamais seul. » */
export function AboutHero() {
  return (
    <ShowcaseHero
      id="qui-sommes-nous"
      eyebrow={t.hero.eyebrow}
      title={t.hero.title}
      accent={t.hero.accent}
      lead={
        <>
          {t.hero.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p className="font-bold text-white">{t.hero.closing}</p>
        </>
      }
      aside={<FounderPhoto />}
    />
  );
}

/**
 * Cédric's photo, as in the V1: 3:4 in its shadow, his name and his role in
 * a white card over its lower left corner, his initials in the gradient.
 * Still on the first paint, as the photo of the home page: it is the
 * largest element of the screen.
 */
function FounderPhoto() {
  return (
    <figure className="relative mx-auto w-full max-w-110 lg:mr-0 lg:ml-auto">
      <Image
        src={PHOTO.src}
        width={PHOTO.width}
        height={PHOTO.height}
        alt={t.founder.photoAlt}
        unoptimized
        priority
        // next/image 15 preloads a priority image without saying it is urgent.
        fetchPriority="high"
        className="aspect-3/4 w-full rounded-lk-xl border border-white/10 bg-lk-navy object-cover shadow-lk-photo"
      />
      <figcaption className="absolute bottom-6 left-4 flex items-center gap-3 rounded-lk-xl bg-lk-surface py-3.5 pr-5 pl-3.5 text-lk-ink shadow-lk-lift md:bottom-8 lg:-left-5">
        <span
          aria-hidden="true"
          className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-linear-135 from-lk-blue to-lk-blue-mid text-lk-title font-bold text-white"
        >
          {t.founder.initials}
        </span>
        <span className="flex flex-col">
          <span className="text-lk-body font-bold">{t.founder.name}</span>
          <span className="text-lk-caption text-lk-ink-3">{t.founder.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** The column of text of a section: the reading width, centred under the head. */
function Prose({ dark = false, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-lk-prose flex-col gap-5 text-lk-body-lg text-pretty lg:text-lk-lead-lg",
        dark ? "text-white/72" : "text-lk-ink-2",
      )}
    >
      {children}
    </div>
  );
}

function Paragraphs({ items }: { items: readonly string[] }) {
  return items.map((paragraph) => <p key={paragraph}>{paragraph}</p>);
}

/** A list of the text in a card, each line after a check; two columns from 768 px. */
function CheckList({ items, dark = false }: { items: readonly string[]; dark?: boolean }) {
  return (
    <ul
      className={cn(
        dark ? cardDark : card,
        "my-1 grid gap-x-8 gap-y-4 text-lk-body md:grid-cols-2",
        dark ? "text-white" : "text-lk-ink",
      )}
    >
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check
            aria-hidden="true"
            className={cn("mt-1 size-4 shrink-0", dark ? "text-lk-blue-light" : "text-lk-blue")}
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** « Une idée née de l'expérience du terrain »: Cédric's words, his question framed, signed. */
export function StorySection() {
  return (
    <MarketingSection
      id="histoire"
      tone="mist"
      look="showcase"
      eyebrow={t.story.eyebrow}
      title={t.story.title}
    >
      <Prose>
        <Paragraphs items={t.story.paragraphs} />
        <p className="rounded-lk-md border-l-4 border-lk-blue bg-lk-blue-tint px-6 py-5 font-semibold text-lk-ink">
          {t.story.question}
        </p>
        <Paragraphs items={t.story.after} />
        <p className="mt-3 text-lk-body font-semibold text-lk-ink">{t.story.signature}</p>
      </Prose>
    </MarketingSection>
  );
}

/** « Vous donner les clés de votre vente » */
export function MissionSection() {
  return (
    <MarketingSection
      id="mission"
      look="showcase"
      eyebrow={t.mission.eyebrow}
      title={t.mission.title}
    >
      <Prose>
        <Paragraphs items={t.mission.paragraphs} />
      </Prose>
    </MarketingSection>
  );
}

/** « Un assistant IA disponible 24 h/24, 7 j/7 », on the night: what it helps with, in a card. */
export function TechnologySection() {
  return (
    <MarketingSection
      id="technologie"
      tone="navy"
      look="showcase"
      eyebrow={t.technology.eyebrow}
      title={t.technology.title}
    >
      <Prose dark>
        <Paragraphs items={t.technology.paragraphs} />
        <CheckList dark items={t.technology.items} />
        <Paragraphs items={t.technology.after} />
        <p className="mt-3 font-bold text-white">{t.technology.closing}</p>
      </Prose>
    </MarketingSection>
  );
}

/** « Un véritable accompagnement, lorsque vous en avez besoin »: the adviser, what he does and does not. */
export function HumanSection() {
  return (
    <MarketingSection
      id="accompagnement"
      tone="mist"
      look="showcase"
      eyebrow={t.human.eyebrow}
      title={t.human.title}
    >
      <Prose>
        <Paragraphs items={t.human.paragraphs} />
        <CheckList items={t.human.items} />
        <Paragraphs items={t.human.after} />
      </Prose>
    </MarketingSection>
  );
}

/** « Des tarifs connus à l'avance, sans commission sur la vente »: the three plans, without a price. */
export function PricingModelSection() {
  return (
    <MarketingSection
      id="modele"
      look="showcase"
      eyebrow={t.pricing.eyebrow}
      title={t.pricing.title}
      revealContent={false}
    >
      <div className="flex flex-col gap-8 lg:gap-10">
        <Prose>
          <Paragraphs items={t.pricing.paragraphs} />
        </Prose>
        <ul data-reveal-stagger="" className="grid gap-5 md:grid-cols-3">
          {t.pricing.plans.map((plan) => (
            <li key={plan.title} className={cn(card, "flex flex-col gap-3")}>
              <h3 className={cardTitle}>{plan.title}</h3>
              <p className={cardText}>{plan.text}</p>
            </li>
          ))}
        </ul>
        <Prose>
          <Paragraphs items={t.pricing.after} />
        </Prose>
      </div>
    </MarketingSection>
  );
}

/** « Ce qui guide le développement de Leenkey »: the five commitments on the night. */
export function CommitmentsSection() {
  return (
    <MarketingSection
      id="engagements"
      tone="navy"
      look="showcase"
      eyebrow={t.commitments.eyebrow}
      title={t.commitments.title}
      revealContent={false}
    >
      {/* Five cards: three then two, the last row centred from 1024 px. */}
      <ul data-reveal-stagger="" className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {t.commitments.items.map((item, index) => {
          const Icon = COMMITMENT_ICONS[index] ?? KeyRound;
          return (
            <li
              key={item.title}
              className={cn(
                cardDark,
                "flex flex-col gap-3 lg:col-span-2",
                index === 3 && "lg:col-start-2",
              )}
            >
              <span className="mb-2 flex size-12 items-center justify-center rounded-lk-lg bg-linear-135 from-lk-blue to-lk-blue-mid text-white">
                <Icon aria-hidden="true" className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className={cardTitleDark}>{item.title}</h3>
              <p className={cardTextDark}>{item.text}</p>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/** « Continuer à donner plus d'autonomie aux propriétaires » */
export function FutureSection() {
  return (
    <MarketingSection
      id="demain"
      tone="mist"
      look="showcase"
      eyebrow={t.future.eyebrow}
      title={t.future.title}
    >
      <Prose>
        <Paragraphs items={t.future.paragraphs} />
      </Prose>
    </MarketingSection>
  );
}

/**
 * « Prêt à vendre autrement ? », on white: the light last call of the site
 * (CtaPanel) with the last words of the text under its paragraph, then the
 * contact form of the site or the valuation.
 */
export function AboutCta() {
  const titleId = "cta-final-titre";
  return (
    <section aria-labelledby={titleId} className="bg-lk-surface text-lk-ink">
      <div
        data-reveal=""
        className="mx-auto flex max-w-lk-heading flex-col items-center px-5 py-16 text-center md:px-10 lg:py-24"
      >
        <h2
          id={titleId}
          className="text-lk-h1-lg font-bold text-wide text-balance md:text-lk-section-lg lg:text-lk-showcase"
        >
          <Accented text={t.final.title} accent={t.final.accent} className="lk-text-grad" />
        </h2>
        <p className="mt-4 max-w-lk-prose text-lk-body-lg text-pretty text-lk-ink-2 lg:text-lk-lead-lg">
          {t.final.text}
        </p>
        <p className="mt-4 max-w-lk-prose text-lk-body-lg font-bold text-balance lg:text-lk-lead-lg">
          {t.final.closing}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 md:flex-row">
          <Button asChild variant="cta" size="lg" trailingIcon={ArrowRight}>
            <Link href={ROUTES.contact}>{t.final.contact}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={ROUTES.valuation}>{t.final.valuation}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
