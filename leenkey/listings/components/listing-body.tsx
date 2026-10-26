import type { ReactNode } from "react";
import { ContactCard } from "@/components/shared/contact-card";
import { DpeBadge } from "@/components/shared/dpe-badge";
import { Gallery } from "@/components/shared/gallery";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { KeyFigures } from "@/components/shared/key-figures";
import { PriceBlock } from "@/components/shared/price-block";
import { SectionTitle } from "@/components/shared/section-title";
import { NBSP } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { listingKeyFacts } from "../key-facts";
import { galleryPhotos, listingKeyFigures, listingPlace } from "../presentation";
import type { PublicListing } from "../queries";
import { ListingDescription } from "./listing-description";

const t = fr.listing;

/**
 * The listing as its page shows it (SPEC-V2 8.5, docs/DESIGN.md 12.7, 12.8):
 * the gallery, then the price, the title, the key figures, the seller, the
 * description and the facts, with the price column on the right from 1024 px.
 * The public page (L1-17) and the preview of the seller before sending
 * (L1-13) show the same one: what the seller checks is what buyers will see.
 */
export function ListingBody({
  listing,
  galleryTopLeft,
  galleryTopRight,
  aside,
  map,
  level = 1,
  className,
}: {
  listing: PublicListing;
  /** Over the mobile photo (back link, favourite). */
  galleryTopLeft?: ReactNode;
  galleryTopRight?: ReactNode;
  /** The price column (PriceColumn), from 1024 px. */
  aside: ReactNode;
  /** « Localisation »: the map of the area (L1-16), on the public page. */
  map?: ReactNode;
  /**
   * Level of the title: 1 on the page of the listing; 3 in the preview, under
   * « Mon bien » and « Aperçu de votre annonce ». Its sections come one below.
   */
  level?: 1 | 3;
  className?: string;
}) {
  const { place, detail } = listingPlace(listing);
  const Title = level === 1 ? "h1" : "h3";
  const section = level === 1 ? "h2" : "h4";
  return (
    <div className={className}>
      <Gallery
        photos={galleryPhotos(listing)}
        topLeft={galleryTopLeft}
        topRight={galleryTopRight}
        className="lg:mt-4"
      />

      <div className="px-5 pt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:px-0 lg:pt-6">
        <div className="flex min-w-0 flex-col gap-3.5 lg:gap-5.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <PriceBlock
                priceCents={listing.priceCents}
                surfaceM2={listing.surfaceM2}
                className="mb-1 lg:hidden"
              />
              <Title className="text-lk-title font-semibold text-lk-ink lg:text-lk-h1 lg:font-bold lg:text-wide">
                {listing.title}
              </Title>
              <p className="text-lk-secondary text-lk-ink-3 lg:text-lk-compact">
                {place}
                {detail ? <span className="hidden lg:inline">{`${NBSP}· ${detail}`}</span> : null}
              </p>
            </div>
            {listing.dpe ? <DpeBadge value={listing.dpe} className="shrink-0" /> : null}
          </div>

          <KeyFigures items={listingKeyFigures(listing)} />

          <ContactCard
            firstName={listing.sellerFirstName}
            accompanied={listing.accompanied}
            className="lg:hidden"
          />

          <section aria-labelledby="le-bien" className="flex flex-col gap-2">
            <SectionTitle id="le-bien" as={section}>
              {t.description.title}
            </SectionTitle>
            <ListingDescription text={listing.description} />
          </section>

          <section aria-labelledby="avant-visite" className="flex flex-col gap-2">
            <SectionTitle id="avant-visite" as={section}>
              {t.facts.title}
            </SectionTitle>
            <KeyFactsTable items={listingKeyFacts(listing)} className="lg:max-w-lk-prose" />
          </section>

          {map ? (
            <section aria-labelledby="localisation" className="flex flex-col gap-2">
              <SectionTitle id="localisation" as={section}>
                {t.map.title}
              </SectionTitle>
              {map}
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">{aside}</aside>
      </div>
    </div>
  );
}
