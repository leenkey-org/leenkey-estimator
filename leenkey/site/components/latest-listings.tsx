import { MarketingSection } from "@/components/shared/marketing-section";
import { MoreLink } from "@/components/shared/more-link";
import { PropertyCard } from "@/components/shared/property-card";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { toPropertyCard } from "@/leenkey/search/cards";
import { latestListings } from "@/leenkey/search/queries";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.latest;

/**
 * « Les derniers biens » (SPEC-V2 8.1): the three listings most recently
 * published, PropertyCard tile with a 3:2 photo, and « Voir les 12 biens »
 * under them. Hidden with fewer than three listings online, or when they
 * cannot be read: the home page never shows a half empty block nor an error
 * for it. A scrolling row in mobile, three columns from 768 px, rising one
 * after the other. Head of the V1 sections (L1-49), after the seller area.
 */
export async function LatestListings() {
  const result = await latestListings();
  if (!result.ok || result.data.items.length === 0) return null;
  const { items, total } = result.data;
  const now = new Date();
  return (
    <MarketingSection
      id="derniers-biens"
      look="showcase"
      eyebrow={t.eyebrow}
      title={t.title}
      revealContent={false}
    >
      <ul
        aria-label={t.title}
        data-reveal-stagger=""
        className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0"
      >
        {items.map((listing) => (
          <li key={listing.id} className="w-[78%] shrink-0 snap-start md:w-auto">
            <PropertyCard
              variant="tile"
              {...toPropertyCard(listing, now)}
              sizes="(min-width: 1280px) 384px, (min-width: 768px) 33vw, 78vw"
              tallPhoto
              className="h-full"
            />
          </li>
        ))}
      </ul>
      <div data-reveal="" className="mt-6 flex justify-center md:mt-8">
        <MoreLink href={ROUTES.search}>{t.all(total, formatInteger(total))}</MoreLink>
      </div>
    </MarketingSection>
  );
}
