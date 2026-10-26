import { favoriteStates } from "@/leenkey/favorites/queries";
import { buyerSignUpHref } from "@/leenkey/listings/presentation";
import { photoUrl } from "@/leenkey/properties/photo-files";
import { listingHref } from "@/leenkey/search/cards";
import { HOME_LISTINGS_FILTERS, homeListings } from "@/leenkey/search/queries";
import { fr } from "@/lib/i18n/fr";
import { searchHref } from "@/lib/validations/search";
import {
  categoryFilters,
  HOME_CATEGORIES,
  isNewListing,
  listingCategories,
  type HomeCategory,
} from "../home-categories";
import { HomeListingsCarousel, type CarouselListing } from "./home-listings-carousel";

const t = fr.site.home.listings;

/**
 * « Biens à vendre près de chez vous » (docs/design-handoff/SPECS.md 3, item
 * 7): the listings online around Épinay-sur-Orge, their real number and
 * badges, the hearts of the signed-in account. Left out without a listing or
 * a database: the home page never shows an empty carousel nor an error.
 */
export async function HomeListings() {
  const result = await homeListings();
  if (!result.ok || result.data.items.length === 0) return null;
  const { items, photos, total } = result.data;
  const now = new Date();
  const checkedAt = Date.now();
  const saved = await favoriteStates(items.map((item) => item.id));
  const listings: CarouselListing[] = items.map((item) => ({
    id: item.id,
    href: listingHref(item.slug),
    priceCents: item.priceCents,
    propertyType: item.type,
    rooms: item.type === "terrain" ? null : item.rooms,
    surfaceM2: item.surfaceM2,
    city: item.city,
    dpe: item.dpe,
    // Decorative: the card says what the photo shows.
    photos: (photos[item.id] ?? []).map((photo) => ({ src: photoUrl(photo.path), alt: "" })),
    badge: isNewListing(item.publishedAt, now) ? t.badgeNew : undefined,
    categories: listingCategories(item),
    favorite: saved === null ? null : saved.has(item.id),
    // The sign-up comes back to the home page.
    signUpHref: buyerSignUpHref(item.slug, "/"),
  }));
  const links = Object.fromEntries(
    HOME_CATEGORIES.map((category) => [
      category,
      searchHref({ filters: { ...HOME_LISTINGS_FILTERS, ...categoryFilters(category) } }),
    ]),
  ) as Record<HomeCategory, string>;
  return (
    <section
      aria-labelledby="pres-de-chez-vous"
      className="mx-auto w-full max-w-lk-frame pt-10 md:lk-gutter md:pt-20"
    >
      <HomeListingsCarousel
        listings={listings}
        total={total}
        complete={items.length >= total}
        links={links}
        checkedAt={checkedAt}
      />
    </section>
  );
}
