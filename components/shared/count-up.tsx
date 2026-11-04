"use client";

import { useEffect, useRef, useState } from "react";
import { formatInteger, formatPrice } from "@/lib/format";

// Figures that roll up, as on the V1 (leenkey.js, « count-up for stats »,
// Younes 2026-11-04): from 0 the first time the figure comes into view, then
// from the figure shown to the new one when it changes (the savings of the
// simulator). The page is drawn with the figure itself: without JavaScript,
// with reduced motion, or already on screen when the page wakes up, nothing
// moves (DESIGN.md 9). Screen readers read the figure only, never the
// figures it rolls through.

const FIRST_MS = 1300;
const CHANGE_MS = 600;

const FORMATS = {
  /** Cents, as « 16 010 € ». */
  price: formatPrice,
  /** « 15 000 ». */
  integer: formatInteger,
} as const;

export type CountUpFormat = keyof typeof FORMATS;

/** The number at the start of a figure and what follows it (« 300+ », « 15 ans »), or null. */
export function countable(text: string): { value: number; suffix: string } | null {
  const match = /^(\d+(?:\s\d+)*)(\D*)$/u.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(/\s/gu, ""));
  return Number.isFinite(value) ? { value, suffix: match[2] } : null;
}

export function CountUp({
  value,
  format = "integer",
  suffix = "",
}: {
  value: number;
  format?: CountUpFormat;
  /** After the number: « + », « ans », « % » (its space included). */
  suffix?: string;
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
    // On screen when the page wakes up: it stays as drawn, never back to 0.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      started.current = true;
      show(value);
      return;
    }
    show(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        started.current = true;
        roll(0, FIRST_MS);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={element}>
      <span aria-hidden="true">{text(shown)}</span>
      <span className="sr-only">{text(value)}</span>
    </span>
  );
}
