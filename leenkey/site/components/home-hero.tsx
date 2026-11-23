import Image from "next/image";
import { CircleCheck, ChartLine, KeyRound, LayoutList, Plus } from "lucide-react";
import { PillLink } from "@/components/shared/pill-link";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sitePhoto } from "@/leenkey/site/photos";
import { formatPrice } from "@/lib/format";
import { frSiteHome } from "@/lib/i18n/sections/site/home";
import { cn } from "@/lib/utils";
import { VALUATION_EXAMPLE, valuationExample } from "../valuation-example";
import { HomeSearchCard } from "./home-search-card";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { site: { home: frSiteHome } } as const;

const t = fr.site.home;

/** The listing straight away: the seller sign-up first when signed out. */
export function directListingHref(signedIn: boolean): string {
  if (signedIn) return ROUTES.newProperty;
  return `${ROUTES.sellerSignUp}&next=${encodeURIComponent(ROUTES.newProperty)}`;
}

/**
 * Top of the home page (docs/DESIGN.md 13.1, DECISIONS 2026-11-23, « piste
 * A »): the night under the headers, its halos breathing, the badge (the
 * slogan « Parce que le lien, c'est la clé »), the title and its line in the
 * gradient, the lead, the search card, the service pills, the photo.
 *
 * From 1 024 px, two columns on the night: the text, the search card and the
 * pills on the left, the photo in a rounded frame on the right, as high as
 * the left column, the « Exemple » card over its bottom left corner. Below,
 * as before: the photo under the text, its top left corner rounded 130 px,
 * the search card over its bottom (its action stays on the first screen of a
 * phone, above the bottom tabs), then the pills on the page.
 *
 * One grid for both: the night is a cell behind the text and the photo on a
 * phone, the whole section from 1 024 px. Without the photo (rights not
 * confirmed in production), the night alone.
 */
export async function HomeHero() {
  const [profile, photo] = [await getProfile(), sitePhoto("home")];
  const signedIn = profile !== null;
  return (
    <section
      // The anchors of the V1 home page still land on their part (#valoriser).
      id="valoriser"
      aria-labelledby="accueil-titre"
      className="relative isolate"
    >
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)]",
          "lg:lk-frame lg:gap-x-12 lg:pt-6 lg:pb-12 2xl:gap-x-16",
          // The left column at the measure of the text from 1 280 px, the
          // photo takes the rest: no empty middle on a wide screen.
          photo &&
            "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:grid-cols-[minmax(0,40rem)_minmax(0,1fr)]",
        )}
      >
        <div
          aria-hidden="true"
          className="relative -z-10 col-start-1 row-start-1 row-end-3 overflow-hidden bg-lk-night lg:absolute lg:inset-0"
        >
          <span className="lk-halo-blue lk-glow pointer-events-none absolute top-50 -left-45 size-130 rounded-full lg:top-auto lg:-bottom-75 lg:-left-55 lg:size-210" />
          <span className="lk-halo-violet lk-glow pointer-events-none absolute -top-30 -right-40 size-105 rounded-full lg:-top-20 lg:-right-30 lg:size-190" />
        </div>
        <div
          className={cn(
            "lk-gutter col-start-1 row-start-1 pt-3 text-white max-md:[--lk-gutter:1rem] lg:px-0 lg:pt-0",
            // Without the photo, the room of the search card set over the night.
            !photo && "pb-31 md:pb-37 lg:pb-0",
          )}
        >
          <div className="max-w-160">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 py-1.25 pr-3.5 pl-1.25 text-lk-label font-medium lg:mb-5.5 lg:gap-2.5 lg:border-white/18 lg:bg-lk-night/35 lg:pr-4 lg:pl-1.5 lg:text-lk-compact">
              <span className="lk-gradient-brand flex size-5.5 items-center justify-center rounded-full lg:size-6">
                {/* The key of the slogan. */}
                <KeyRound aria-hidden="true" strokeWidth={2.6} className="size-3 lg:size-3.25" />
              </span>
              {t.hero.badge}
            </p>
            <h1
              id="accueil-titre"
              className="text-lk-c-hero font-bold tracking-lk-d-tight xl:text-lk-c-hero-md"
            >
              {/* A space before the line break: the name of the title reads two
                  sentences. In the column, each sentence is a block of its own,
                  its lines balanced (no word left alone on the last one). */}
              <span className="lg:block lg:text-balance">{`${t.hero.title} `}</span>
              <br className="lg:hidden" />
              <span className="lk-gradient-text-night lg:block lg:w-fit lg:text-balance">
                {t.hero.titleAccent}
              </span>
            </h1>
            <p className="mt-3.5 max-w-130 text-lk-body lg:max-w-160 text-lk-night-muted lg:mt-4.5 lg:text-lk-lead-lg lg:text-lk-night-text">
              <span className="md:hidden">{t.hero.leadShort}</span>
              <span className="hidden md:inline">{t.hero.lead}</span>
            </p>
          </div>
        </div>
        {photo ? (
          // One photo, the image of the page loaded first, its box held by the
          // grid: under the text below 1 024 px, its top left corner rounded
          // 130 px; from there the right column, in a frame rounded 28 px that
          // leaves the bottom left corner to the « Exemple » card.
          <div className="relative col-start-1 row-start-2 mt-5 mb-10 ml-10 h-52.5 md:mb-16 md:ml-[30%] md:h-80 lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:m-0 lg:h-auto">
            <div className="absolute inset-0 overflow-hidden rounded-tl-lk-d-photo rounded-bl-lk-3xl bg-lk-indigo-deep lg:bottom-10 lg:left-10 lg:rounded-lk-4xl">
              <Image
                src={photo.src}
                alt=""
                fill
                priority
                // The largest paint of the home page (P-06): next/image 15 preloads it without urgency.
                fetchPriority="high"
                sizes="(min-width: 1536px) 52vw, (min-width: 1024px) 45vw, (min-width: 768px) 70vw, 90vw"
                className="object-cover object-[70%_60%] lg:object-[42%_62%]"
              />
              <span
                aria-hidden="true"
                className="lk-dots-white absolute top-4.5 right-4 h-13.5 w-22.5 bg-[length:15px_15px] lg:top-8 lg:right-8 lg:h-22 lg:w-33 lg:bg-[length:18px_18px]"
              />
            </div>
            <ExampleCard />
          </div>
        ) : null}
        <div className="lk-gutter relative col-start-1 row-start-3 -mt-21 max-md:[--lk-gutter:0.75rem] lg:row-start-2 lg:mt-7 lg:px-0">
          <div className="mx-auto max-w-240 lg:mx-0 lg:max-w-160">
            <HomeSearchCard signedIn={signedIn} />
          </div>
        </div>
        <nav
          aria-label={t.services.label}
          className="col-start-1 row-start-4 mt-4.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mt-6 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-8 lg:row-start-3 lg:mt-5 lg:justify-start lg:px-0"
        >
          <PillLink href={ROUTES.valuation} icon={ChartLine}>
            {t.services.valuation}
          </PillLink>
          <PillLink href={directListingHref(signedIn)} icon={Plus}>
            {t.services.listing}
          </PillLink>
          <PillLink href={ROUTES.pricing} icon={LayoutList}>
            {t.services.pricing}
          </PillLink>
        </nav>
      </div>
    </section>
  );
}

/**
 * The « Exemple » card over the bottom left corner of the photo, from
 * 1 024 px (below, the photo has no room for it): a fictitious house of the
 * launch zone and the value the engine of the estimator gives it, from its
 * reference prices only (DECISIONS Q58), always said to be an example. It
 * rises into place once, the gauge under its amount fills once, then the card
 * floats a little (app/globals.css, lk-example-card); in place and full with
 * reduced motion.
 */
function ExampleCard() {
  const e = t.hero.example;
  const house = VALUATION_EXAMPLE;
  const { value } = valuationExample();
  return (
    <div
      role="group"
      aria-label={e.label}
      className="lk-example-card absolute bottom-0 left-0 hidden w-68 rounded-lk-2xl bg-lk-surface px-5 py-4.5 text-lk-ink shadow-lk-d-example lg:block xl:w-72 xl:px-6 xl:py-5"
    >
      <span className="lk-gradient inline-block rounded-full px-3 py-0.75 text-lk-caption font-semibold text-white">
        {e.badge}
      </span>
      <p className="mt-2.5 font-semibold">{e.title}</p>
      <p className="mt-0.5 text-lk-compact text-lk-ink-3">
        {e.detail(house.ville, house.surface_habitable, house.pieces)}
      </p>
      <p className="mt-3 text-lk-caption text-lk-ink-3">{e.valueLabel}</p>
      <p className="text-lk-d-feature font-bold tracking-lk-d-snug tabular">
        {formatPrice(value * 100)}
      </p>
      {/* Decorative: it says nothing of the figure. */}
      <span
        aria-hidden="true"
        className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-lk-blue-line"
      >
        <span className="lk-gradient lk-example-gauge block h-full rounded-full" />
      </span>
      <p className="mt-2.5 flex items-center gap-1.5 text-lk-caption text-lk-ink-2">
        <CircleCheck aria-hidden="true" strokeWidth={2.2} className="size-3.75 text-lk-success" />
        {e.note}
      </p>
    </div>
  );
}
