"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/shared/button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.site.home.stages;
type StageKey = (typeof t.items)[number]["key"];

/**
 * « Où en êtes-vous dans votre vente ? », as in the V1 (DECISIONS
 * 2026-10-23): four situations in numbered cards, 01 to 04, one pressed at a
 * time (2 px blue border on the blue tint), two columns then four from
 * 1024 px. The answer below follows the one chosen, in a white card with its
 * own action on its right from 768 px (the estimator, or the contact form
 * for a property already on sale); announced politely when it changes. The
 * numbers are the V1 ones, not read by screen readers: the group says the
 * order.
 */
export function StagePicker() {
  const [selected, setSelected] = useState<StageKey>(t.items[0].key);
  const stage = t.items.find((item) => item.key === selected) ?? t.items[0];
  return (
    <div className="flex flex-col gap-5 lg:gap-7">
      <div
        role="group"
        aria-label={t.label}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3.5"
      >
        {t.items.map((item, index) => {
          const pressed = item.key === selected;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => setSelected(item.key)}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col items-start gap-2 rounded-lk-lg border-2 px-4 py-4 text-left lg:px-4.5 lg:py-5",
                "transition-[border-color,background-color,box-shadow,translate] duration-220 ease-out-lk",
                "focus-visible:outline-solid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-lk-blue",
                pressed
                  ? "border-lk-blue bg-lk-blue-tint shadow-lk-card"
                  : "border-lk-mist-line bg-lk-surface hover:-translate-y-0.5 hover:border-lk-blue-line",
              )}
            >
              <span
                aria-hidden="true"
                className="text-lk-caption font-extrabold tracking-[0.1em] text-lk-blue tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-lk-title font-bold text-lk-ink">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div
        aria-live="polite"
        className="rounded-lk-lg border border-lk-mist-line bg-lk-surface p-5 shadow-lk-card md:px-7 md:py-6.5"
      >
        {/* A new answer slides in when the situation changes (DESIGN.md 9). */}
        <div
          key={stage.key}
          className="lk-swap flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-7"
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <h3 className="text-lk-h2 font-bold text-lk-ink">{stage.title}</h3>
            <p className="max-w-lk-prose text-lk-body text-pretty text-lk-ink-2">{stage.text}</p>
          </div>
          <Button
            asChild
            variant="cta"
            size="lg"
            trailingIcon={ArrowRight}
            className="shrink-0 self-start md:self-center"
          >
            <Link href={stage.href}>{stage.action}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
