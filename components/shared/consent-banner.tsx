"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";

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
 * the bottom left from md. Refusing is as easy as accepting: same buttons,
 * side by side. Non-modal: the page stays usable behind it.
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

  // Reopened from « Gérer mes cookies »: keyboard focus goes to the panel.
  useEffect(() => {
    if (view === "panel" && !inline) titleRef.current?.focus();
  }, [view, inline]);

  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className={cn(
        "flex flex-col gap-3.5 bg-lk-surface p-5 text-lk-ink",
        inline
          ? "rounded-lk-md border border-lk-line"
          : [
              "fixed inset-x-0 bottom-0 z-50 rounded-t-lk-md border-t border-lk-line shadow-sheet",
              "pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
              "md:inset-x-auto md:bottom-6 md:left-6 md:w-105 md:rounded-lk-md md:border md:pb-5 md:shadow-float",
              "duration-220 ease-out-lk motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4",
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
        className="text-lk-title font-semibold outline-none"
      >
        {view === "panel" ? t.panelTitle : t.title}
      </p>

      {view === "banner" ? (
        <>
          <p className="text-lk-secondary text-lk-ink-2">
            {t.text}{" "}
            <a
              href="/cookies"
              className="font-semibold text-lk-blue! underline! underline-offset-2"
            >
              {t.policy}
            </a>
          </p>
          <div className="grid grid-cols-2 gap-2.5">
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
