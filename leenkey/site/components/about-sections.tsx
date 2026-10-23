import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, CircleCheck, Plus, User } from "lucide-react";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { CtaPanel } from "./cta-panel";
import { RichText } from "./rich-text";
import { cardDark, cardTextDark, cardTitleDark } from "./site-styles";

// Sections of /qui-sommes-nous (L1-43), in the order of the V1 page, in its
// direction since L1-50 (DECISIONS 2026-10-23): Cédric's photo in the hero
// with his name on it, the figures in the gradient, his words centred, the
// values on navy, the white last call. Texts: fr.site.about.

const t = fr.site.about;
/** Photo of the founder, reduced to 720 × 960 in WebP (38 KB). */
const PHOTO = { src: "/brand/cedric.webp", width: 720, height: 960 } as const;
/** The icons of the values, those of the V1. */
const VALUE_ICONS = [Plus, CircleCheck, User, Activity] as const;

/** « Rendre la vente immobilière enfin simple, humaine et transparente. » */
export function AboutHero() {
  return (
    <ShowcaseHero
      id="qui-sommes-nous"
      eyebrow={t.hero.eyebrow}
      title={t.hero.title}
      accent={t.hero.accent}
      lead={t.hero.lead}
      actions={
        <Button asChild variant="cta" size="lg" trailingIcon={ArrowRight}>
          <Link href={ROUTES.invest}>{t.hero.action}</Link>
        </Button>
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
          className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-linear-135 from-lk-blue to-lk-blue-mid text-lk-title font-extrabold text-white"
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

/** The figures of the founder's career, centred on white, in the blue gradient. */
export function AboutFigures() {
  return (
    <div className="border-b border-lk-mist-line bg-lk-surface">
      <dl
        data-reveal-stagger=""
        className="mx-auto grid max-w-275 grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 text-center md:grid-cols-4 md:px-10 lg:py-14"
      >
        {t.figures.map((figure) => (
          // The figures on one line, whatever the length of their label.
          <div key={figure.label} className="flex flex-col-reverse justify-end gap-1.5">
            <dt className="text-lk-compact font-medium text-pretty text-lk-ink-3">
              {figure.label}
            </dt>
            <dd className="text-lk-h1-lg font-extrabold text-wide tabular-nums lg:text-lk-display-md">
              <span className="lk-text-grad">{figure.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** « Pourquoi j'ai lancé Leenkey. »: Cédric's words, centred, his conviction framed. */
export function StorySection() {
  return (
    <MarketingSection
      id="histoire"
      tone="mist"
      look="showcase"
      eyebrow={t.story.eyebrow}
      title={t.story.title}
      accent={t.story.accent}
    >
      <div className="mx-auto flex max-w-lk-prose flex-col gap-5 text-lk-body-lg text-pretty text-lk-ink-2 lg:text-lk-lead-lg">
        {t.story.paragraphs.map((paragraph, index) => (
          <p key={index}>
            <RichText parts={paragraph} />
          </p>
        ))}
        <p className="mt-3 rounded-lk-md border-l-4 border-lk-blue bg-lk-blue-tint px-6 py-5 text-lk-ink">
          {t.story.highlight}
        </p>
      </div>
    </MarketingSection>
  );
}

/** « Ce qui nous anime au quotidien. »: the four values on navy, their icons in the gradient. */
export function ValuesSection() {
  return (
    <MarketingSection
      id="valeurs"
      tone="navy"
      look="showcase"
      eyebrow={t.values.eyebrow}
      title={t.values.title}
      lead={t.values.lead}
      revealContent={false}
    >
      <ul data-reveal-stagger="" className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {t.values.items.map((value, index) => {
          const Icon = VALUE_ICONS[index] ?? Plus;
          return (
            <li key={value.title} className={cn(cardDark, "flex flex-col gap-3")}>
              <span className="mb-2 flex size-12 items-center justify-center rounded-lk-lg bg-linear-135 from-lk-blue to-lk-blue-mid text-white">
                <Icon aria-hidden="true" className="size-6" strokeWidth={1.6} />
              </span>
              <h3 className={cardTitleDark}>{value.title}</h3>
              <p className={cardTextDark}>{value.text}</p>
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  );
}

/**
 * « Prêt à échanger avec Cédric ? », on white as in the V1: the contact form
 * of the site, which has every motif (owner, investor, partner, press), or
 * the valuation.
 */
export function AboutCta() {
  return (
    <CtaPanel
      tone="light"
      title={t.final.title}
      accent={t.final.accent}
      text={t.final.text}
      action={t.final.contact}
      href={ROUTES.contact}
      secondary={{ label: t.final.valuation, href: ROUTES.valuation }}
    />
  );
}
