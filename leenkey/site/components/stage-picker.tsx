"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { fr } from "@/lib/i18n/fr";

const t = fr.site.home.stages;
type StageKey = (typeof t.items)[number]["key"];

/**
 * « Où en êtes-vous dans votre vente ? » (V1 leenkey.js): four situations as
 * chips, one pressed at a time; the answer below follows the one chosen,
 * with its own action (the estimator, or the contact form for a property
 * already on sale). Announced politely when it changes.
 */
export function StagePicker() {
  const [selected, setSelected] = useState<StageKey>(t.items[0].key);
  const stage = t.items.find((item) => item.key === selected) ?? t.items[0];
  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label={t.label} className="flex flex-wrap gap-2">
        {t.items.map((item) => (
          <ChipToggle
            key={item.key}
            pressed={item.key === selected}
            // A chip pressed again stays pressed: one situation is always chosen.
            onPressedChange={(pressed) => {
              if (pressed) setSelected(item.key);
            }}
          >
            {item.label}
          </ChipToggle>
        ))}
      </div>
      <div
        aria-live="polite"
        className="rounded-lk-md border border-lk-line bg-lk-surface p-5 lg:p-6"
      >
        {/* A new answer slides in when the situation changes (DESIGN.md 9). */}
        <div key={stage.key} className="lk-swap flex flex-col gap-2">
          <h3 className="text-lk-h3 font-semibold text-lk-ink lg:text-lk-h3-lg">{stage.title}</h3>
          <p className="max-w-lk-prose text-lk-body text-pretty text-lk-ink-2">{stage.text}</p>
          <Button asChild size="lg" className="mt-3 self-start">
            <Link href={stage.href}>{stage.action}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
