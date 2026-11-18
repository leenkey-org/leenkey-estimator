"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";
import { frVisits } from "@/lib/i18n/sections/visits";
import { VISIT_DURATIONS } from "@/lib/validations/visit";
import { addVisitSlot, type AddSlotResult } from "../actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.seller.slots;

/**
 * « Ajouter un créneau » (SPEC-V2 14): one slot at a time, a day, a start
 * time and a duration of 30, 45 or 60 minutes, in Paris time. No series.
 */
export function SlotForm({ propertyId, minDay }: { propertyId: string; minDay: string }) {
  const router = useRouter();
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [minutes, setMinutes] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setAdded(false);
    if (!day || !time) {
      setError(t.errors.invalid);
      return;
    }
    start(async () => {
      let result: AddSlotResult | null = null;
      try {
        result = await addVisitSlot({ propertyId, day, time, minutes });
      } catch (caught) {
        console.error("[visits] slot not added", caught);
      }
      if (!result?.ok) {
        setError(t.errors[result?.error ?? "unavailable"]);
        return;
      }
      setTime("");
      setAdded(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <h3 className="text-lk-body font-semibold text-lk-ink">{t.form.title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          type="date"
          label={t.form.day}
          value={day}
          min={minDay}
          onChange={(event) => setDay(event.target.value)}
        />
        <Input
          type="time"
          label={t.form.time}
          value={time}
          step={900}
          onChange={(event) => setTime(event.target.value)}
        />
        <Select
          label={t.form.duration}
          value={String(minutes)}
          onChange={(event) => setMinutes(Number(event.target.value))}
        >
          {VISIT_DURATIONS.map((value) => (
            <option key={value} value={value}>
              {t.form.minutes(value)}
            </option>
          ))}
        </Select>
      </div>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {added ? <InlineAlert tone="success">{t.form.added}</InlineAlert> : null}
      <Button type="submit" variant="secondary" loading={pending} className="self-start">
        {t.form.submit}
      </Button>
    </form>
  );
}
