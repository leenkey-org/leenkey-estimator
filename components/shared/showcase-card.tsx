"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DpeBadge, type DpeClass } from "./dpe-badge";
import { FacadeDrawing } from "./facade-drawing";
import { Photo } from "./photo";
import { propertySummary, type PropertyCardData } from "./property-card";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.showcaseCard;

/** At most five photos per card, as the dots can count them. */
export const SHOWCASE_PHOTOS = 5;

export type ShowcaseCardProps = Pick<
  PropertyCardData,
  "href" | "priceCents" | "propertyType" | "rooms" | "surfaceM2"
> & {
  city: string;
  dpe?: DpeClass | null;
  /** The main photo first; none: the brand drawing on stone. */
  photos: readonly { src: string; alt: string }[];
  /** White badge over the photo, from the data of the listing (« Nouveau »). */
  badge?: string;
  /** The heart, 44 px over the top right corner of the photo, outside the link. */
  action?: ReactNode;
  /**
   * The photos turn with a swipe on a phone too, their dots shown (the list
   * of the search, L1-55); off in a carousel of cards swiped sideways.
   */
  swipe?: boolean;
  /** A frame that turns blue on hover and press (the list of the search, L1-55). */
  framed?: boolean;
  sizes?: string;
  className?: string;
};

/** A swipe of more than this, mostly sideways, turns the photo. */
const SWIPE_PX = 40;

/**
 * Card of a property of direction C (docs/design-handoff/SPECS.md 2): the
 * photo rounded 16 px (ratio 1 / 0.95, 272 px wide in a carousel on a phone),
 * a white badge at the top left, the heart at the top right; below, « Maison 5
 * p · 112 m² » and its DPE, the city, the price underlined. The whole card
 * opens the listing (its title is the link, stretched over the card), and
 * its photos turn with arrows from 768 px, where the dots count them; on a
 * phone the card sits in a carousel swiped sideways, so only the main photo
 * shows. A slow zoom of the photo on hover.
 */
export function ShowcaseCard({
  href,
  priceCents,
  propertyType,
  rooms,
  surfaceM2,
  city,
  dpe,
  photos,
  badge,
  action,
  swipe = false,
  framed = false,
  sizes = "(min-width: 1024px) 300px, (min-width: 768px) 45vw, 272px",
  className,
}: ShowcaseCardProps) {
  const shown = photos.slice(0, SHOWCASE_PHOTOS);
  const [index, setIndex] = useState(0);
  const title = propertySummary({ propertyType, rooms, surfaceM2 }, "short", true);
  const several = shown.length > 1;
  const touch = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(event: TouchEvent) {
    const point = event.touches[0];
    touch.current = point ? { x: point.clientX, y: point.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touch.current;
    const point = event.changedTouches[0];
    touch.current = null;
    if (!start || !point) return;
    const dx = point.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(point.clientY - start.y)) return;
    setIndex((current) =>
      dx < 0 ? Math.min(shown.length - 1, current + 1) : Math.max(0, current - 1),
    );
  }

  return (
    <article
      onTouchStart={swipe && several ? onTouchStart : undefined}
      onTouchEnd={swipe && several ? onTouchEnd : undefined}
      className={cn(
        "group relative flex flex-col gap-3",
        // The frame of the cards of the search (Younes: « encadré qui devient bleu »).
        framed &&
          "rounded-lk-2xl border border-lk-line bg-lk-surface p-2 pb-3 transition-[border-color,box-shadow] duration-140 ease-out-lk hover:border-lk-blue hover:shadow-lk-hover has-[a:active]:border-lk-blue",
        className,
      )}
    >
      <div className="relative aspect-[1/0.95] overflow-hidden rounded-lk-xl bg-lk-line">
        {shown.length ? (
          <div
            className="flex h-full transition-transform duration-300 ease-out-lk motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {shown.map((photo, position) => (
              <div
                key={photo.src}
                // The photos not shown are hidden from screen readers too.
                aria-hidden={position !== index || undefined}
                className="relative h-full w-full shrink-0 overflow-hidden"
              >
                <span className="absolute inset-0 transition-transform duration-300 ease-out-lk motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none">
                  {/* The photo shown and the next one: a turn never waits. */}
                  {position <= index + 1 ? (
                    <Photo src={photo.src} alt={photo.alt} sizes={sizes} />
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-lk-stone-2">
            <FacadeDrawing className="w-2/5 text-lk-ink-3" />
          </div>
        )}
        {badge ? (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-lk-surface px-3 py-1.5 text-lk-caption font-bold text-lk-blue-dark shadow-lk-badge md:text-lk-label">
            {badge}
          </span>
        ) : null}
        {several ? (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "absolute bottom-3 left-1/2 z-10 -translate-x-1/2 gap-1.5",
                swipe ? "flex" : "hidden md:flex",
              )}
            >
              {shown.map((photo, position) => (
                <span
                  key={photo.src}
                  className={cn(
                    "size-1.75 rounded-full",
                    position === index ? "bg-white" : "bg-white/60",
                  )}
                />
              ))}
            </span>
            {/* Over the stretched link: they turn the photos, never open the listing. */}
            <PhotoArrow
              side="left"
              label={t.previousPhoto}
              atEnd={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            />
            <PhotoArrow
              side="right"
              label={t.nextPhoto}
              atEnd={index === shown.length - 1}
              onClick={() => setIndex((current) => Math.min(shown.length - 1, current + 1))}
            />
            <span className="sr-only" aria-live="polite">
              {index > 0 ? t.photoPosition(index + 1, shown.length) : ""}
            </span>
          </>
        ) : null}
      </div>
      <div className={cn("flex flex-col gap-0.5", framed && "px-1.5")}>
        <div className={cn("flex justify-between gap-2", framed ? "items-start" : "items-center")}>
          <Link
            href={href}
            className={cn(
              "min-w-0 text-lk-body-lg font-bold text-lk-ink",
              // Two lines in the narrower cards of the search, beside their DPE.
              framed ? "line-clamp-2" : "truncate",
              // The link covers the whole card (its arrows and heart stay above).
              "after:absolute after:inset-0 after:content-['']",
              framed ? "after:rounded-lk-2xl" : "after:rounded-lk-xl",
              "focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-lk-blue focus-visible:after:outline-solid",
            )}
          >
            {title}
          </Link>
          {dpe ? (
            <DpeBadge
              value={dpe}
              className="shrink-0 rounded-lk-md px-2 py-0.5 text-lk-caption font-extrabold"
            />
          ) : null}
        </div>
        <p className="truncate text-lk-compact text-lk-ink-2 md:text-lk-body">{city}</p>
        <p className="mt-1 text-lk-card-price font-extrabold tabular text-lk-ink underline underline-offset-3">
          {formatPrice(priceCents)}
        </p>
      </div>
      {action ? (
        <div className={cn("absolute z-20", framed ? "right-3.5 top-3.5" : "right-1.5 top-1.5")}>
          {action}
        </div>
      ) : null}
    </article>
  );
}

/**
 * An arrow over the photo. At the first or the last photo it stays in place,
 * off (aria-disabled), so that the focus is never lost: hidden on hover,
 * shown dimmed while it has the focus.
 */
function PhotoArrow({
  side,
  label,
  atEnd,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  atEnd: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={atEnd || undefined}
      onClick={atEnd ? undefined : onClick}
      className={cn(
        "absolute top-1/2 z-20 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full md:flex",
        side === "left" ? "left-2" : "right-2",
        // Shown on hover of the card, or when it takes the focus.
        "opacity-0 transition-opacity duration-140 focus-visible:opacity-100",
        atEnd ? "cursor-default" : "group-hover:opacity-100",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue focus-visible:outline-solid",
      )}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-lk-surface/95 shadow-lk-badge",
          atEnd ? "text-lk-disabled" : "text-lk-ink",
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
    </button>
  );
}
