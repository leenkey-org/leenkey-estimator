"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Input } from "@/components/shared/input";
import { Textarea } from "@/components/shared/textarea";
import { UnitInput } from "@/components/shared/unit-input";
import { formatInteger } from "@/lib/format";
import { frAdminListings } from "@/lib/i18n/sections/adminListings";
import {
  listingEditChanges,
  listingEditInvalidFields,
  type ListingEditField,
} from "@/lib/validations/admin";
import {
  LISTING_DESCRIPTION_MAX,
  LISTING_PRICE_MAX_EUROS,
  textLength,
} from "@/lib/validations/listing";
import { parseFrenchNumber } from "@/lib/validations/property";
import { editListingAction, type ListingEditResult } from "../actions";
import { useModerationFeedback } from "./listing-moderation";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { adminListings: frAdminListings } as const;

const t = fr.adminListings;
const e = t.edit;

// « Modifier » a listing from the back office (L1-30e, DECISIONS.md
// 2026-11-24): its title, price and description, with the reason sent to
// the seller, in the dialog of DESIGN 10.8 (a full screen on a phone). The
// SQL function decides (status, values) and writes the history; the outcome
// shows in ModerationFeedback.

export type ListingEditValues = { title: string; description: string; priceCents: number };

type Form = { title: string; price: string; description: string; reason: string };

const FIELD_ERRORS: Record<ListingEditField, string> = {
  title: e.errors.title,
  priceEuros: e.errors.price,
  description: e.errors.description,
  reason: e.errors.reason,
};

const ERRORS: Record<Exclude<ListingEditResult, { ok: true }>["error"], string> = {
  invalid: t.errors.invalid,
  forbidden: t.errors.forbidden,
  not_found: t.errors.notFound,
  conflict: e.errors.conflict,
  unavailable: t.errors.unavailable,
  unchanged: e.errors.unchanged,
};

/**
 * The values of the form as the server action takes them: only the fields
 * the team changed, so that a change of the seller made since the page was
 * shown is never overwritten. A price emptied or not read counts as changed
 * (NaN), and the schema refuses it.
 */
function command(listingId: string, values: ListingEditValues, form: Form) {
  return {
    listingId,
    ...listingEditChanges(
      {
        title: values.title,
        description: values.description,
        priceEuros: Math.round(values.priceCents / 100),
      },
      {
        title: form.title,
        description: form.description,
        priceEuros: parseFrenchNumber(form.price) ?? Number.NaN,
      },
    ),
    reason: form.reason,
  };
}

export function ListingEdit({
  listingId,
  reference,
  values,
}: {
  listingId: string;
  reference: string;
  /** The listing as it is now, to start from. */
  values: ListingEditValues;
}) {
  const report = useModerationFeedback();
  const [working, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>({ title: "", price: "", description: "", reason: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingEditField, string>>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const decided = useRef(false);
  const fields = useRef<Partial<Record<ListingEditField, HTMLElement | null>>>({});

  const start = (from: HTMLButtonElement) => {
    opener.current = from;
    decided.current = false;
    setForm({
      title: values.title,
      price: formatInteger(Math.round(values.priceCents / 100)),
      description: values.description,
      reason: "",
    });
    setFieldErrors({});
    setDialogError(null);
    setOpen(true);
  };

  const change = (field: keyof Form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    const key: ListingEditField = field === "price" ? "priceEuros" : field;
    if (fieldErrors[key]) setFieldErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  /** The first field refused gets the focus, its error read with its name. */
  const refuse = (invalid: ListingEditField[], input: ReturnType<typeof command>) => {
    const errors: Partial<Record<ListingEditField, string>> = {};
    for (const field of invalid) {
      errors[field] =
        field === "priceEuros" &&
        typeof input.priceEuros === "number" &&
        input.priceEuros > LISTING_PRICE_MAX_EUROS
          ? e.errors.priceTooHigh
          : FIELD_ERRORS[field];
    }
    flushSync(() => setFieldErrors(errors));
    const first = invalid[0];
    if (first) fields.current[first]?.focus();
  };

  const submit = () => {
    const input = command(listingId, values, form);
    const invalid = listingEditInvalidFields(input);
    if (invalid.length > 0) {
      refuse(invalid, input);
      return;
    }
    // Nothing changed: said here, nothing sent.
    if (
      input.title === undefined &&
      input.description === undefined &&
      input.priceEuros === undefined
    ) {
      setDialogError(e.errors.unchanged);
      return;
    }
    setDialogError(null);
    startTransition(async () => {
      let result: ListingEditResult | null = null;
      try {
        result = await editListingAction(input);
      } catch (error) {
        console.error("[admin] listing edit request failed", error);
      }
      if (!result) {
        setDialogError(t.errors.network);
        return;
      }
      if (!result.ok) {
        if (result.error === "invalid" && result.fields?.length) {
          refuse(result.fields, input);
          return;
        }
        setDialogError(ERRORS[result.error]);
        return;
      }
      decided.current = true;
      setOpen(false);
      report({ tone: "success", text: e.result });
    });
  };

  const count = textLength(form.description.trim());

  return (
    <section
      aria-labelledby="modifier"
      className="flex flex-col gap-3 border-t border-lk-line pt-4"
    >
      <h2 id="modifier" className="text-lk-label font-semibold text-lk-ink">
        {e.title}
      </h2>
      <p className="text-lk-secondary text-lk-ink-2">{e.intro}</p>
      <div>
        <Button
          variant="secondary"
          size="md"
          aria-label={e.label(reference)}
          disabled={working}
          onClick={(event) => start(event.currentTarget)}
        >
          {e.open}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        title={e.dialog.title}
        description={e.dialog.text}
        confirmLabel={e.dialog.confirm}
        labels={t.reasonDialog}
        working={working}
        error={dialogError}
        onConfirm={submit}
        onClose={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (!decided.current && opener.current?.isConnected) opener.current.focus();
        }}
      >
        <Input
          ref={(node) => {
            fields.current.title = node;
          }}
          label={e.dialog.listingTitle}
          value={form.title}
          maxLength={120}
          autoComplete="off"
          error={fieldErrors.title}
          onChange={(event) => change("title", event.target.value)}
        />
        <UnitInput
          ref={(node) => {
            fields.current.priceEuros = node;
          }}
          label={e.dialog.price}
          unit="€"
          inputMode="numeric"
          autoComplete="off"
          value={form.price}
          error={fieldErrors.priceEuros}
          onChange={(event) => change("price", event.target.value)}
        />
        <Textarea
          ref={(node) => {
            fields.current.description = node;
          }}
          label={e.dialog.description}
          help={e.dialog.count(formatInteger(count), formatInteger(LISTING_DESCRIPTION_MAX))}
          rows={8}
          value={form.description}
          error={fieldErrors.description}
          onChange={(event) => change("description", event.target.value)}
        />
        <Textarea
          ref={(node) => {
            fields.current.reason = node;
          }}
          label={e.dialog.reason}
          help={e.dialog.reasonHint}
          rows={3}
          maxLength={1000}
          required
          value={form.reason}
          error={fieldErrors.reason}
          onChange={(event) => change("reason", event.target.value)}
        />
      </ConfirmDialog>
    </section>
  );
}
