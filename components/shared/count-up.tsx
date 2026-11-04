"use client";

import { useEffect, useRef, useState } from "react";
import { countable } from "@/lib/figures";
import { formatInteger, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

// Figures that roll up, as on the V1 (leenkey.js, « count-up for stats »,
// Younes 2026-11-04): from 0 the first time the figure comes into view, then
// from the figure shown to the new one when it changes (the savings of the
// simulator). The page is drawn with the figure itself: without JavaScript,
// with reduced motion, or already on screen when the page wakes up, nothing
// moves (DESIGN.md 9). Screen readers read the figure only, never the
// figures it rolls through; on paper, the figure itself (app/globals.css,
// [data-count-up]).

const FIRST_MS = 1300;
const CHANGE_MS = 600;
/** Part of the figure in view before it starts rolling. */
const THRESHOLD = 0.3;

const FORMATS = {
  /** Cents, as « 16 010 € ». */
  price: formatPrice,
  /** « 15 000 ». */
  integer: formatInteger,
} as const;

export type CountUpFormat = keyof typeof FORMATS;

export function CountUp({
  value,
  format = "integer",
  suffix = "",
  className,
}: {
  value: number;
  format?: CountUpFormat;
  /** After the number: « + », « ans », « % » (its space included). */
  suffix?: string;
  /** Its alignment in the place it holds (« text-right » for an amount). */
  className?: string;
}) {
  const text = (count: number) => `${FORMATS[format](count)}${suffix}`;
  const element = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(value);
  const started = useRef(false);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = element.current;
    let frame = 0;
    const show = (count: number) => {
      shownRef.current = count;
      setShown(count);
    };
    const roll = (from: number, duration: number) => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 3;
        show(Math.round(from + (value - from) * eased));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show(value);
      return;
    }
    if (started.current) {
      roll(shownRef.current, CHANGE_MS);
      return () => cancelAnimationFrame(frame);
    }
    // On screen when the page wakes up: it stays as drawn, never back to 0;
    // already at 0 (changed before it rolled), it rolls to the new figure.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      started.current = true;
      if (shownRef.current === value) return;
      roll(shownRef.current, CHANGE_MS);
      return () => cancelAnimationFrame(frame);
    }
    show(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        started.current = true;
        roll(0, FIRST_MS);
      },
      { threshold: THRESHOLD },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  // The place of the widest figure is held, so that nothing around moves
  // while it rolls (« 0 € » is narrower than « 16 010 € » and may unwrap a
  // line): the figure shown over the one held, invisible.
  return (
    <span ref={element} data-count-up="" className={cn("inline-grid", className)}>
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {text(Math.max(shown, value))}
      </span>
      <span aria-hidden="true" data-count-up-shown="" className="col-start-1 row-start-1">
        {text(shown)}
      </span>
      <span className="sr-only">{text(value)}</span>
    </span>
  );
}

/**
 * A figure written as text that rolls up when it is a number (« 300+ »,
 * « 15 000 € »), as it is written otherwise (« 24 / 7 »). For the Server
 * Components: the text is read here, in the browser bundle.
 */
export function CountUpText({ text }: { text: string }) {
  const figure = countable(text);
  return figure ? <CountUp value={figure.value} suffix={figure.suffix} /> : text;
}
