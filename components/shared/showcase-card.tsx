"use client";

import { useState, type ReactNode } from "react";
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
  sizes?: string;
  className?: string;
};

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
  sizes = "(min-width: 1024px) 300px, (min-width: 768px) 45vw, 272px",
  className,
}: ShowcaseCardProps) {
  const shown = photos.slice(0, SHOWCASE_PHOTOS);
  const [index, setIndex] = useState(0);
  const title = propertySummary({ propertyType, rooms, surfaceM2 }, "short", true);
  const several = shown.length > 1;
  return (
    <article className={cn("group relative flex flex-col gap-3", className)}>
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
                  {/* Below 768 px, only the main photo is loaded. */}
                  {position === 0 || index > 0 ? (
                    <Photo src={photo.src} alt={photo.alt} sizes={sizes} />
                  ) : (
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
          <span className="absolute left-3 top-3 z-10 rounded-full bg-lk-surface px-3 py-1.5 text-lk-caption font-bold text-lk-blue-dark shadow-lk-badge md:text-lk-label">
            {badge}
          </span>
        ) : null}
        {several ? (
          <>
            <span
              aria-hidden="true"
              className="absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 gap-1.5 md:flex"
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
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={href}
            className={cn(
              "min-w-0 truncate text-lk-body-lg font-bold text-lk-ink",
              // The link covers the whole card (its arrows and heart stay above).
              "after:absolute after:inset-0 after:rounded-lk-xl after:content-['']",
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
      {action ? <div className="absolute right-1.5 top-1.5 z-20">{action}</div> : null}
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
