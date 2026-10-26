"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FacadeDrawing } from "./facade-drawing";
import { Photo } from "./photo";
import { facadeScope } from "./facade-root";
import { IconButton } from "./icon-button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

export type GalleryPhoto = { src: string; alt: string };

export type GalleryProps = {
  photos: readonly GalleryPhoto[];
  /** Over the mobile photo, top left (back link). */
  topLeft?: ReactNode;
  /** Over the mobile photo, top right (favourite, L1-18). */
  topRight?: ReactNode;
  className?: string;
};

const t = fr.listing.gallery;

/** facade.svg on stone, never a grey « Photo » block (docs/DESIGN.md 7.1, 7.3). */
function NoPhoto({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center bg-lk-stone-2", className)}>
      <FacadeDrawing className="h-auto max-h-[70%] w-2/5 text-lk-ink-3" />
      <span className="sr-only">{t.none}</span>
    </div>
  );
}

/**
 * Listing photos (docs/DESIGN.md 10.3, 7.1). Mobile: one photo across the
 * width, 280 px, snap scrolling, counter « 1 / 12 », touch to enlarge.
 * Desktop: one large photo and four small ones, « + N photos » on the last;
 * taller from 1 536 px, where the page takes the width of the screen (L1-56).
 * Enlarged: full-screen viewer on ink 95 %, arrows, counter, Escape, focus
 * kept inside, keyboard arrows and swipe. Without photos: facade.svg.
 */
export function Gallery({ photos, topLeft, topRight, className }: GalleryProps) {
  const [viewer, setViewer] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const total = photos.length;
  const tiles = photos.slice(1, 5);

  return (
    <div className={className}>
      {/* Mobile */}
      <div className="relative h-70 lg:hidden">
        {total ? (
          <div
            className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const strip = event.currentTarget;
              setCurrent(Math.round(strip.scrollLeft / Math.max(strip.clientWidth, 1)));
            }}
          >
            {photos.map((photo, index) => (
              <button
                key={photo.src}
                type="button"
                aria-label={t.open(index + 1, total)}
                onClick={() => setViewer(index)}
                className="relative h-full w-full shrink-0 snap-center"
              >
                <Photo src={photo.src} alt={photo.alt} sizes="100vw" priority={index === 0} />
              </button>
            ))}
          </div>
        ) : (
          <NoPhoto className="h-full" />
        )}
        {topLeft ? <div className="absolute left-4 top-4">{topLeft}</div> : null}
        {topRight ? <div className="absolute right-4 top-4">{topRight}</div> : null}
        {total > 1 ? (
          <span
            aria-hidden="true"
            className="absolute bottom-3 right-4 rounded-full bg-lk-ink/80 px-2.5 py-1 text-lk-caption font-medium tabular text-white"
          >
            {t.counter(current + 1, total)}
          </span>
        ) : null}
      </div>

      {/* Desktop */}
      {total ? (
        <div
          className={cn(
            "hidden h-77.5 gap-2.5 lg:grid min-[1440px]:h-92.5 2xl:h-[min(30vw,35rem)]",
            total === 1 && "grid-cols-1",
            total > 1 && total < 5 && "grid-cols-[2fr_1fr]",
            total === 2 && "grid-rows-1",
            total === 3 && "grid-rows-2",
            total === 4 && "grid-rows-3",
            total >= 5 && "grid-cols-[2fr_1fr_1fr] grid-rows-2",
          )}
        >
          {photos.slice(0, 1).map((photo) => (
            <button
              key={photo.src}
              type="button"
              aria-label={t.open(1, total)}
              onClick={() => setViewer(0)}
              className="relative row-span-full overflow-hidden rounded-lk-md"
            >
              <Photo
                src={photo.src}
                alt={photo.alt}
                sizes="(min-width: 1280px) 600px, 50vw"
                priority
              />
            </button>
          ))}
          {tiles.map((photo, index) => {
            const more = index === 3 && total > 5 ? total - 5 : 0;
            return (
              <button
                key={photo.src}
                type="button"
                aria-label={more ? t.openMore(more, index + 2, total) : t.open(index + 2, total)}
                onClick={() => setViewer(index + 1)}
                className="relative overflow-hidden rounded-lk-sm"
              >
                <Photo src={photo.src} alt={photo.alt} sizes="300px" />
                {more ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-lk-ink/55 text-lk-label font-semibold text-white">
                    {t.more(more)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <NoPhoto className="hidden h-77.5 rounded-lk-md lg:flex min-[1440px]:h-92.5 2xl:h-[min(30vw,35rem)]" />
      )}

      {total ? <Viewer photos={photos} index={viewer} onIndexChange={setViewer} /> : null}
    </div>
  );
}

function Viewer({
  photos,
  index,
  onIndexChange,
}: {
  photos: readonly GalleryPhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const total = photos.length;
  const current = index ?? 0;
  const go = (step: number) => onIndexChange((current + step + total) % total);

  return (
    <DialogPrimitive.Root
      open={index !== null}
      onOpenChange={(open) => {
        if (!open) onIndexChange(null);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-60 bg-lk-ink/95" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(1);
            if (event.key === "ArrowLeft") go(-1);
          }}
          className={cn(
            facadeScope,
            "fixed inset-0 z-60 flex flex-col bg-transparent text-white outline-none",
          )}
        >
          <div className="flex items-center justify-between gap-4 p-4">
            <DialogPrimitive.Title className="sr-only">{t.viewer}</DialogPrimitive.Title>
            <p aria-live="polite" className="text-lk-compact font-medium tabular">
              {t.counter(current + 1, total)}
            </p>
            <DialogPrimitive.Close asChild>
              <IconButton icon={X} variant="on-dark" aria-label={t.close} />
            </DialogPrimitive.Close>
          </div>
          <div
            className="relative min-h-0 flex-1"
            onTouchStart={(event: TouchEvent) => {
              touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event: TouchEvent) => {
              const start = touchStart.current;
              const end = event.changedTouches[0]?.clientX;
              touchStart.current = null;
              if (start === null || end === undefined || Math.abs(end - start) < 40) return;
              go(end < start ? 1 : -1);
            }}
          >
            {/* One per photo: its own loading, its own failure. */}
            <Photo
              key={photos[current].src}
              src={photos[current].src}
              alt={photos[current].alt}
              sizes="100vw"
              fit="contain"
            />
          </div>
          {total > 1 ? (
            <div className="flex items-center justify-center gap-4 p-4">
              <IconButton
                icon={ChevronLeft}
                variant="on-dark"
                aria-label={t.previous}
                onClick={() => go(-1)}
              />
              <IconButton
                icon={ChevronRight}
                variant="on-dark"
                aria-label={t.next}
                onClick={() => go(1)}
              />
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
