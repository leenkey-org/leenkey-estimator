import Image from "next/image";
import Link from "next/link";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { MarketingSection } from "@/components/shared/marketing-section";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";
import { card, cardText, cardTitle, statement } from "./site-styles";

// Sections of /qui-sommes-nous (L1-43), in the order of the V1 page, rebuilt
// with the Façade components (DECISIONS 2026-10-19). Texts: fr.site.about.

const t = fr.site.about;
/** Photo of the founder, reduced to 720 × 960 in WebP (38 KB). */
const PHOTO = { src: "/brand/cedric.webp", width: 720, height: 960 } as const;

/** « Rendre la vente immobilière enfin simple, humaine et transparente. » */
export function AboutHero() {
  return (
    <BrandPanel title={t.hero.title} description={t.hero.lead} titleSize="hero" illustration>
      <Button asChild variant="inverse" size="lg">
        <Link href={ROUTES.invest}>{t.hero.action}</Link>
      </Button>
    </BrandPanel>
  );
}

/** The figures of the founder's career, on stone. */
export function AboutFigures() {
  return (
    <div className="bg-lk-stone">
      <dl className="mx-auto grid max-w-lk-page grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 md:grid-cols-4 md:px-10 lg:py-12">
        {t.figures.map((figure) => (
          <div key={figure.label} className="flex flex-col-reverse gap-1">
            <dt className="text-lk-secondary text-pretty text-lk-ink-2">{figure.label}</dt>
            <dd className="text-lk-h1 font-bold text-wide tabular-nums text-lk-ink lg:text-lk-h1-lg">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** « Pourquoi j'ai lancé Leenkey. »: Cédric's words, next to his photo. */
export function StorySection() {
  return (
    <MarketingSection id="histoire" title={t.story.title}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-14">
        <figure className="flex max-w-80 flex-col gap-3 lg:max-w-none">
          <Image
            src={PHOTO.src}
            width={PHOTO.width}
            height={PHOTO.height}
            alt={t.founder.photoAlt}
            unoptimized
            className="aspect-[3/4] w-full rounded-lk-md bg-lk-stone-2 object-cover"
          />
          <figcaption className="flex flex-col">
            <span className="text-lk-body font-semibold text-lk-ink">{t.founder.name}</span>
            <span className="text-lk-caption text-lk-ink-3">{t.founder.role}</span>
          </figcaption>
        </figure>
        <div className="flex max-w-lk-prose flex-col gap-4">
          {t.story.paragraphs.map((paragraph, index) => (
            <p key={index} className={cardText}>
              <RichText parts={paragraph} />
            </p>
          ))}
          <p className={cn(statement, "mt-2 border-l-2 border-lk-blue pl-4")}>
            {t.story.highlight}
          </p>
        </div>
      </div>
    </MarketingSection>
  );
}

/** « Ce qui nous anime au quotidien. »: the four values. */
export function ValuesSection() {
  return (
    <MarketingSection id="valeurs" tone="stone" title={t.values.title} lead={t.values.lead}>
      <ul className="grid gap-4 md:grid-cols-2">
        {t.values.items.map((value) => (
          <li key={value.title} className={card}>
            <h3 className={cardTitle}>{value.title}</h3>
            <p className={cn(cardText, "mt-2")}>{value.text}</p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

/**
 * « Prêt à échanger avec Cédric ? »: the contact form of the home page, which
 * has every motif (owner, investor, partner, press), or the valuation.
 */
export function AboutCta() {
  return (
    <BrandPanel
      title={t.final.title}
      titleAs="h2"
      titleSize="page"
      description={t.final.text}
      illustration
    >
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        <Button asChild variant="inverse" size="lg">
          <Link href={ROUTES.contact}>{t.final.contact}</Link>
        </Button>
        <Button asChild variant="outline-inverse" size="lg">
          <Link href={ROUTES.valuation}>{t.final.valuation}</Link>
        </Button>
      </div>
    </BrandPanel>
  );
}
