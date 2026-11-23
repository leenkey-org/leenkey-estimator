"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { InlineAlert } from "@/components/shared/inline-alert";
import { frVisits } from "@/lib/i18n/sections/visits";
import { bookVisit, type BookResult } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.booking;

export type BookingGroup = {
  day: string;
  /** « samedi 21 novembre » */
  label: string;
  slots: { id: string; /** « 10 h 30 – 11 h » */ range: string }[];
};

/**
 * The free slots of an invitation (SPEC-V2 14, docs/DESIGN.md 13.1): a grid
 * of ChipToggle grouped by day, the date as the title of each group, on a
 * phone as on a desktop; one slot chosen, then « Réserver ce créneau ».
 */
export function BookingForm({ token, groups }: { token: string; groups: BookingGroup[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    if (!chosen) {
      setError(t.choose);
      return;
    }
    start(async () => {
      let result: BookResult | null = null;
      try {
        result = await bookVisit({ token, slotId: chosen });
      } catch (caught) {
        console.error("[visits] visit not booked", caught);
      }
      if (!result?.ok) {
        setError(t.errors[result?.error ?? "unavailable"]);
        // A slot taken meanwhile leaves the grid; an identity document refused
        // or withdrawn meanwhile brings back its deposit (the page reads it again).
        if (
          result?.error === "full" ||
          result?.error === "tooLate" ||
          result?.error === "identity"
        ) {
          setChosen(null);
          router.refresh();
        }
        return;
      }
      router.push(`/visites/${result.data.visitId}?reservee=1`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section
          key={group.day}
          aria-label={t.slotsLabel(group.label)}
          className="flex flex-col gap-2.5"
        >
          <h2 className="text-lk-body font-semibold text-lk-ink first-letter:uppercase">
            {group.label}
          </h2>
          <div className="flex flex-wrap gap-2">
            {group.slots.map((slot) => (
              <ChipToggle
                key={slot.id}
                pressed={chosen === slot.id}
                onPressedChange={(pressed) => {
                  setChosen(pressed ? slot.id : null);
                  setError(null);
                }}
                className="tabular"
              >
                {slot.range}
              </ChipToggle>
            ))}
          </div>
        </section>
      ))}
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      <Button type="button" size="lg" loading={pending} onClick={submit} className="self-start">
        {t.submit}
      </Button>
    </div>
  );
}
