import Image from "next/image";
import { Check, CircleCheck, ChartLine, LayoutList, Plus } from "lucide-react";
import { PillLink } from "@/components/shared/pill-link";
import { getProfile } from "@/core/auth/session";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sitePhoto } from "@/leenkey/site/photos";
import { fr } from "@/lib/i18n/fr";
import { HomeSearchCard } from "./home-search-card";

const t = fr.site.home;

/** The listing straight away: the seller sign-up first when signed out. */
export function directListingHref(signedIn: boolean): string {
  if (signedIn) return ROUTES.newProperty;
  return `${ROUTES.sellerSignUp}&next=${encodeURIComponent(ROUTES.newProperty)}`;
}

/** The curve that cuts the photo on its left (SPECS.md 1, « Vague »). */
const WAVE = "M0 0 H100 C58 16 26 38 40 60 C52 80 34 93 0 100 Z";

/**
 * Top of the home page of the redesign D (docs/design-handoff/SPECS.md 3,
 * items 1 to 3): the night band under the headers, its halos breathing, the
 * badge « Ni agence, ni seul », the title and its line in the gradient, the
 * lead. From 1 024 px, the photo on the right (46 %) cut by the wave, its
 * grid of dots, and from 1 280 px the « Exemple » card on it; below, the
 * photo under the text, its top left corner rounded 130 px. The search card
 * set over the bottom of the band, then the service pills. Without the photo
 * (rights not confirmed in production), the night alone.
 */
export async function HomeHero() {
  const [profile, photo] = [await getProfile(), sitePhoto("home")];
  const signedIn = profile !== null;
  return (
    <section
      // The anchors of the V1 home page still land on their part (#valoriser).
      id="valoriser"
      aria-labelledby="accueil-titre"
    >
      <div className="relative isolate overflow-hidden bg-lk-night pb-26 text-white lg:pb-42.5">
        <span
          aria-hidden="true"
          className="lk-halo-blue lk-glow pointer-events-none absolute top-50 -left-45 -z-10 size-130 rounded-full lg:top-auto lg:-bottom-75 lg:-left-55 lg:size-210"
        />
        <span
          aria-hidden="true"
          className="lk-halo-violet lk-glow pointer-events-none absolute -top-30 -right-40 -z-10 size-105 rounded-full lg:-top-60 lg:right-auto lg:left-[32%] lg:size-140"
        />
        {photo ? (
          // Under the halos, which glow over the wave and the photo.
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 -z-20 hidden w-[46%] lg:block"
          >
            <Image
              src={photo.src}
              alt=""
              fill
              priority
              sizes="46vw"
              className="object-cover object-[50%_62%]"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute top-0 -left-px block h-full w-60 fill-lk-night"
            >
              <path d={WAVE} />
            </svg>
            <span className="lk-dots-white absolute top-26 right-10 h-22 w-33" />
          </div>
        ) : null}
        <div className="lk-frame relative max-md:[--lk-gutter:1rem] pt-3 lg:pt-10">
          <div className="max-w-160 lg:max-w-[48%] xl:max-w-160">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/6 py-1.25 pr-3.5 pl-1.25 text-lk-label font-medium lg:mb-5.5 lg:gap-2.5 lg:border-white/18 lg:bg-lk-night/35 lg:pr-4 lg:pl-1.5 lg:text-lk-compact">
              <span className="lk-gradient-brand flex size-5.5 items-center justify-center rounded-full lg:size-6">
                <Check aria-hidden="true" strokeWidth={2.8} className="size-3 lg:size-3.25" />
              </span>
              {t.hero.badge}
            </p>
            <h1
              id="accueil-titre"
              className="text-lk-c-hero font-bold tracking-[-0.03em] lg:text-lk-c-hero-md xl:text-lk-d-hero-lg"
            >
              {/* A space before the line break: the name of the title reads two sentences. */}
              {`${t.hero.title} `}
              <br />
              <span className="lk-gradient-text-night">{t.hero.titleAccent}</span>
            </h1>
            <p className="mt-3.5 max-w-130 text-lk-body text-lk-night-muted lg:mt-4.5 lg:text-lk-lead-lg lg:text-lk-night-text">
              <span className="md:hidden">{t.hero.leadShort}</span>
              <span className="hidden md:inline">{t.hero.lead}</span>
            </p>
          </div>
          {photo ? <ExampleCard /> : null}
        </div>
        {photo ? (
          <div className="relative mt-6 ml-10 h-62.5 overflow-hidden rounded-tl-[8.125rem] rounded-bl-lk-3xl bg-lk-indigo-deep md:ml-[30%] md:h-80 lg:hidden">
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(min-width: 768px) 70vw, 90vw"
              className="object-cover object-[70%_60%]"
            />
            <span
              aria-hidden="true"
              className="lk-dots-white absolute top-4.5 right-4 h-13.5 w-22.5 bg-[length:15px_15px]"
            />
          </div>
        ) : null}
      </div>
      <div className="lk-frame max-md:[--lk-gutter:0.75rem]">
        <div className="relative mx-auto -mt-21 max-w-240 lg:-mt-28">
          <HomeSearchCard signedIn={signedIn} />
        </div>
        <nav
          aria-label={t.services.label}
          className="-mx-3 mt-4.5 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-6 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-0"
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
 * The « Exemple » card on the photo (SPECS.md 2), from 1 280 px: an
 * illustration of what the analysis of value gives, never a real property.
 */
function ExampleCard() {
  const e = t.hero.example;
  return (
    <div className="absolute top-12 right-(--lk-gutter) hidden w-68 rounded-lk-2xl bg-lk-surface px-5 py-4.5 text-lk-ink shadow-lk-d-example xl:block">
      <span className="lk-gradient inline-block rounded-full px-3 py-0.75 text-lk-caption font-semibold text-white">
        {e.badge}
      </span>
      <p className="mt-2.5 font-semibold">{e.title}</p>
      <p className="mt-0.5 text-lk-compact text-lk-ink-3">{e.detail}</p>
      <p className="mt-3 text-lk-caption text-lk-ink-3">{e.label}</p>
      <p className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] tabular">
        {e.value}
      </p>
      <p className="mt-0.5 flex items-center gap-1.5 text-lk-caption text-lk-ink-2">
        <CircleCheck aria-hidden="true" strokeWidth={2.2} className="size-3.75 text-lk-success" />
        {e.note}
      </p>
    </div>
  );
}
