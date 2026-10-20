import Link from "next/link";
import { Check } from "lucide-react";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";
import { Photo } from "@/components/shared/photo";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { sitePhoto } from "@/leenkey/site/photos";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.hero;

/**
 * Hero of the home page (SPEC-V2 8.1, docs/DESIGN.md 13.1): BrandPanel blue,
 * display title, and two equal entries in white, « Je vends » (inverse) and
 * « J'achète » (white outline), then the three promises of the V1 hero. On
 * the right, the photo of a house as in the V1 hero (L1-46), under the text
 * below 1024 px; facade.svg instead where the photo may not show (its rights
 * unconfirmed, in production). Anchor #valoriser kept from the V1.
 */
export function HomeHero() {
  const photo = sitePhoto("home");
  return (
    <BrandPanel
      id="valoriser"
      title={t.title}
      titleAccent={t.accent}
      description={t.lead}
      titleSize="hero"
      illustration={photo === null}
      media={
        photo ? (
          // Decorative: the title says what the page is about.
          <div className="relative aspect-3/2 overflow-hidden rounded-lk-md md:aspect-video lg:aspect-square">
            <Photo
              src={photo.src}
              alt=""
              sizes="(min-width: 1280px) 448px, (min-width: 1024px) 38vw, 100vw"
              priority
            />
          </div>
        ) : undefined
      }
    >
      <div
        role="group"
        aria-label={t.entries}
        className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(2,11rem)]"
      >
        <Button asChild variant="inverse" size="lg">
          <Link href={ROUTES.valuation}>{t.sell}</Link>
        </Button>
        <Button asChild variant="outline-inverse" size="lg">
          <Link href={ROUTES.search}>{t.buy}</Link>
        </Button>
      </div>
      <ul className="mt-7 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-x-6">
        {t.points.map((point) => (
          <li key={point} className="flex items-center gap-2 text-lk-compact text-lk-on-blue-2">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </BrandPanel>
  );
}
