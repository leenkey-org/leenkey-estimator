import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FacadeRoot } from "@/components/shared/facade-root";
import { SiteFooter } from "@/components/shared/site-footer";
import { getProfile } from "@/core/auth/session";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { favoriteState } from "@/leenkey/favorites/queries";
import { BackLink } from "@/leenkey/listings/components/back-link";
import { ActionBar, PriceColumn } from "@/leenkey/listings/components/listing-actions";
import { ListingBody } from "@/leenkey/listings/components/listing-body";
import { ListingBreadcrumb } from "@/leenkey/listings/components/listing-breadcrumb";
import { ListingViewTracker } from "@/leenkey/listings/components/listing-view-tracker";
import {
  buyerSignUpHref,
  communeSearchHref,
  contactLinks,
  listingJsonLd,
  listingMetaDescription,
  listingMetaTitle,
  listingSummary,
  serializeJsonLd,
} from "@/leenkey/listings/presentation";
import { getPublicListing } from "@/leenkey/listings/queries";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl } from "@/lib/site";

// L1-17: public listing page (SPEC-V2 8.5, docs/DESIGN.md 12.7, 12.8).
// Published listings only: any other status, or an unknown address, is a 404.
// Photos (L1-12): the gallery, facade.svg without them. Not yet here: map of
// the area (with Mapbox), assistant summary (L2-05), offer (L2), documents (L3). Favourite
// (L1-18): over the mobile gallery, next to the desktop price. Contact and
// visit (L1-21): the first message to the seller, after the sign-up without
// a session. Navigation
// (L1-10): TopNav from 768 px only; on mobile the gallery and the action bar
// stay alone, without bottom tabs. SiteFooter at the end (L1-36), with room
// below it for the fixed action bar.

type Props = { params: Promise<{ slug: string }> };

const t = fr.listing;

async function loadListing(slug: string) {
  const result = await getPublicListing(slug);
  // The error boundary of the site (app/error.tsx) shows « Ça n'a pas fonctionné » (500).
  if (!result.ok) throw new Error("The listing could not be read.");
  return result.data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await loadListing((await params).slug);
  if (!listing)
    return { title: t.notFound.metaTitle, alternates: { canonical: null }, openGraph: null };
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

  const signUpHref = buyerSignUpHref(listing.slug);
  // Before the read: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const [favorite, profile] = await Promise.all([favoriteState(listing.id), getProfile()]);
  const links = contactLinks(listing, profile !== null);
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
        <ListingBody
          listing={listing}
          galleryTopLeft={<BackLink />}
          galleryTopRight={heart("white-float")}
          aside={<PriceColumn listing={listing} links={links} favorite={heart("stone")} />}
        />
      </main>
      <SiteFooter className="pb-24 lg:pb-0" />

      <ActionBar links={links} />
      <ListingViewTracker listingId={listing.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </FacadeRoot>
  );
}
