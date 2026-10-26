import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav } from "@/components/shared/bottom-nav";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FacadeRoot } from "@/components/shared/facade-root";
import { InlineAlert } from "@/components/shared/inline-alert";
import { BOTTOM_NAV_OFFSET } from "@/components/shared/nav-items";
import { SiteFooter } from "@/components/shared/site-footer";
import { getProfile } from "@/core/auth/session";
import { SiteTopNav } from "@/leenkey/navigation/components/site-top-nav";
import { bottomTabs } from "@/leenkey/navigation/config";
import { FiltersDialog } from "@/leenkey/search/components/filters-dialog";
import { LoadMore } from "@/leenkey/search/components/load-more";
import { MapSyncProvider } from "@/leenkey/search/components/map-sync";
import { ResultsMapDialog, ResultsMapPanel } from "@/leenkey/search/components/results-map";
import { ResultsList } from "@/leenkey/search/components/results-list";
import { ResultsRegion, SearchProvider } from "@/leenkey/search/components/search-context";
import { SearchHeader } from "@/leenkey/search/components/search-header";
import { SortSelect } from "@/leenkey/search/components/sort-select";
import { resolveLocation, type ResolvedLocation } from "@/leenkey/search/location";
import { mapCentre, toMapListings } from "@/leenkey/search/map-listings";
import { searchListings } from "@/leenkey/search/queries";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import {
  countActiveFilters,
  parseSearchParams,
  searchHref,
  SEARCH_PATH,
} from "@/lib/validations/search";

// L1-15: search of the published listings (SPEC-V2 8.4, docs/DESIGN.md 12.5,
// 12.6). Server-rendered from the URL; the controls change the URL.
// The map (L1-16): beside the list from 1024 px, the whole width of the page;
// full screen from « Carte » below. « Créer une alerte » (L3-06) comes later. Navigation
// (L1-10): TopNav from 768 px, buyer tabs below for every visitor (the
// middleware sends a signed-out visitor from Favoris, Messages or Compte to
// the login page; « Vendre » opens the landing page for the sellers),
// SiteFooter at the end (L1-36).

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const t = fr.search;

/** « à Savigny-sur-Orge », « autour d'Épinay-sur-Orge », « dans le 91600 ». */
function placePhrase(place: ResolvedLocation, around: boolean): string {
  if (place.kind === "postal_code") return t.place.postalCode(place.label);
  return around ? t.place.around(place.label) : t.place.at(place.label);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { filters } = parseSearchParams(await searchParams);
  const resolved = filters.location ? resolveLocation(filters.location) : null;
  // A place outside the launch zone comes from the URL only: never an
  // indexable title (« ?ville=anything »).
  const place = resolved?.centre ? resolved : null;
  const title = place ? t.metaTitleIn(placePhrase(place, false)) : t.metaTitle;
  // One canonical page per commune: the other filters are variations of it.
  const canonical = absoluteUrl(searchHref({ filters: { location: place?.value } }));
  return {
    title,
    description: t.metaDescription,
    alternates: { canonical },
    robots: resolved && !place ? { index: false, follow: true } : undefined,
    openGraph: { title, description: t.metaDescription, url: canonical, type: "website" },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const query = parseSearchParams(await searchParams);
  const place = query.filters.location ? resolveLocation(query.filters.location) : null;
  // The profile is read once per request (cache), by the TopNav too.
  const [result, profile] = await Promise.all([searchListings(query), getProfile()]);
  const now = new Date();
  const map = {
    // Public key, restricted to the domain of the site (L1-16).
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null,
    listings: result.ok ? toMapListings(result.data.items, now) : [],
    centre: mapCentre(place),
  };

  let content: ReactNode;
  if (!result.ok) {
    content = (
      <InlineAlert
        tone="danger"
        action={
          <Link
            href={searchHref(query)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {t.retry}
          </Link>
        }
      >
        {t.error}
      </InlineAlert>
    );
  } else if (result.data.total === 0) {
    const filtered = Boolean(query.filters.location) || countActiveFilters(query.filters) > 0;
    content = (
      <EmptyState
        className="py-10"
        title={filtered ? t.empty.title : t.empty.noListingTitle}
        description={filtered ? t.empty.text : undefined}
        action={
          filtered ? (
            // The filters button of the header stays the one primary action.
            <Button asChild variant="outline-ink">
              <Link href={SEARCH_PATH}>{t.empty.action}</Link>
            </Button>
          ) : undefined
        }
      />
    );
  } else {
    const { items, total } = result.data;
    const count = t.results.count(total, formatInteger(total));
    const around = Boolean(query.filters.radiusKm && place?.centre);
    content = (
      <>
        <div className="mb-2 flex items-center justify-between gap-3 lg:mb-3.5">
          <p
            role="status"
            className="min-w-0 text-lk-secondary font-semibold text-lk-ink lg:text-lk-compact"
          >
            {place ? t.results.withPlace(count, placePhrase(place, around)) : count}
          </p>
          <SortSelect />
        </div>
        <ResultsList items={items} now={now} />
        <LoadMore shown={items.length} hasMore={items.length < total} />
      </>
    );
  }

  return (
    <FacadeRoot className={cn("flex min-h-screen flex-col bg-lk-surface", BOTTOM_NAV_OFFSET)}>
      {/* The whole width, like the list and the map below it (L1-16). */}
      <SiteTopNav fullWidth />
      <SearchProvider
        query={query}
        total={result.ok ? result.data.total : null}
        placeLabel={place?.label ?? null}
        radiusAvailable={Boolean(place?.centre)}
      >
        <SearchHeader />
        <MapSyncProvider>
          <div className="flex-1 lg:grid lg:grid-cols-[620px_minmax(0,1fr)]">
            <main className="mx-auto w-full max-w-lk-page px-5 pb-12 pt-3.5 md:px-10 lg:mx-0 lg:max-w-none lg:px-8 lg:pt-5">
              <h1 className="sr-only">{t.pageTitle}</h1>
              <ResultsRegion>{content}</ResultsRegion>
            </main>
            {/* Held under the top bar (72 px) while the list scrolls. */}
            <div className="hidden border-l border-lk-blue-line lg:sticky lg:top-18 lg:block lg:h-[calc(100dvh-4.5rem)] lg:self-start">
              <ResultsMapPanel {...map} />
            </div>
          </div>
          {result.ok && result.data.total > 0 ? <ResultsMapDialog {...map} /> : null}
        </MapSyncProvider>
        <FiltersDialog />
      </SearchProvider>
      <SiteFooter />
      <BottomNav label={fr.nav.label} items={bottomTabs("buyer", Boolean(profile))} />
    </FacadeRoot>
  );
}
