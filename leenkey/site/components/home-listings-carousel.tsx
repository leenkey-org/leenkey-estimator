"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  House,
  LandPlot,
  LayoutGrid,
  TreeDeciduous,
} from "lucide-react";
import { IconButton } from "@/components/shared/icon-button";
import { ShowcaseCard, type ShowcaseCardProps } from "@/components/shared/showcase-card";
import { FavoriteButton } from "@/leenkey/favorites/components/favorite-button";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { HOME_CATEGORIES, type HomeCategory } from "../home-categories";
import { HOME_SECTION_TITLE } from "../home-styles";

const t = fr.site.home.listings;

const ICONS: Record<HomeCategory, typeof House> = {
  all: LayoutGrid,
  maison: House,
  appartement: Building2,
  jardin: TreeDeciduous,
  parking: Car,
  terrain: LandPlot,
};

export type CarouselListing = Omit<ShowcaseCardProps, "action" | "className" | "sizes"> & {
  id: string;
  categories: readonly HomeCategory[];
  /** Saved by the signed-in account; null without a session. */
  favorite: boolean | null;
  signUpHref: string;
};

/**
 * Categories and carousel of « Biens à vendre près de chez vous »
 * (docs/design-handoff/SPECS.md 2, 3): the categories filter the cards (a
 * toggle each); four cards a page from 1 024 px with the round arrows and
 * « 1 / 3 », the arrow of an end in the colour of « Désactivé »; swiped with
 * a snap on a phone. « Voir les N biens » leads to the search of the same
 * category, its number counted.
 */
export function HomeListingsCarousel({
  listings,
  total,
  complete,
  links,
  checkedAt,
}: {
  listings: readonly CarouselListing[];
  /** Listings online around Épinay, all categories. */
  total: number;
  /** Whether `listings` holds all of them: the count of a category is then exact. */
  complete: boolean;
  links: Record<HomeCategory, string>;
  checkedAt: number;
}) {
  const [category, setCategory] = useState<HomeCategory>("all");
  const shown = listings.filter(
    (listing) => category === "all" || listing.categories.includes(category),
  );
  const count = category === "all" ? total : complete ? shown.length : null;
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const list = track.current;
    if (!list) return;
    const width = list.clientWidth || 1;
    setPages(Math.max(1, Math.ceil((list.scrollWidth - 4) / width)));
    setPage(Math.round(list.scrollLeft / width));
  }, []);

  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    measure();
  }, [category, measure]);

  // Observed again when the list comes back after an empty category.
  const empty = shown.length === 0;
  useEffect(() => {
    const list = track.current;
    if (!list || empty) return;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure, empty]);

  function turn(direction: 1 | -1) {
    const list = track.current;
    if (!list) return;
    // Smooth, unless the visitor asked for less motion (scrollBy ignores the CSS rule).
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }

  const allLabel = count === null ? t.browse : t.all(count, formatInteger(count));
  const allShort = count === null ? t.browse : t.allShort(count, formatInteger(count));

  return (
    <div>
      <div
        role="group"
        aria-label={t.categories}
        className="flex gap-5.5 overflow-x-auto border-b border-lk-line px-4 [scrollbar-width:none] md:gap-8 md:overflow-visible md:px-0"
      >
        {HOME_CATEGORIES.map((value) => {
          const Icon = ICONS[value];
          const active = value === category;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(value)}
              className={cn(
                "-mb-px flex min-w-14 shrink-0 flex-col items-center gap-1.5 border-b-2 px-0.5 pt-1 pb-3 text-lk-label font-semibold md:min-w-16 md:gap-2 md:pt-1.5 md:pb-3.5 md:text-lk-compact",
                "transition-colors duration-140 ease-out-lk",
                active
                  ? "border-lk-blue text-lk-blue"
                  : "border-transparent text-lk-ink-2 hover:text-lk-ink",
                "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-blue focus-visible:outline-solid",
              )}
            >
              <Icon aria-hidden="true" strokeWidth={1.6} className="size-6 md:size-6.5" />
              {t.category[value]}
            </button>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-4 px-4 pt-5.5 pb-3.5 md:px-0 md:pt-7 md:pb-5">
        <div>
          <h2 id="pres-de-chez-vous" className={HOME_SECTION_TITLE}>
            {t.title}
          </h2>
          <p className="mt-0.5 text-lk-compact text-lk-ink-3 md:mt-1.5 md:text-lk-body-lg">
            {t.place}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={links[category]}
            className="inline-flex min-h-11 items-center text-lk-compact font-bold text-lk-blue underline-offset-3 hover:underline md:text-lk-body-lg"
          >
            <span className="md:hidden">{allShort}</span>
            <span className="hidden md:inline">{allLabel}</span>
          </Link>
          {pages > 1 ? (
            <div className="hidden items-center gap-3 md:flex">
              <span
                className="min-w-10 text-center text-lk-compact tabular text-lk-ink-2"
                aria-hidden="true"
              >
                {t.page(page + 1, pages)}
              </span>
              <IconButton
                icon={ChevronLeft}
                variant="round"
                aria-label={t.previous}
                // Off but in place at the ends: the focus stays on it.
                aria-disabled={page === 0 || undefined}
                onClick={() => page > 0 && turn(-1)}
              />
              <IconButton
                icon={ChevronRight}
                variant="round"
                aria-label={t.next}
                aria-disabled={page >= pages - 1 || undefined}
                onClick={() => page < pages - 1 && turn(1)}
              />
            </div>
          ) : null}
        </div>
      </div>

      {shown.length > 0 ? (
        <ul
          ref={track}
          aria-labelledby="pres-de-chez-vous"
          onScroll={measure}
          className={cn(
            "flex snap-x snap-mandatory gap-3.5 overflow-x-auto scroll-smooth px-4 pb-1 [scrollbar-width:none] md:scroll-px-0 md:px-0",
            "scroll-px-4 lg:gap-6 motion-reduce:scroll-auto",
          )}
        >
          {shown.map(({ id, categories, favorite, signUpHref, ...card }) => (
            <li
              key={id}
              className="w-68 shrink-0 snap-start md:w-[calc((100%-0.875rem)/2)] lg:w-[calc((100%-4.5rem)/4)]"
            >
              <ShowcaseCard
                {...card}
                action={
                  <FavoriteButton
                    listingId={id}
                    favorite={favorite}
                    checkedAt={checkedAt}
                    signUpHref={signUpHref}
                    variant="photo"
                  />
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 text-lk-body text-lk-ink-2 md:px-0">{t.empty}</p>
      )}
    </div>
  );
}
