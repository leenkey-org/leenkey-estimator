import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DpeBadge } from "@/components/shared/dpe-badge";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { Gallery } from "@/components/shared/gallery";
import { ContactCard } from "@/components/shared/contact-card";
import { KeyFactsTable } from "@/components/shared/key-facts-table";
import { KeyFigures } from "@/components/shared/key-figures";
import { PriceBlock } from "@/components/shared/price-block";
import { SectionTitle } from "@/components/shared/section-title";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { favoriteState } from "@/leenkey/favorites/queries";
import { BackLink } from "@/leenkey/listings/components/back-link";
import { ActionBar, PriceColumn } from "@/leenkey/listings/components/listing-actions";
import { ListingBreadcrumb } from "@/leenkey/listings/components/listing-breadcrumb";
import { ListingDescription } from "@/leenkey/listings/components/listing-description";
import { ListingViewTracker } from "@/leenkey/listings/components/listing-view-tracker";
import { listingKeyFacts } from "@/leenkey/listings/key-facts";
import {
  galleryPhotos,
  buyerSignUpHref,
  communeSearchHref,
  listingJsonLd,
  listingKeyFigures,
  listingMetaDescription,
  listingMetaTitle,
  listingPlace,
  listingSummary,
  serializeJsonLd,
} from "@/leenkey/listings/presentation";
import { getPublicListing } from "@/leenkey/listings/queries";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { NBSP } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl } from "@/lib/site";

// L1-17: public listing page (SPEC-V2 8.5, docs/DESIGN.md 12.7, 12.8).
// Published listings only: any other status, or an unknown address, is a 404.
// Not yet here: photos (L1-12, facade.svg meanwhile), map of the area (with
// Mapbox), assistant summary (L2-05), offer (L2), documents (L3). Favourite
// (L1-18): over the mobile gallery, next to the desktop price. Navigation
// (L1-10): TopNav from 768 px only; on mobile the gallery and the action bar
// stay alone, without bottom tabs. SiteFooter at the end (L1-36), with room
// below it for the fixed action bar.

type Props = { params: Promise<{ slug: string }> };

const t = fr.listing;

async function loadListing(slug: string) {
  const result = await getPublicListing(slug);
  // The error boundary of the page shows « Ça n'a pas fonctionné » (500).
  if (!result.ok) throw new Error("The listing could not be read.");
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await loadListing((await params).slug);
  if (!listing) return { title: t.notFound.metaTitle };
  const title = listingMetaTitle(listing);
  const description = listingMetaDescription(listing.description);
  const url = absoluteUrl(`/annonce/${listing.slug}`);
  const image = absoluteUrl(`/api/og/${listing.slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "Leenkey",
      locale: "fr_FR",
      images: [{ url: image, width: 1200, height: 630, alt: listingSummary(listing) }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ListingPage({ params }: Props) {
  const listing = await loadListing((await params).slug);
  if (!listing) notFound();

  const { place, detail } = listingPlace(listing);
  const signUpHref = buyerSignUpHref(listing.slug);
  // Before the read: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const favorite = await favoriteState(listing.id);
  const heart = (variant: "white-float" | "stone") => (
    <FavoriteButton
      listingId={listing.id}
      favorite={favorite}
      checkedAt={checkedAt}
      signUpHref={signUpHref}
      variant={variant}
    />
  );
  const url = absoluteUrl(`/annonce/${listing.slug}`);
  const jsonLd = listingJsonLd(listing, url, absoluteUrl(`/api/og/${listing.slug}`));

  return (
    <FacadeRoot className="min-h-screen bg-lk-surface">
      <SiteTopNav />
      <main className="mx-auto max-w-lk-page pb-10 lg:px-10 lg:pb-16">
        <ListingBreadcrumb
          city={listing.city}
          cityHref={communeSearchHref(listing.city)}
          title={listing.title}
          className="hidden pt-5 lg:block"
        />
        <Gallery
          photos={galleryPhotos(listing)}
          topLeft={<BackLink />}
          topRight={heart("white-float")}
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
                <h1 className="text-lk-title font-semibold text-lk-ink lg:text-lk-h1 lg:font-bold lg:text-wide">
                  {listing.title}
                </h1>
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
              <SectionTitle id="le-bien">{t.description.title}</SectionTitle>
              <ListingDescription text={listing.description} />
            </section>

            <section aria-labelledby="avant-visite" className="flex flex-col gap-2">
              <SectionTitle id="avant-visite">{t.facts.title}</SectionTitle>
              <KeyFactsTable items={listingKeyFacts(listing)} className="lg:max-w-lk-prose" />
            </section>
          </div>

          <aside className="hidden lg:block">
            <PriceColumn listing={listing} signUpHref={signUpHref} favorite={heart("stone")} />
          </aside>
        </div>
      </main>
      <SiteFooter className="pb-24 lg:pb-0" />

      <ActionBar signUpHref={signUpHref} />
      <ListingViewTracker listingId={listing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </FacadeRoot>
  );
}
