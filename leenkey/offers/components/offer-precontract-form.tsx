"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/shared/button";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { frOffer } from "@/lib/i18n/sections/offer";
import { recordPrecontract, type RecordPrecontractResult } from "../seller-actions";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer.seller.precontract;

/**
 * The avant-contrat of an accepted offer, recorded by its seller (SPEC-V2
 * 13): the day it was signed, from the acceptance to today, and, when known,
 * the day it was notified or handed to the buyer. Shown open while nothing
 * is recorded, behind « Modifier » afterwards.
 */
export function OfferPrecontractForm({
  offerId,
  signedAt,
  notifiedAt,
  minDay,
  maxDay,
}: {
  offerId: string;
  /** « YYYY-MM-DD », as recorded; null before the first recording. */
  signedAt: string | null;
  notifiedAt: string | null;
  /** The day of the acceptance and today, in Paris. */
  minDay: string;
  maxDay: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(signedAt === null);
  const [signed, setSigned] = useState(signedAt ?? "");
  const [notified, setNotified] = useState(notifiedAt ?? "");
  const [errors, setErrors] = useState<{ signedAt?: string; notifiedAt?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [working, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    setError(null);
    const found: typeof errors = {};
    if (signed === "" || signed < minDay || signed > maxDay) found.signedAt = t.errors.signedAt;
    else if (notified !== "" && (notified < signed || notified > maxDay)) {
      found.notifiedAt = t.errors.notifiedAt;
    }
    setErrors(found);
    if (found.signedAt || found.notifiedAt) {
      window.document
        .getElementById(found.signedAt ? "precontract-signed" : "precontract-notified")
        ?.focus();
      return;
    }
    startTransition(async () => {
      let result: RecordPrecontractResult | null = null;
      try {
        result = await recordPrecontract({ offerId, signedAt: signed, notifiedAt: notified });
      } catch (caught) {
        console.error("[offers] avant-contrat failed", caught);
      }
      if (!result?.ok) {
        if (result?.error === "invalid" && result.field) {
          setErrors({ [result.field]: t.errors[result.field] });
          window.document
            .getElementById(
              result.field === "signedAt" ? "precontract-signed" : "precontract-notified",
            )
            ?.focus();
          return;
        }
        setError(
          result?.error === "auth"
            ? t.errors.signedOut
            : result?.error === "closed"
              ? t.errors.closed
              : t.errors.generic,
        );
        return;
      }
      setSaved(true);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-start gap-3">
        {saved ? <InlineAlert tone="success">{t.saved}</InlineAlert> : null}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            // From what the page now shows: it may have been corrected elsewhere.
            setSigned(signedAt ?? "");
            setNotified(notifiedAt ?? "");
            setSaved(false);
            setEditing(true);
          }}
        >
          {t.edit}
        </Button>
      </div>
    );
  }
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <Input
        id="precontract-signed"
        type="date"
        label={t.signedAt}
        value={signed}
        min={minDay}
        max={maxDay}
        error={errors.signedAt}
        onChange={(event) => {
          setSigned(event.target.value);
          setErrors({});
        }}
      />
      <Input
        id="precontract-notified"
        type="date"
        label={t.notifiedAt}
        optional
        help={t.notifiedAtHelp}
        value={notified}
        min={signed || minDay}
        max={maxDay}
        error={errors.notifiedAt}
        onChange={(event) => {
          setNotified(event.target.value);
          setErrors({});
        }}
      />
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" loading={working}>
          {t.save}
        </Button>
        {signedAt !== null ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSigned(signedAt);
              setNotified(notifiedAt ?? "");
              setErrors({});
              setError(null);
              setEditing(false);
            }}
          >
            {t.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
