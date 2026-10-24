import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PropertyCard } from "@/components/shared/property-card";
import { requireProfile } from "@/core/auth/session";
import { ClearOfflineFavorites } from "@/leenkey/favorites/components/clear-offline-favorites";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { listFavorites } from "@/leenkey/favorites/queries";
import { buyerSignUpHref, listingSummary } from "@/leenkey/listings/presentation";
import { ROUTES } from "@/leenkey/navigation/config";
import { toPropertyCard } from "@/leenkey/search/cards";
import { fr } from "@/lib/i18n/fr";
import { SpacePage } from "../../_components/space-page";

const t = fr.favorites.page;

export const metadata: Metadata = { title: t.metaTitle };

// L1-18: the listings saved with the heart, most recent first (G2 without the
// map, PropertyCard compact, docs/DESIGN.md 11). A card unsaved here stays
// until the next visit, so that a mistaken tap can be undone. The saved
// listings no longer online are counted, and can be removed in one go.
export default async function FavouritesPage() {
  const profile = await requireProfile();
  // Before the read: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const result = await listFavorites(profile.id);
  const now = new Date(checkedAt);

  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id}>
      {!result.ok ? (
        <InlineAlert
          tone="danger"
          className="mt-6"
          action={
            <Link
              href={ROUTES.favourites}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {t.retry}
            </Link>
          }
        >
          {t.error}
        </InlineAlert>
      ) : result.data.items.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={result.data.offline > 0 ? t.offlineTitle : t.emptyTitle}
          description={result.data.offline > 0 ? t.offline(result.data.offline) : t.emptyText}
          action={
            <Button asChild>
              <Link href={ROUTES.search}>{t.action}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mt-2 text-lk-secondary text-lk-ink-3">
            {t.count(result.data.items.length)}
          </p>
          <ul aria-label={t.list} className="mt-5 grid gap-3 md:grid-cols-2">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <PropertyCard
                  variant="compact"
                  {...toPropertyCard(item, now)}
                  action={
                    <FavoriteButton
                      listingId={item.id}
                      favorite
                      checkedAt={checkedAt}
                      signUpHref={buyerSignUpHref(item.slug)}
                      property={`${listingSummary(item)}, ${item.city}`}
                    />
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {result.ok ? (
        <ClearOfflineFavorites
          count={result.data.offline}
          showCount={result.data.items.length > 0}
          className={result.data.items.length === 0 ? "items-center text-center" : undefined}
        />
      ) : null}
    </SpacePage>
  );
}
