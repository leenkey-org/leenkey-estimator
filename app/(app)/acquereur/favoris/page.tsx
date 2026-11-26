import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterPills } from "@/components/shared/filter-pills";
import { InlineAlert } from "@/components/shared/inline-alert";
import { PropertyCard } from "@/components/shared/property-card";
import { requireProfile } from "@/core/auth/session";
import { ClearOfflineFavorites } from "@/leenkey/favorites/components/clear-offline-favorites";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import {
  FavoriteListActions,
  FavoriteListSelect,
  NewFavoriteList,
} from "@/leenkey/favorites/components/favorite-lists";
import { FavoriteListsStatus } from "@/leenkey/favorites/components/favorite-lists-status";
import {
  LIST_PARAM,
  inListFilter,
  listFilterHref,
  listFilterKey,
  parseListFilter,
} from "@/leenkey/favorites/lists";
import { listFavorites } from "@/leenkey/favorites/queries";
import { buyerSignUpHref, listingSummary } from "@/leenkey/listings/presentation";
import { ROUTES } from "@/leenkey/navigation/config";
import { toPropertyCard } from "@/leenkey/search/cards";
import { frFavorites } from "@/lib/i18n/sections/favorites";
import { cn } from "@/lib/utils";
import { FAVORITE_LISTS_MAX } from "@/lib/validations/favorites";
import { SpacePage } from "../../_components/space-page";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { favorites: frFavorites } as const;

const t = fr.favorites.page;
const tl = fr.favorites.lists;

export const metadata: Metadata = { title: t.metaTitle };

// L1-18: the listings saved with the heart, most recent first (G2 without the
// map, PropertyCard compact, docs/DESIGN.md 11). A card unsaved here stays
// until the next visit, so that a mistaken tap can be undone. The saved
// listings no longer online are counted, and can be removed in one go.
// Named lists (DECISIONS.md 2026-11-26): the account files its favourites in
// lists it names; the page is filtered by its address (`?liste=`), and each
// card has its menu « Ranger dans une liste » once a list exists.
export default async function FavouritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  // Before the read: a heart changed since then wins (favorite-store.ts).
  const checkedAt = Date.now();
  const result = await listFavorites(profile.id);
  const now = new Date(checkedAt);

  if (!result.ok) {
    return (
      <SpacePage title={t.title} roles={profile.roles} profileId={profile.id} wide>
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
      </SpacePage>
    );
  }

  const { items, offline, lists } = result.data;
  const filter = parseListFilter(params[LIST_PARAM], lists);
  const scope = listFilterKey(filter);
  const shown = items.filter((item) => inListFilter(item.listId, scope));
  const hasLists = lists.length > 0;
  const unfiled = items.filter((item) => item.listId === null).length;

  return (
    <SpacePage title={t.title} roles={profile.roles} profileId={profile.id} wide>
      {hasLists || items.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          {hasLists ? (
            <FilterPills
              label={tl.nav}
              className="min-w-0"
              items={[
                { key: "all", label: tl.all, count: items.length },
                ...lists.map((list) => ({ key: list.id, label: list.name, count: list.count })),
                { key: "none", label: tl.none, count: unfiled },
              ].map(({ key, label, count }) => ({
                href: listFilterHref(ROUTES.favourites, key),
                label,
                count,
                active: key === scope,
              }))}
            />
          ) : null}
          <NewFavoriteList
            scope={scope}
            full={lists.length >= FAVORITE_LISTS_MAX}
            className="shrink-0"
          />
        </div>
      ) : null}
      {filter.kind === "list" ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h2 className="min-w-0 break-words text-lk-h2 font-bold text-wide text-lk-ink">
            {filter.list.name}
          </h2>
          <FavoriteListActions
            // A list at a time: its dialogs start again with the next one.
            key={filter.list.id}
            list={filter.list}
            allHref={ROUTES.favourites}
            className="-ml-3.5 flex flex-wrap gap-x-1 md:ml-0"
          />
        </div>
      ) : null}
      <FavoriteListsStatus scope={scope} className="mt-3" />
      {items.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={offline > 0 ? t.offlineTitle : t.emptyTitle}
          description={offline > 0 ? t.offline(offline) : t.emptyText}
          action={
            <Button asChild>
              <Link href={ROUTES.search}>{t.action}</Link>
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-12"
          titleAs={filter.kind === "list" ? "h3" : "h2"}
          title={filter.kind === "list" ? tl.emptyListTitle : tl.emptyNoneTitle}
          description={filter.kind === "list" ? tl.emptyListText : tl.emptyNoneText}
          action={
            <Button asChild variant="secondary">
              <Link href={ROUTES.favourites}>{tl.seeAll}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mt-2 text-lk-secondary text-lk-ink-3">{t.count(shown.length)}</p>
          <ul
            aria-label={t.list}
            className={cn(
              "mt-5 grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
              // Room for the menu of each card.
              hasLists ? "gap-x-3 gap-y-5" : "gap-3",
            )}
          >
            {shown.map((item) => {
              const property = `${listingSummary(item)}, ${item.city}`;
              return (
                <li key={item.id} className="min-w-0">
                  <PropertyCard
                    variant="compact"
                    {...toPropertyCard(item, now)}
                    action={
                      <FavoriteButton
                        listingId={item.id}
                        favorite
                        checkedAt={checkedAt}
                        signUpHref={buyerSignUpHref(item.slug)}
                        property={property}
                      />
                    }
                  />
                  {hasLists ? (
                    <FavoriteListSelect
                      listingId={item.id}
                      listId={item.listId}
                      lists={lists}
                      property={property}
                      scope={scope}
                      className="mt-2"
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <ClearOfflineFavorites
        count={offline}
        showCount={items.length > 0}
        className={items.length === 0 ? "items-center text-center" : undefined}
      />
    </SpacePage>
  );
}
