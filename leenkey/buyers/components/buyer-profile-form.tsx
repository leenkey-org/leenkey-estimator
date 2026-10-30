"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { FinancingBadge, type FinancingStatus } from "@/components/shared/financing-badge";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { Textarea } from "@/components/shared/textarea";
import { UnitInput } from "@/components/shared/unit-input";
import { formatInteger } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import {
  BUYER_PROJECTS,
  BUYER_SITUATION_MAX,
  parseCities,
  type BuyerProfileField,
  type BuyerProject,
} from "@/lib/validations/buyer";
import { parseFrenchNumber } from "@/lib/validations/property";
import { saveBuyerProfile } from "../actions";
import type { BuyerProfile } from "../queries";

const t = fr.buyerSpace.profile;

/** « 350 000 » from 350000; empty without an amount. */
const amountText = (euros: number | null) => (euros === null ? "" : formatInteger(euros));

/** An amount typed: null when empty, NaN when not whole euros. */
function amountOf(text: string): number | null {
  const value = parseFrenchNumber(text);
  if (value === null) return null;
  return Number.isInteger(value) && value >= 0 ? value : Number.NaN;
}

/**
 * The buying project of a buyer (SPEC-V2 8.9, DESIGN.md 13 « Projet et
 * financement »): the status of their file on top, what the seller sees of
 * it (permanent note), then the project, the cities, the budget, the down
 * payment, the loan and its amount, the situation. Saved in place: the
 * status follows (declared once project, budget, down payment and loan
 * need are given).
 */
export function BuyerProfileForm({ initial }: { initial: BuyerProfile }) {
  const form = useRef<HTMLFormElement>(null);
  const [project, setProject] = useState<BuyerProject | "">(initial.project ?? "");
  const [cities, setCities] = useState(initial.targetCities.join(", "));
  const [budget, setBudget] = useState(amountText(initial.budgetMaxEuros));
  const [downPayment, setDownPayment] = useState(amountText(initial.downPaymentEuros));
  const [loan, setLoan] = useState<"yes" | "no" | "">(
    initial.loanNeeded === null ? "" : initial.loanNeeded ? "yes" : "no",
  );
  const [loanAmount, setLoanAmount] = useState(amountText(initial.loanAmountEuros));
  const [situation, setSituation] = useState(initial.situationNote);
  const [status, setStatus] = useState<FinancingStatus>(initial.financingStatus);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<BuyerProfileField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, startSaving] = useTransition();

  function clear(field: BuyerProfileField) {
    setSaved(false);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  /** The errors in the page first, then the focus on the first field in error. */
  function showErrors(fields: Partial<Record<BuyerProfileField, string>>, message: string | null) {
    flushSync(() => {
      setFieldErrors(fields);
      setError(message);
    });
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const input = {
      project: project || null,
      targetCities: parseCities(cities),
      budgetMaxEuros: amountOf(budget),
      downPaymentEuros: amountOf(downPayment),
      loanNeeded: loan === "" ? null : loan === "yes",
      loanAmountEuros: loan === "yes" ? amountOf(loanAmount) : null,
      situationNote: situation,
    };
    const invalid: Partial<Record<BuyerProfileField, string>> = {};
    for (const field of ["budgetMaxEuros", "downPaymentEuros", "loanAmountEuros"] as const) {
      if (Number.isNaN(input[field])) invalid[field] = t.errors.amount;
    }
    if (input.targetCities.length > 20 || input.targetCities.some((city) => city.length > 80)) {
      invalid.targetCities = t.errors.cities;
    }
    if (situation.trim().length > BUYER_SITUATION_MAX) invalid.situationNote = t.errors.situation;
    if (Object.keys(invalid).length > 0) {
      showErrors(invalid, null);
      return;
    }
    startSaving(async () => {
      const result = await saveBuyerProfile(input).catch(() => null);
      if (!result?.ok) {
        const fields = Object.fromEntries(
          (result?.ok === false ? (result.fields ?? []) : []).map((field) => [
            field,
            field === "targetCities"
              ? t.errors.cities
              : field === "situationNote"
                ? t.errors.situation
                : t.errors.amount,
          ]),
        );
        showErrors(
          fields,
          result?.ok === false && result.error === "auth"
            ? t.errors.signedOut
            : result?.ok === false && result.error === "invalid"
              ? null
              : t.errors.generic,
        );
        return;
      }
      setStatus(result.data.financingStatus);
      setError(null);
      setSaved(true);
    });
  }

  return (
    <form ref={form} onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
      <section aria-labelledby="dossier" className="flex flex-col gap-2.5">
        <h2 id="dossier" className="text-lk-label font-semibold text-lk-ink-2">
          {t.status}
        </h2>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Read again when it changes, once saved. */}
          <span role="status">
            <FinancingBadge status={status} />
          </span>
        </div>
        <p className="text-lk-caption text-lk-ink-3">{t.declaredRule}</p>
        <InfoNote>
          <p>{t.note}</p>
        </InfoNote>
      </section>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <SegmentedPicker
        label={t.project}
        options={BUYER_PROJECTS.map((value) => ({ value, label: t.projects[value] }))}
        value={project}
        onValueChange={(value) => {
          setProject(value as BuyerProject);
          clear("project");
        }}
      />

      <Input
        label={t.cities}
        help={t.citiesHelp}
        autoComplete="off"
        value={cities}
        error={fieldErrors.targetCities}
        onChange={(event) => {
          setCities(event.target.value);
          clear("targetCities");
        }}
      />

      <UnitInput
        label={t.budget}
        unit="€"
        inputMode="numeric"
        autoComplete="off"
        value={budget}
        error={fieldErrors.budgetMaxEuros}
        onChange={(event) => {
          setBudget(event.target.value);
          clear("budgetMaxEuros");
        }}
      />

      <UnitInput
        label={t.downPayment}
        unit="€"
        inputMode="numeric"
        autoComplete="off"
        value={downPayment}
        error={fieldErrors.downPaymentEuros}
        onChange={(event) => {
          setDownPayment(event.target.value);
          clear("downPaymentEuros");
        }}
      />

      <SegmentedPicker
        label={t.loan}
        options={[
          { value: "yes", label: t.loanOptions.yes },
          { value: "no", label: t.loanOptions.no },
        ]}
        value={loan}
        onValueChange={(value) => {
          setLoan(value as "yes" | "no");
          clear("loanNeeded");
        }}
      />

      {loan === "yes" ? (
        <UnitInput
          label={t.loanAmount}
          unit="€"
          inputMode="numeric"
          autoComplete="off"
          value={loanAmount}
          error={fieldErrors.loanAmountEuros}
          onChange={(event) => {
            setLoanAmount(event.target.value);
            clear("loanAmountEuros");
          }}
        />
      ) : null}

      <Textarea
        label={t.situation}
        help={t.situationHelp(
          formatInteger(situation.trim().length),
          formatInteger(BUYER_SITUATION_MAX),
        )}
        rows={3}
        value={situation}
        error={fieldErrors.situationNote}
        onChange={(event) => {
          setSituation(event.target.value);
          clear("situationNote");
        }}
      />

      <FormActionBar className="md:mt-3">
        <Button type="submit" loading={saving}>
          {t.save}
        </Button>
      </FormActionBar>
      {/* Said once saved, for every reader. */}
      <p role="status" className="text-lk-compact font-semibold text-lk-success-fg empty:sr-only">
        {saved ? t.saved : ""}
      </p>
    </form>
  );
}
