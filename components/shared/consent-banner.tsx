"use client";

import { useEffect, useId, useRef, useState } from "react";
import { frConsent } from "@/lib/i18n/sections/consent";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { consent: frConsent } as const;

const t = fr.consent;

export type ConsentBannerProps = {
  /** « banner » on a first visit, « panel » for « Personnaliser » and « Gérer mes cookies ». */
  view: "banner" | "panel";
  /** Current choice for audience measurement, ticked in the panel. */
  analytics?: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onCustomize: () => void;
  onSave: (analytics: boolean) => void;
  /** The catalogue (/design) shows it in place instead of fixed at the bottom. */
  inline?: boolean;
  className?: string;
};

/**
 * Cookie consent (L1-37, docs/DESIGN.md 10.8): bottom sheet on mobile, card at
 * the bottom left from md. From lg the banner of a first visit is a thin bar
 * along the bottom of the screen: a card at the bottom left hid the search
 * card of the home page, its main action (DECISIONS.md 2026-11-23). The panel
 * of the preferences, opened by the visitor, stays a card. Refusing is as easy
 * as accepting: same buttons, side by side. Non-modal: the page stays usable
 * behind it.
 */
export function ConsentBanner({
  view,
  analytics = false,
  onAccept,
  onRefuse,
  onCustomize,
  onSave,
  inline = false,
  className,
}: ConsentBannerProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [audience, setAudience] = useState(analytics);
  // The bar of a first visit, from lg (never in the catalogue, shown in place).
  const bar = view === "banner" && !inline;

  // Reopened from « Gérer mes cookies »: keyboard focus goes to the panel.
  useEffect(() => {
    if (view === "panel" && !inline) titleRef.current?.focus();
  }, [view, inline]);

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      // Hidden by CSS before the JavaScript when a choice is kept (lib/consent.ts).
      data-consent-banner={view === "banner" && !inline ? "" : undefined}
      className={cn(
        "flex flex-col gap-3.5 bg-lk-surface p-5 text-lk-ink",
        inline
          ? "rounded-lk-md border border-lk-line"
          : [
              "fixed inset-x-0 bottom-0 z-50 rounded-t-lk-md border-t border-lk-line shadow-sheet",
              "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
              "md:inset-x-auto md:bottom-6 md:left-6 md:w-105 md:rounded-lk-md md:border md:pb-5 md:shadow-float",
              // The banner is there from the first paint; only the panel, opened later, slides in.
              view === "panel" &&
                "duration-220 ease-out-lk motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
              bar &&
                "lg:inset-x-0 lg:bottom-0 lg:w-auto lg:flex-row lg:items-center lg:gap-6 lg:rounded-none lg:border-x-0 lg:border-b-0 lg:px-8 lg:py-3 lg:pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:shadow-sheet",
            ],
        className,
      )}
    >
      {/* Not an <h2>, nor plain <a> styles: the V1 pages style these elements
          globally, outside any cascade layer, which would win over ours. */}
      <p
        id={titleId}
        ref={titleRef}
        role="heading"
        aria-level={2}
        tabIndex={-1}
        className={cn("text-lk-title font-semibold outline-none", bar && "lg:sr-only")}
      >
        {view === "panel" ? t.panelTitle : t.title}
      </p>

      {view === "banner" ? (
        <>
          {/* Short paragraphs, not one block: the text of the banner is never the
              largest paint of a page, whose content shows first (P-06). */}
          {/* In the bar the three paragraphs read as one text, on two or three lines. */}
          <div
            className={cn(
              "flex flex-col gap-1.5",
              bar && "lg:block lg:min-w-0 lg:flex-1 lg:leading-5",
            )}
          >
            <p className={cn("text-lk-secondary text-lk-ink-2", bar && "lg:inline")}>{t.text}</p>{" "}
            <p className={cn("text-lk-secondary text-lk-ink-2", bar && "lg:inline")}>
              {t.necessary}
            </p>{" "}
            <p className={cn("text-lk-secondary text-lk-ink-2", bar && "lg:inline")}>
              {t.textMore}{" "}
              <a
                href="/cookies"
                className="font-semibold text-lk-blue! underline! underline-offset-2"
              >
                {t.policy}
              </a>
            </p>
          </div>
          <div
            className={cn(
              "flex flex-col gap-3.5",
              bar && "lg:shrink-0 lg:flex-row lg:items-center lg:gap-2.5",
            )}
          >
            <div className={cn("grid grid-cols-2 gap-2.5", bar && "lg:w-64")}>
              <Button variant="outline-ink" onClick={onRefuse}>
                {t.refuse}
              </Button>
              <Button variant="outline-ink" onClick={onAccept}>
                {t.accept}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={onCustomize} className="self-center">
              {t.customize}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-lk-label font-semibold">{t.necessaryTitle}</p>
            <p className="text-lk-secondary text-lk-ink-2">{t.necessaryText}</p>
          </div>
          <Checkbox
            checked={audience}
            onChange={(event) => setAudience(event.target.checked)}
            label={
              <span className="flex flex-col gap-0.5">
                <span className="text-lk-label font-semibold text-lk-ink">{t.analyticsLabel}</span>
                <span className="text-lk-secondary text-lk-ink-2">{t.analyticsText}</span>
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline-ink" onClick={onRefuse}>
              {t.refuse}
            </Button>
            <Button onClick={() => onSave(audience)}>{t.save}</Button>
          </div>
          <a
            href="/cookies"
            className="inline-flex min-h-11 items-center self-center text-lk-secondary font-semibold text-lk-blue! underline! underline-offset-2"
          >
            {t.policy}
          </a>
        </>
      )}
    </section>
  );
}
