"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** What rises into place (app/globals.css): a block, the items of a grid, a drawing. */
const TARGETS = "[data-reveal], [data-reveal-stagger], [data-reveal-draw]";

/** Shown a little before the bottom of the screen, like the V1 home page. */
const ROOT_MARGIN = "0px 0px -10% 0px";

/**
 * Reveal on scroll of the public pages (DESIGN.md 9, DECISIONS 2026-10-20):
 * what is already on the screen stays as it is; what is below it is hidden
 * (data-reveal-pending), then rises into place once, when it enters the
 * screen. Without the script, with reduced motion or without
 * IntersectionObserver, nothing is ever hidden. Again on every page of the
 * site, the component staying in place from one to the next.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const show = (element: Element) => {
      element.removeAttribute("data-reveal-pending");
      element.setAttribute("data-revealed", "");
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: ROOT_MARGIN },
    );
    const height = window.innerHeight;
    for (const element of document.querySelectorAll(TARGETS)) {
      if (element.hasAttribute("data-revealed")) continue;
      const box = element.getBoundingClientRect();
      // On the screen already, or above it (back to a page scrolled down):
      // shown as it is, never hidden under the reader's eyes.
      if (box.top < height && (box.bottom > 0 || box.height > 0)) {
        show(element);
      } else {
        element.setAttribute("data-reveal-pending", "");
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
