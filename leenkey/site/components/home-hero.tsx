import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  ChartLine,
  Clock,
  DoorOpen,
  Euro,
  Handshake,
  ListChecks,
  MapPin,
  Ruler,
  Users,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { NEXT_MS, delay, heroTitle } from "@/components/shared/hero-title";
import { Photo } from "@/components/shared/photo";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sitePhoto } from "@/leenkey/site/photos";
import { valuationExample } from "@/leenkey/site/valuation-example";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.site.home.hero;

/** The icons of the three promises, and of the specs of the example. */
const POINT_ICONS = [Euro, ListChecks, Users] as const;
const SPEC_ICONS = [Ruler, DoorOpen, BedDouble] as const;

/**
 * Hero of the home page, the V1 one (DECISIONS 2026-10-23, docs/DESIGN.md
 * 13.1): deep navy towards the brand blue with a grid of dots, the badge
 * « Ni agence, ni seul », the display title word by word with its words in
 * the light blue gradient over the dimension line, « Voir ma valorisation »
 * and, under it, the entry of the buyers; the three promises with their
 * icons. On the right (under the text below 1024 px), the photo of a house
 * with the curve of the V1 on its left side, the card of an example
 * valuation over it and a chip. Anchor #valoriser kept from the V1.
 */
export function HomeHero() {
  const words = heroTitle(t.title, t.accent, {
    accentClassName: "lk-text-grad-light",
    lineClassName: "text-lk-blue-light",
  });
  return (
    <section
      id="valoriser"
      aria-labelledby="valoriser-titre"
      className="lk-hero-bg relative isolate scroll-mt-15 overflow-hidden text-white md:scroll-mt-18"
    >
      <div aria-hidden="true" className="lk-dots pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-lk-page items-center gap-12 px-5 pt-10 pb-16 md:px-10 md:pt-14 md:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pt-16 lg:pb-24">
        <div className="flex flex-col items-start">
          <p className="lk-rise inline-flex items-center gap-1.5 rounded-full border border-white/16 bg-white/10 px-3.25 py-1.5 text-lk-caption font-semibold">
            <Handshake aria-hidden="true" className="size-3.5 shrink-0" />
            {t.badge}
          </p>
          <h1
            id="valoriser-titre"
            // Word by word, the title is read whole: by its name, the words
            // hidden from assistive technologies.
            aria-label={t.title}
            className="mt-5 text-lk-display font-extrabold text-wide md:text-lk-display-md lg:mt-6 lg:text-lk-display-lg"
          >
            <span aria-hidden="true">{words.content}</span>
          </h1>
          <p
            style={delay(words.last + NEXT_MS)}
            className="lk-rise mt-5 max-w-130 text-lk-body-lg text-pretty text-white/80 lg:mt-6 lg:text-lk-lead-lg"
          >
            {t.lead}
          </p>
          <div
            style={delay(words.last + 2 * NEXT_MS)}
            className="lk-rise mt-8 flex flex-col items-start gap-2 md:flex-row md:items-center md:gap-6"
          >
            <Button
              asChild
              variant="cta"
              size="lg"
              trailingIcon={ArrowRight}
              className="focus-visible:outline-white"
            >
              <Link href={ROUTES.valuation}>{t.action}</Link>
            </Button>
            <Link
              href={ROUTES.search}
              className={cn(
                "group inline-flex min-h-11 items-center gap-1.5 rounded-lk-sm text-lk-compact font-semibold text-white",
                "underline-offset-4 hover:underline",
                "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              )}
            >
              {t.buy}
              <ArrowRight
                aria-hidden="true"
                className="size-4 shrink-0 transition-transform duration-220 ease-out-lk group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <ul
            style={delay(words.last + 3 * NEXT_MS)}
            className="lk-rise mt-10 flex w-full flex-col gap-3.5 border-t border-white/10 pt-7 md:flex-row md:flex-wrap md:gap-x-7 lg:mt-11"
          >
            {t.points.map((point, index) => {
              const Icon = POINT_ICONS[index] ?? Users;
              return (
                <li
                  key={point}
                  className="flex items-center gap-2.5 text-lk-compact font-medium text-white/86"
                >
                  <span className="flex size-8.5 shrink-0 items-center justify-center rounded-lk-lg bg-white/10 text-lk-blue-light">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {point}
                </li>
              );
            })}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/**
 * The photo with the curve of the V1, the chip on its top right corner and
 * the card of the example over its bottom: on the left edge from 1024 px,
 * pulled up over the photo before. The photo shows from the first paint,
 * without entrance: the largest element of the page (LCP) never waits.
 * Without a photo that may show (its rights unconfirmed, in production),
 * the brand drawing in its place.
 */
function HeroVisual() {
  const photo = sitePhoto("home");
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="lk-organic relative aspect-square overflow-hidden bg-lk-navy shadow-lk-photo lg:aspect-auto lg:h-[clamp(27.5rem,40vw,36.25rem)]">
        {photo ? (
          // Decorative: the title says what the page is about.
          <Photo
            src={photo.src}
            alt=""
            sizes="(min-width: 1280px) 530px, (min-width: 1024px) 42vw, (min-width: 512px) 512px, calc(100vw - 2.5rem)"
            priority
          />
        ) : (
          <FacadeDrawing className="absolute inset-x-8 bottom-0 h-3/5 w-auto text-white opacity-55" />
        )}
      </div>
      <FactChip className="absolute top-4 right-3 md:top-5 md:-right-4 lg:-right-8" />
      <ExampleCard className="relative z-10 -mt-24 ml-3 w-[min(20.625rem,88%)] md:ml-6 lg:absolute lg:-bottom-7 lg:-left-11 lg:m-0" />
    </div>
  );
}

/** « Ventes réelles de votre secteur », where the V1 chip said « + 5,2 % vs prix agence ». */
function FactChip({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "z-20 flex items-center gap-2.75 rounded-lk-lg bg-lk-surface px-3.75 py-3 text-lk-ink shadow-lk-lift",
        className,
      )}
    >
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-lk-lg bg-lk-success-bg text-lk-success">
        <ChartLine aria-hidden="true" className="size-4.5" />
      </span>
      <span className="flex flex-col">
        <span className="text-lk-h3-lg leading-none font-extrabold text-wide">{t.fact.title}</span>
        <span className="mt-1 text-lk-micro text-lk-ink-3">{t.fact.text}</span>
      </span>
    </p>
  );
}

/**
 * The card of the V1 (« Votre bien »), as an example: a house of the launch
 * zone, its specs, the value and range the engine of the estimator gives for
 * it (leenkey/site/valuation-example.ts), « Analyse gratuite en 2 minutes ».
 * Read as a group named « Exemple de valorisation »; nothing in it is a
 * control.
 */
function ExampleCard({ className }: { className?: string }) {
  const e = t.example;
  const example = valuationExample();
  return (
    <div
      role="group"
      aria-label={e.label}
      className={cn(
        "rounded-lk-xl border border-lk-mist-line bg-lk-surface p-5 text-lk-ink shadow-lk-lift",
        className,
      )}
    >
      <p className="inline-flex rounded-full bg-lk-blue-line px-3 py-1 text-lk-caption font-semibold text-lk-blue">
        {e.sample}
      </p>
      <p className="mt-2 text-lk-h3-lg font-semibold">{e.title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-lk-label text-lk-ink-3">
        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
        {e.place}
      </p>
      <ul className="my-3.5 flex flex-wrap gap-2">
        {e.specs.map((spec, index) => {
          const Icon = SPEC_ICONS[index] ?? Ruler;
          return (
            <li
              key={spec}
              className="flex items-center gap-1.5 rounded-lk-md bg-lk-mist px-2.75 py-1.75 text-lk-secondary font-medium"
            >
              <Icon aria-hidden="true" className="size-3.5 shrink-0 text-lk-blue" />
              {spec}
            </li>
          );
        })}
      </ul>
      <div className="rounded-lk-lg bg-lk-blue-tint px-4 py-3.5">
        <p className="text-lk-micro font-bold tracking-lk-caps text-lk-blue uppercase">
          {e.value}
        </p>
        <p className="mt-0.5 text-lk-price font-extrabold text-wide tabular-nums">
          {formatPrice(example.value * 100)}
        </p>
        <p className="mt-1 text-lk-caption text-lk-ink-2 tabular-nums">
          {e.range(formatPrice(example.low * 100), formatPrice(example.high * 100))}
        </p>
      </div>
      <p className="mt-3.5 flex items-center gap-1.5 text-lk-caption text-lk-ink-3">
        <Clock aria-hidden="true" className="size-3.5 shrink-0" />
        {e.meta}
      </p>
    </div>
  );
}
