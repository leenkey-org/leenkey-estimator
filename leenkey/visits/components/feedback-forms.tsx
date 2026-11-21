"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { Textarea } from "@/components/shared/textarea";
import { frVisits } from "@/lib/i18n/sections/visits";
import { VISIT_FEEDBACK_MAX, VISIT_INTERESTS, type VisitInterest } from "@/lib/validations/visit";
import { giveBuyerFeedback, giveSellerFeedback, type FeedbackResult } from "../actions";
import { interestOf } from "../feedback";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { visits: frVisits } as const;

const t = fr.visits.feedback;

type FormProps = {
  visitId: string;
  /** « Modifiable jusqu'au samedi 28 novembre. » */
  until: string;
};

/**
 * The feedback of the buyer after their visit (L3-03, SPEC-V2 14): an interest
 * from 1 to 5 and a comment, sent once and changed for 7 days. The seller
 * reads it as given.
 */
export function BuyerFeedbackForm({
  visitId,
  until,
  interest: givenInterest,
  comment: givenComment,
}: FormProps & { interest: VisitInterest | null; comment: string | null }) {
  const router = useRouter();
  const [interest, setInterest] = useState<VisitInterest | null>(givenInterest);
  const [comment, setComment] = useState(givenComment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const errorId = useId();
  // The error about the interest belongs to the picker: said with it.
  const interestError = error === t.errors.interest;

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (interest === null) {
      setError(t.errors.interest);
      return;
    }
    start(async () => {
      let result: FeedbackResult | null = null;
      try {
        result = await giveBuyerFeedback({ visitId, interest, comment });
      } catch (caught) {
        console.error("[visits] feedback not saved", caught);
      }
      if (!result?.ok) {
        setError(t.errors[result?.error ?? "unavailable"]);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <SegmentedPicker
          label={t.buyer.interest}
          value={interest === null ? "" : String(interest)}
          onValueChange={(value) => {
            setInterest(interestOf(Number(value)));
            if (interestError) setError(null);
          }}
          aria-invalid={interestError ? true : undefined}
          aria-describedby={interestError ? errorId : undefined}
          options={VISIT_INTERESTS.map((value) => ({
            value: String(value),
            label: String(value),
            ariaLabel: t.buyer.option(value, t.interestLabels[value]),
          }))}
        />
        <p className="text-lk-caption text-lk-ink-3" aria-live="polite">
          {interest === null ? t.buyer.scale : t.interestLabels[interest]}
        </p>
      </div>
      <Textarea
        label={t.buyer.comment}
        optional
        help={t.buyer.commentHelp}
        value={comment}
        maxLength={VISIT_FEEDBACK_MAX}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? (
        <div id={errorId}>
          <InlineAlert tone="danger">{error}</InlineAlert>
        </div>
      ) : null}
      {saved ? <InlineAlert tone="success">{t.buyer.saved}</InlineAlert> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" loading={pending}>
          {givenInterest === null ? t.buyer.submit : t.buyer.update}
        </Button>
        <p className="text-lk-caption text-lk-ink-3">{until}</p>
      </div>
    </form>
  );
}

/** The note of the seller about a visit of their property: never shown to the buyer. */
export function SellerNoteForm({ visitId, until, note }: FormProps & { note: string | null }) {
  const router = useRouter();
  const [comment, setComment] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    // An empty note erases the one written before; there is nothing to erase otherwise.
    if (!comment.trim() && !note) {
      setError(t.errors.note);
      return;
    }
    start(async () => {
      let result: FeedbackResult | null = null;
      try {
        result = await giveSellerFeedback({ visitId, comment });
      } catch (caught) {
        console.error("[visits] note not saved", caught);
      }
      if (!result?.ok) {
        const reason = result?.error ?? "unavailable";
        setError(reason === "invalid" && !comment.trim() ? t.errors.note : t.errors[reason]);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Textarea
        label={t.seller.comment}
        help={t.seller.commentHelp}
        value={comment}
        maxLength={VISIT_FEEDBACK_MAX}
        onChange={(event) => setComment(event.target.value)}
      />
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      {saved ? <InlineAlert tone="success">{t.seller.saved}</InlineAlert> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" variant="secondary" loading={pending}>
          {t.seller.submit}
        </Button>
        <p className="text-lk-caption text-lk-ink-3">{until}</p>
      </div>
    </form>
  );
}
