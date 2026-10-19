"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { Textarea } from "@/components/shared/textarea";
import { UnitInput } from "@/components/shared/unit-input";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import {
  LISTING_DESCRIPTION_MAX,
  LISTING_PRICE_MAX_EUROS,
  LISTING_TITLE_MAX,
  LISTING_TITLE_MIN,
  textLength,
  type ListingDraftField,
} from "@/lib/validations/listing";
import { parseFrenchNumber } from "@/lib/validations/property";
import { priceGap } from "../creation";
import { saveListingDraft, type SaveListingResult } from "../listing-actions";
import { CREATION_FORM_ID, intentOf, submitWithEnter } from "./creation-header";

const t = fr.properties.price;
const common = fr.properties.creation;
const errors = t.errors;

// Step 3 of the creation (SPEC-V2 8.3): the price, the reminder of the
// analysis of value with the gap to it, the title proposed from the property
// and the description (1 200 characters). The first save creates the listing,
// which needs its price: without anything typed yet, « Précédent » and
// « Enregistrer » only leave the step.

export type Valuation = {
  /** « Votre analyse de valeur du 12 octobre 2026 ». */
  title: string;
  /** « 342 000 €, dans une fourchette de 325 000 € à 360 000 €. » */
  text: string;
  valueCents: number;
};

export function PriceStep({
  propertyId,
  initial,
  saved,
  valuation,
}: {
  propertyId: string;
  /** The listing as saved, or the title proposed and nothing else. */
  initial: { priceEuros: number | null; title: string; description: string };
  /** Step 3 was saved once: the listing exists. */
  saved: boolean;
  valuation: Valuation | null;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const valuationId = useId();
  const [price, setPrice] = useState(
    initial.priceEuros === null ? "" : formatInteger(initial.priceEuros),
  );
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingDraftField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // One save at a time: a second click would only race the first.
  const submitting = useRef(false);

  const typedPrice = parseFrenchNumber(price);
  const gap =
    valuation && typedPrice !== null && Number.isInteger(typedPrice) && typedPrice > 0
      ? priceGap(typedPrice * 100, valuation.valueCents)
      : null;

  function clear(field: ListingDraftField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  /** The errors in the page first, then the focus on the first field in error. */
  function showErrors(fields: Partial<Record<ListingDraftField, string>>, message: string | null) {
    flushSync(() => {
      setFieldErrors(fields);
      setError(message);
    });
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  function leave(target: string) {
    submitting.current = true;
    // In the transition: the buttons stay busy until the next page shows.
    startSaving(() => router.push(target));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const intent = intentOf(event);
    const target =
      intent === "save"
        ? "/vendeur"
        : intent === "previous"
          ? `/vendeur/biens/${propertyId}/caracteristiques`
          : `/vendeur/biens/${propertyId}/apercu`;

    const priceEuros = parseFrenchNumber(price);
    const invalid: Partial<Record<ListingDraftField, string>> = {};
    if (priceEuros !== null) {
      if (Number.isNaN(priceEuros) || !Number.isInteger(priceEuros) || priceEuros <= 0) {
        invalid.priceEuros = errors.price;
      } else if (priceEuros > LISTING_PRICE_MAX_EUROS) {
        invalid.priceEuros = errors.priceTooHigh;
      }
    }
    const titleLength = textLength(title.trim());
    if (titleLength < LISTING_TITLE_MIN || titleLength > LISTING_TITLE_MAX) {
      invalid.title = errors.titleLength;
    }
    if (textLength(description.trim()) > LISTING_DESCRIPTION_MAX) {
      invalid.description = errors.descriptionLength;
    }
    if (Object.keys(invalid).length > 0) {
      showErrors(invalid, null);
      return;
    }

    // Nothing to keep yet: no listing, and only the proposed title.
    const untouched =
      !saved && priceEuros === null && description.trim() === "" && title === initial.title;
    if (intent !== "next" && untouched) {
      leave(target);
      return;
    }
    const missing: Partial<Record<ListingDraftField, string>> = {};
    if (priceEuros === null) missing.priceEuros = errors.required;
    if (intent === "next" && description.trim() === "") missing.description = errors.required;
    if (priceEuros === null || Object.keys(missing).length > 0) {
      showErrors(missing, intent === "next" ? t.required : t.priceToSave);
      return;
    }

    setError(null);
    submitting.current = true;
    startSaving(async () => {
      let result: SaveListingResult | null = null;
      try {
        result = await saveListingDraft(
          { propertyId, priceEuros, title, description },
          intent === "next" ? "next" : "save",
        );
      } catch (caught) {
        console.error("[properties] listing save failed", caught);
      }
      if (!result?.ok) {
        submitting.current = false;
        const fields = Object.fromEntries(
          Object.entries(result?.fieldErrors ?? {}).map(([field, key]) => [
            field,
            errors[key ?? "price"] ?? common.error,
          ]),
        );
        showErrors(
          fields,
          !result
            ? common.error
            : result.error === "auth"
              ? common.signedOut
              : result.error === "not_found"
                ? common.notFound
                : result.error === "incomplete"
                  ? intent === "next"
                    ? t.required
                    : t.priceToSave
                  : result.error === "invalid"
                    ? null
                    : common.error,
        );
        return;
      }
      startSaving(() => router.push(target));
    });
  }

  const count = textLength(description.trim());
  return (
    <form
      ref={form}
      id={CREATION_FORM_ID}
      onSubmit={submit}
      onKeyDown={(event) => submitWithEnter(event, event.currentTarget, next.current)}
      noValidate
      className="flex flex-1 flex-col gap-5"
    >
      <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h2>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <UnitInput
        label={t.price}
        help={t.priceHelp}
        unit="€"
        inputMode="numeric"
        autoComplete="off"
        value={price}
        error={fieldErrors.priceEuros}
        aria-describedby={valuation ? valuationId : undefined}
        onChange={(event) => {
          setPrice(event.target.value);
          clear("priceEuros");
        }}
      />
      {valuation ? (
        <InfoNote id={valuationId} title={valuation.title}>
          <p>{valuation.text}</p>
          {gap !== null ? <p>{t.gap(gap)}</p> : null}
        </InfoNote>
      ) : null}

      <Input
        label={t.listingTitle}
        // Ours until the first save; then the seller's own title.
        help={saved ? undefined : t.titleHelp}
        value={title}
        error={fieldErrors.title}
        onChange={(event) => {
          setTitle(event.target.value);
          clear("title");
        }}
      />

      <Textarea
        label={t.description}
        help={t.count(formatInteger(count), formatInteger(LISTING_DESCRIPTION_MAX))}
        placeholder={t.descriptionPlaceholder}
        rows={8}
        value={description}
        error={
          fieldErrors.description ??
          (count > LISTING_DESCRIPTION_MAX ? errors.descriptionLength : undefined)
        }
        onChange={(event) => {
          setDescription(event.target.value);
          clear("description");
        }}
      />

      <FormActionBar className="md:mt-3">
        <Button type="submit" name="intent" value="previous" variant="secondary" disabled={saving}>
          {common.previous}
        </Button>
        <Button ref={next} type="submit" name="intent" value="next" loading={saving}>
          {common.next}
        </Button>
      </FormActionBar>
    </form>
  );
}
