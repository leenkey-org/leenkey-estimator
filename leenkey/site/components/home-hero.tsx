import Image from "next/image";
import { Check, ChartLine, LayoutList, Plus } from "lucide-react";
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

/**
 * Top of the home page of direction C (docs/design-handoff/SPECS.md 3, items
 * 2 to 4): the large photo rounded 28 px (380 px high on a phone, 520 px from
 * 1 024 px) under a dark veil on its text side, the badge « Ni agence, ni
 * seul », the title and its lead; the search card set over the bottom of the
 * photo; then the service pills. Without the photo (rights not confirmed in
 * production), the deep blue of the frame.
 */
export async function HomeHero() {
  const [profile, photo] = [await getProfile(), sitePhoto("home")];
  const signedIn = profile !== null;
  return (
    <section
      // The anchors of the V1 home page still land on their part (#valoriser).
      id="valoriser"
      aria-labelledby="accueil-titre"
      className="lk-frame max-md:[--lk-gutter:0.75rem] pt-3 md:pt-6"
    >
      <div className="relative h-95 overflow-hidden rounded-lk-3xl bg-lk-navy lg:h-130 lg:rounded-lk-4xl">
        {photo ? (
          <Image
            src={photo.src}
            alt=""
            fill
            priority
            sizes="(min-width: 1920px) 1792px, 100vw"
            className="object-cover object-[50%_62%]"
          />
        ) : null}
        <div
          aria-hidden="true"
          // Darker than the mock-up where the text sits: the lead keeps 4.5:1
          // even over the lightest stone of the photo (navy at 66 % at least).
          className="absolute inset-0 bg-linear-to-b from-lk-navy/75 via-lk-navy/68 via-60% to-lk-navy/10 lg:bg-linear-to-r lg:from-lk-navy/75 lg:via-lk-navy/66 lg:via-48% lg:to-transparent lg:to-90%"
        />
        <div className="relative max-w-170 px-5 pt-6 text-white md:px-10 md:pt-10 lg:px-16 lg:pt-15">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-lk-navy/55 py-1.5 pr-3.5 pl-2 text-lk-label font-semibold lg:mb-4.5 lg:text-lk-compact">
            <span className="flex size-5.5 items-center justify-center rounded-full bg-lk-blue">
              <Check aria-hidden="true" strokeWidth={2.6} className="size-3.25" />
            </span>
            {t.hero.badge}
          </p>
          <h1
            id="accueil-titre"
            className="text-lk-c-hero text-heavy md:text-lk-c-hero-md lg:text-lk-c-hero-lg"
          >
            {t.hero.title}
          </h1>
          <p className="mt-2.5 max-w-125 text-lk-body text-white/94 lg:mt-4.5 lg:text-lk-c-lead-lg">
            <span className="md:hidden">{t.hero.leadShort}</span>
            <span className="hidden md:inline">{t.hero.lead}</span>
          </p>
        </div>
      </div>
      <div className="relative mx-2 -mt-27.5 md:mx-auto md:-mt-31 md:max-w-240">
        <HomeSearchCard signedIn={signedIn} />
      </div>
      <nav
        aria-label={t.services.label}
        className="-mx-3 mt-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-6 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-0"
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
    </section>
  );
}
