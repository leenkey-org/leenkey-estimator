import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  Clock,
  DoorOpen,
  Euro,
  FileText,
  Handshake,
  ListChecks,
  MapPin,
  Ruler,
  Users,
} from "lucide-react";
import { Button } from "@/components/shared/button";
import { FacadeDrawing } from "@/components/shared/facade-drawing";
import { Photo } from "@/components/shared/photo";
import { ShowcaseHero } from "@/components/shared/showcase-hero";
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
 * 13.1), a ShowcaseHero: the badge « Ni agence, ni seul », the title with
 * « votre vente. » in the light gradient, « Voir ma valorisation » and,
 * beside it, the entry of the buyers; the three promises with their icons. On the right (under the text below 1024 px), the photo of a house
 * with the curve of the V1 on its left side, the card of an example
 * valuation over it and a chip. Anchor #valoriser kept from the V1.
 */
export function HomeHero() {
  return (
    <ShowcaseHero
      id="valoriser"
      badge={{ text: t.badge, icon: Handshake }}
      title={t.title}
      accent={t.accent}
      lead={t.lead}
      actions={
        <>
          <Button asChild variant="cta" size="lg" trailingIcon={ArrowRight}>
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
        </>
      }
      aside={<HeroVisual />}
    >
      <ul className="mt-10 flex w-full flex-col gap-3.5 border-t border-white/10 pt-7 md:flex-row md:flex-wrap md:gap-x-7 lg:mt-11">
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
    </ShowcaseHero>
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

/**
 * « Rapport PDF · Quatre pages, par email », what the valuation gives, where
 * the V1 chip said « + 5,2 % vs prix agence »: nothing that qualifies the
 * figure of the card.
 */
function FactChip({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "z-20 flex items-center gap-2.75 rounded-lk-lg bg-lk-surface px-3.75 py-3 text-lk-ink shadow-lk-lift",
        className,
      )}
    >
      <span className="flex size-9.5 shrink-0 items-center justify-center rounded-lk-lg bg-lk-blue-tint text-lk-blue">
        <FileText aria-hidden="true" className="size-4.5" />
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
 * it from its reference prices (leenkey/site/valuation-example.ts),
 * « Analyse gratuite en 2 minutes ».
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
        <p className="text-lk-micro font-bold tracking-lk-caps text-lk-blue uppercase">{e.value}</p>
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
