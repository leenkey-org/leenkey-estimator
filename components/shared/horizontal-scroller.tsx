"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

/**
 * A row of cards that scrolls sideways (docs/DESIGN.md 10.4, the steps of a
 * sale, Younes 2026-11-07): each card stops at the start of the row (snap),
 * the row opens on the card given (the current step), and the next card
 * shows at the edge so that the row reads as one to swipe. From 768 px,
 * « previous » and « next » above it. The row is a named region that takes
 * the focus: the arrows of the keyboard scroll it.
 */
export function HorizontalScroller({
  label,
  start = 0,
  previousLabel,
  nextLabel,
  className,
  itemClassName,
  children,
}: {
  /** The name of the row, read by screen readers. */
  label: string;
  /** The card shown first. */
  start?: number;
  previousLabel: string;
  nextLabel: string;
  /** The row: its margins (a bleed to the edges of the page on a phone). */
  className?: string;
  /** Each card: its width. */
  itemClassName?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const measure = useCallback(() => {
    const row = track.current;
    if (!row) return;
    const atStart = row.scrollLeft <= 4;
    const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 4;
    // The same edges: no new render at each frame of a scroll.
    setEdges((edges) =>
      edges.atStart === atStart && edges.atEnd === atEnd ? edges : { atStart, atEnd },
    );
  }, []);

  // Opens on the card given, at once (no motion on arrival). When the card
  // given changes while the person acts in the row (a task ticked that ends
  // the current step), the row stays where they are.
  useEffect(() => {
    const row = track.current;
    if (row?.contains(document.activeElement)) {
      measure();
      return;
    }
    const list = row?.firstElementChild;
    const card = list?.children[start];
    if (row && card instanceof HTMLElement) {
      // The card at the start of the row: where it sits in the row, less the
      // room kept before a card that stops (scroll-padding).
      const style = getComputedStyle(row);
      const padding = parseFloat(style.paddingLeft) || 0;
      const room = parseFloat(style.scrollPaddingLeft) || 0;
      row.scrollLeft = card.offsetLeft + padding - room;
    }
    measure();
  }, [start, measure]);

  useEffect(() => {
    const row = track.current;
    if (!row) return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measure]);

  function turn(direction: 1 | -1) {
    const row = track.current;
    const card = row?.firstElementChild?.firstElementChild;
    if (!row || !(card instanceof HTMLElement)) return;
    // One card (and its gap); the snap lines it up. Smooth, unless the
    // visitor asked for less motion (scrollBy ignores the CSS rule).
    const gap = parseFloat(getComputedStyle(row.firstElementChild as Element).columnGap || "0");
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="hidden justify-end gap-3 md:flex">
        <IconButton
          icon={ChevronLeft}
          variant="round"
          aria-label={previousLabel}
          // Off but in place at the ends: the focus stays on it.
          aria-disabled={edges.atStart || undefined}
          onClick={() => !edges.atStart && turn(-1)}
        />
        <IconButton
          icon={ChevronRight}
          variant="round"
          aria-label={nextLabel}
          aria-disabled={edges.atEnd || undefined}
          onClick={() => !edges.atEnd && turn(1)}
        />
      </div>
      <div
        ref={track}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={measure}
        className={cn(
          "snap-x snap-mandatory overflow-x-auto pb-2 [scrollbar-width:thin]",
          // The ring inside the row: at the edges of a phone it would be cut.
          "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-lk-brand-blue focus-visible:outline-solid",
          className,
        )}
      >
        {/* The room after the last card (the end padding of a scrolled row
            does not count): the gap plus 8, then 24, as before the first. */}
        <ol className="relative flex gap-3 after:w-2 after:shrink-0 md:gap-4 md:after:w-6">
          {Children.toArray(children).map((child, index) => (
            <li key={index} className={cn("flex shrink-0 snap-start", itemClassName)}>
              {child}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
