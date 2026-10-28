"use client";

import { useId, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DpeBadge, type DpeClass } from "./dpe-badge";
import { FacadeDrawing } from "./facade-drawing";
import { Photo } from "./photo";
import { propertySummary, type PropertyCardData } from "./property-card";
import { SHOWCASE_PHOTOS } from "./showcase-photos";
import { formatPrice } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.showcaseCard;

export { SHOWCASE_PHOTOS };

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
   * The photos turn on a phone too, with a swipe and with the arrows, their
   * dots shown (the list of the search, L1-55); off in a carousel of cards
   * swiped sideways, where the main photo shows alone on a phone.
   */
  swipe?: boolean;
  /** A frame that turns blue on hover and press (the list of the search, L1-55). */
  framed?: boolean;
  /** The main photo is the largest image of the page: loaded first. */
  priority?: boolean;
  /** wide: a photo of 3 by 2, lower, for the card shown over a map (L1-62). */
  photoShape?: "tall" | "wide";
  sizes?: string;
  className?: string;
};

/** A swipe of more than this, clearly sideways, turns the photo. */
const SWIPE_PX = 40;

/**
 * Card of a property of the charte D (docs/design-handoff-d/SPECS.md 2): the
 * photo rounded 18 px (ratio 1 / 0.95, 272 px wide in a carousel on a phone),
 * a badge in the gradient at the top left, the heart at the top right; below,
 * « Maison 5 p · 112 m² » and its DPE, the city, the price in bold. The whole card
 * opens the listing: its title is the link, first in the order of the page,
 * stretched over the card and described by the city and the price. Its
 * photos turn with arrows from 768 px (always shown on a touch screen),
 * where the dots count them; with `swipe`, on a phone too. A slow zoom of
 * the photo on hover.
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
  priority = false,
  photoShape = "tall",
  sizes = "(min-width: 1536px) 18vw, (min-width: 1024px) 23vw, (min-width: 768px) 45vw, 272px",
  className,
}: ShowcaseCardProps) {
  const id = useId();
  const shown = photos.slice(0, SHOWCASE_PHOTOS);
  const [index, setIndex] = useState(0);
  const title = propertySummary({ propertyType, rooms, surfaceM2 }, "short", true);
  const several = shown.length > 1;
  const frame = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  // The finger on the photo only, one finger (never a pinch).
  function onTouchStart(event: TouchEvent) {
    const point = event.touches[0];
    const box = frame.current?.getBoundingClientRect();
    touch.current =
      event.touches.length === 1 &&
      point &&
      box &&
      point.clientY >= box.top &&
      point.clientY <= box.bottom
        ? { x: point.clientX, y: point.clientY }
        : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touch.current;
    const point = event.changedTouches[0];
    touch.current = null;
    if (!start || !point) return;
    const dx = point.clientX - start.x;
    // Clearly sideways: a scroll of the page down the list never turns it.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < 1.5 * Math.abs(point.clientY - start.y)) return;
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
        // The frame of the cards of the search (Younes: « encadré qui devient bleu »),
        // as high as the others of its row.
        framed &&
          "h-full rounded-lk-2xl border border-lk-line bg-lk-surface p-2 pb-3 transition-[border-color,box-shadow] duration-140 ease-out-lk hover:border-lk-blue hover:shadow-lk-hover has-[a:active]:border-lk-blue",
        className,
      )}
    >
      {/* First in the page, drawn below the photo: the link before the arrows. */}
      <div className={cn("order-2 flex flex-col gap-0.5", framed && "px-1.5")}>
        <div className={cn("flex justify-between gap-2", framed ? "items-start" : "items-center")}>
          <Link
            href={href}
            aria-describedby={`${id}-place ${id}-price`}
            className={cn(
              "min-w-0 text-lk-ink",
              "text-lk-title font-semibold",
              // Two lines in the narrower cards of the search, beside their DPE.
              framed ? "line-clamp-2" : "truncate",
              // The link covers the whole card, photo included (its arrows and
              // heart stay above it).
              "after:absolute after:inset-0 after:z-5 after:content-['']",
              framed ? "after:rounded-lk-2xl" : "after:rounded-lk-d-card",
              "focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-lk-brand-blue focus-visible:after:outline-solid",
            )}
          >
            {title}
          </Link>
          {dpe ? (
            <DpeBadge
              value={dpe}
              className="shrink-0 rounded-lk-md px-2 py-0.5 text-lk-micro font-bold"
            />
          ) : null}
        </div>
        <p id={`${id}-place`} className="truncate text-lk-compact text-lk-ink-3">
          {city}
        </p>
        <p
          id={`${id}-price`}
          className="mt-1 text-lk-d-lead font-bold tracking-lk-d-snug tabular text-lk-ink"
        >
          {formatPrice(priceCents)}
        </p>
      </div>
      <div
        ref={frame}
        className={cn(
          "relative order-1 overflow-hidden rounded-lk-d-card bg-lk-line",
          photoShape === "wide" ? "aspect-[3/2]" : "aspect-[1/0.95]",
        )}
      >
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
                  {position > index + 1 ? null : position === 0 || index > 0 || swipe ? (
                    // The photo shown and the next one: a turn does not wait.
                    <Photo
                      src={photo.src}
                      alt={photo.alt}
                      sizes={sizes}
                      priority={priority && position === 0}
                    />
                  ) : (
                    // Without swipe, the next one only where arrows can show it.
                    <span className="hidden md:contents">
                      <Photo src={photo.src} alt={photo.alt} sizes={sizes} />
                    </span>
                  )}
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
          // Over the link, but a touch on it still opens the listing.
          <span className="lk-gradient pointer-events-none absolute top-3 left-3 z-10 rounded-full px-3 py-1.25 text-lk-caption font-semibold text-white shadow-lk-d-badge">
            {badge}
          </span>
        ) : null}
        {several ? (
          <>
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 gap-1.5",
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
              phone={swipe}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            />
            <PhotoArrow
              side="right"
              label={t.nextPhoto}
              atEnd={index === shown.length - 1}
              phone={swipe}
              onClick={() => setIndex((current) => Math.min(shown.length - 1, current + 1))}
            />
            <span className="sr-only" aria-live="polite">
              {index > 0 ? t.photoPosition(index + 1, shown.length) : ""}
            </span>
          </>
        ) : null}
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
 * off (aria-disabled), so that the focus is never lost; it then leaves the
 * order of the Tab key and lets a touch through to the listing. Shown on
 * hover of the card or under the focus, always on a touch screen (no hover
 * there); on a phone with `phone` only.
 */
function PhotoArrow({
  side,
  label,
  atEnd,
  phone,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  atEnd: boolean;
  phone: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={atEnd || undefined}
      tabIndex={atEnd ? -1 : undefined}
      onClick={atEnd ? undefined : onClick}
      className={cn(
        "absolute top-1/2 z-20 size-11 -translate-y-1/2 items-center justify-center rounded-full",
        phone ? "flex" : "hidden md:flex",
        side === "left" ? "left-2" : "right-2",
        "opacity-0 transition-opacity duration-140 focus-visible:opacity-100",
        atEnd
          ? "pointer-events-none cursor-default"
          : "group-hover:opacity-100 pointer-coarse:opacity-100",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
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
