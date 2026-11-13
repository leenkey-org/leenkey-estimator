"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { RoleCards } from "@/components/shared/role-cards";
import { Select } from "@/components/shared/select";
import { Textarea } from "@/components/shared/textarea";
import { UnitInput } from "@/components/shared/unit-input";
import { ROUTES } from "@/leenkey/navigation/spaces";
import { formatInteger, formatPrice } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import {
  ACQUISITION_MODES,
  FINANCING_PROGRESS,
  OFFER_AMOUNT_MAX_EUROS,
  OFFER_CO_BUYERS_MAX,
  OFFER_DETAILS_MAX,
  OFFER_VALIDITY_MAX_DAYS,
  OFFER_VALIDITY_MIN_DAYS,
  SCI_STATUSES,
  issueKinds,
  issuePaths,
  offerBuyerSchema,
  offerConditionsSchema,
  offerDeclarationsSchema,
  offerFinancingSchema,
  offerPriceSchema,
  offerValiditySchema,
  parseWholeEuros,
  parseWholeNumber,
  validityAfterDays,
  type AcquisitionMode,
  type FinancingMode,
  type IssueKind,
  type OfferBuyerInput,
  type OfferConditionsInput,
  type OfferIdentityField,
  type OfferIdentityInput,
  type OfferSciInput,
  type OfferStep,
} from "@/lib/validations/offer";
import { parseFrenchNumber } from "@/lib/validations/property";
import { saveOfferStep, submitOffer, type SaveOfferStepResult } from "../actions";
import { formatNumericDateTime } from "../document";
import { formatRate, gapLabel, offerBudget, offerGap } from "../figures";
import { offerFormPath, offerPath } from "../paths";
import { priceInWordsFr } from "../words";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer } as const;

const t = fr.offer;

// The seven steps of the offer form (L2-03, SPEC-V2 13, docs/DESIGN.md 13.3).
// Each « Continuer » checks the step with its schema, saves it in the draft
// (saveOfferStep) and goes to the next one; the page reads the draft again.
// The buttons are outside the form (attribute `form`): the proof of financing
// of step 4 has its own form between the fields and the actions.

/** The form of the current step: « Continuer » submits it. */
const OFFER_FORM_ID = "offre-etape";

type Errors = Record<string, string>;

const titleClass = "text-lk-h2 font-bold text-wide text-lk-ink";
const tileClass = "flex flex-col gap-2 rounded-lk-md bg-lk-stone-2 p-4 text-lk-secondary";

function useStepForm(listingId: string, step: OfferStep, next: string) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // One save at a time: a second click would only race the first.
  const busy = useRef(false);

  /** The errors in the page first, then the focus on the first field in error. */
  function fail(fields: Errors, message: string | null) {
    flushSync(() => {
      setErrors(fields);
      setError(message);
    });
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  function clear(path: string) {
    setErrors((current) => {
      if (!current[path]) return current;
      const rest = { ...current };
      delete rest[path];
      return rest;
    });
  }

  function save(schema: z.ZodTypeAny, input: unknown, message: (path: string) => string) {
    if (busy.current) return;
    const fieldErrors = (paths: string[], kinds: Record<string, IssueKind> = {}) =>
      Object.fromEntries(
        paths.map((path) => [
          path,
          // Said as it is: a letter the document cannot draw, a text too long.
          kinds[path] === "characters"
            ? t.errors.characters
            : kinds[path] === "too_long"
              ? t.errors.tooLong
              : message(path),
        ]),
      );
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      fail(fieldErrors(issuePaths(parsed.error), issueKinds(parsed.error)), t.errors.invalid);
      return;
    }
    busy.current = true;
    setError(null);
    setErrors({});
    startSaving(async () => {
      let result: SaveOfferStepResult | null = null;
      try {
        result = await saveOfferStep(listingId, step, input);
      } catch (caught) {
        console.error("[offers] step save failed", caught);
      }
      if (!result?.ok) {
        busy.current = false;
        const fields = fieldErrors(result?.fields ?? []);
        fail(
          fields,
          !result
            ? t.errors.generic
            : result.error === "auth"
              ? t.errors.signedOut
              : result.error === "closed"
                ? t.errors.closed
                : result.error === "invalid" && Object.keys(fields).length > 0
                  ? t.errors.invalid
                  : t.errors.generic,
        );
        return;
      }
      // In the transition: the button stays busy until the next step shows.
      startSaving(() => router.push(next));
    });
  }

  return { form, errors, error, saving, save, fail, clear };
}

function StepActions({
  previous,
  saving,
  label = t.next,
  disabled = false,
}: {
  previous: string;
  saving: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <FormActionBar className="md:mt-3">
      <Button asChild variant="secondary">
        <Link href={previous}>{t.previous}</Link>
      </Button>
      <Button type="submit" form={OFFER_FORM_ID} loading={saving} disabled={disabled}>
        {label}
      </Button>
    </FormActionBar>
  );
}

function StepForm({
  step,
  onSubmit,
  error,
  children,
}: {
  step: ReturnType<typeof useStepForm>;
  onSubmit: () => void;
  error?: string | null;
  children: ReactNode;
}) {
  const message = error ?? step.error;
  return (
    <form
      ref={step.form}
      id={OFFER_FORM_ID}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {message ? <InlineAlert tone="danger">{message}</InlineAlert> : null}
    </form>
  );
}

/**
 * The radio checked in a group of cards. The cards are native radios the
 * browser may restore on a reload (their state would then say nothing): read
 * once the page is there, and again when the step is sent.
 */
function checkedRadio(form: HTMLFormElement | null, name: string): string | null {
  return form?.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? null;
}

// ---------------------------------------------------------------------------
// Step 1: the buyer, the co-buyers, how they buy
// ---------------------------------------------------------------------------

const EMPTY_IDENTITY: OfferIdentityInput = {
  lastName: "",
  firstName: "",
  birthDate: "",
  addressLine: "",
  postalCode: "",
  city: "",
  email: "",
  phone: "",
};

const AUTO_COMPLETE: Record<OfferIdentityField, string> = {
  lastName: "family-name",
  firstName: "given-name",
  birthDate: "bday",
  addressLine: "address-line1",
  postalCode: "postal-code",
  city: "address-level2",
  email: "email",
  phone: "tel",
};

function buyerMessage(path: string): string {
  const labels = t.buyer.errors;
  if (path === "coBuyers") return labels.coBuyers;
  const field = path.split(".").pop();
  return field === "birthDate"
    ? labels.birthDate
    : field === "email"
      ? labels.email
      : field === "phone"
        ? labels.phone
        : field === "siren"
          ? labels.siren
          : t.errors.required;
}

function IdentityFields({
  prefix,
  value,
  errors,
  own,
  onChange,
  onClear,
}: {
  /** Path of the identity in the errors: « identity », « coBuyers.0 ». */
  prefix: string;
  value: OfferIdentityInput;
  errors: Errors;
  /** The buyer themselves: the browser may fill the fields. */
  own: boolean;
  onChange: (next: OfferIdentityInput) => void;
  onClear: (path: string) => void;
}) {
  const labels = t.buyer;
  const field = (name: OfferIdentityField) => ({
    value: value[name],
    error: errors[`${prefix}.${name}`] || undefined,
    autoComplete: own ? AUTO_COMPLETE[name] : "off",
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, [name]: event.target.value });
      onClear(`${prefix}.${name}`);
    },
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={labels.lastName} {...field("lastName")} />
        <Input label={labels.firstName} {...field("firstName")} />
      </div>
      <Input type="date" label={labels.birthDate} {...field("birthDate")} />
      <Input label={labels.addressLine} help={labels.addressLineHelp} {...field("addressLine")} />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4">
        <Input label={labels.postalCode} inputMode="numeric" {...field("postalCode")} />
        <Input label={labels.city} {...field("city")} />
      </div>
      <Input type="email" inputMode="email" label={labels.email} {...field("email")} />
      <Input type="tel" inputMode="tel" label={labels.phone} {...field("phone")} />
    </div>
  );
}

export function BuyerStep({
  listingId,
  initial,
  backHref,
  note,
}: {
  listingId: string;
  initial: OfferBuyerInput;
  /** The listing: the first step has no previous one. */
  backHref: string;
  /** An offer in progress will be replaced by this one. */
  note?: string;
}) {
  const step = useStepForm(listingId, "buyer", offerFormPath(listingId, 2));
  const [identity, setIdentity] = useState(initial.identity);
  const [coBuyers, setCoBuyers] = useState(initial.coBuyers);
  const [mode, setMode] = useState<AcquisitionMode>(initial.acquisitionMode);
  const [modeOther, setModeOther] = useState(initial.acquisitionModeOther);
  const [sci, setSci] = useState<OfferSciInput>(initial.sci);
  const addCoBuyer = useRef<HTMLButtonElement>(null);
  const labels = t.buyer;

  function submit() {
    const input: OfferBuyerInput = {
      identity,
      coBuyers,
      acquisitionMode: mode,
      acquisitionModeOther: modeOther,
      sci,
    };
    step.save(offerBuyerSchema, input, buyerMessage);
  }

  function setSciField(name: keyof OfferSciInput, value: string) {
    setSci((current) => ({ ...current, [name]: value }));
    step.clear(`sci.${name}`);
  }

  return (
    <>
      <StepForm
        step={step}
        onSubmit={submit}
        // Without a field to show it on: said with the general error.
        error={step.errors.coBuyers || undefined}
      >
        <h2 className={titleClass}>{labels.title}</h2>
        <p className="text-lk-secondary text-lk-ink-2">{labels.intro}</p>
        {note ? (
          <InfoNote>
            <p>{note}</p>
          </InfoNote>
        ) : null}
        <IdentityFields
          prefix="identity"
          value={identity}
          errors={step.errors}
          own
          onChange={setIdentity}
          onClear={step.clear}
        />

        {coBuyers.map((coBuyer, index) => (
          <fieldset
            key={index}
            aria-labelledby={`co-acquereur-${index + 1}`}
            className="flex flex-col gap-4 border-t border-lk-line pt-5"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Names the group: a legend must be the first child of its fieldset. */}
              <h3
                id={`co-acquereur-${index + 1}`}
                className="text-lk-h3 font-bold text-wide text-lk-ink"
              >
                {labels.coBuyer(index + 1)}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCoBuyers((current) => current.filter((_, other) => other !== index));
                  step.fail({}, null);
                  // Its button is gone: the focus goes to « Ajouter un co-acquéreur ».
                  requestAnimationFrame(() => addCoBuyer.current?.focus());
                }}
              >
                <Trash2 aria-hidden="true" />
                {labels.removeCoBuyer}
              </Button>
            </div>
            <IdentityFields
              prefix={`coBuyers.${index}`}
              value={coBuyer}
              errors={step.errors}
              own={false}
              onChange={(next) =>
                setCoBuyers((current) =>
                  current.map((other, position) => (position === index ? next : other)),
                )
              }
              onClear={step.clear}
            />
          </fieldset>
        ))}
        {coBuyers.length < OFFER_CO_BUYERS_MAX ? (
          <Button
            ref={addCoBuyer}
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => {
              setCoBuyers((current) => [...current, EMPTY_IDENTITY]);
              step.clear("coBuyers");
            }}
          >
            <Plus aria-hidden="true" />
            {labels.addCoBuyer}
          </Button>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-lk-line pt-5">
          <Select
            label={labels.mode}
            value={mode}
            onChange={(event) => {
              const next = ACQUISITION_MODES.find((option) => option === event.target.value);
              if (next) setMode(next);
            }}
          >
            {ACQUISITION_MODES.map((option) => (
              <option key={option} value={option}>
                {labels.modes[option]}
              </option>
            ))}
          </Select>
          {mode === "other" ? (
            <Input
              label={labels.modeOther}
              value={modeOther}
              error={step.errors.acquisitionModeOther || undefined}
              onChange={(event) => {
                setModeOther(event.target.value);
                step.clear("acquisitionModeOther");
              }}
            />
          ) : null}
          {mode === "sci" ? (
            <>
              <Input
                label={labels.sci.name}
                value={sci.name}
                error={step.errors["sci.name"] || undefined}
                onChange={(event) => setSciField("name", event.target.value)}
              />
              <Select
                label={labels.sci.status}
                placeholder={labels.sci.statusPlaceholder}
                value={sci.status ?? ""}
                error={step.errors["sci.status"] || undefined}
                onChange={(event) => {
                  const status =
                    SCI_STATUSES.find((option) => option === event.target.value) ?? null;
                  setSci((current) => ({ ...current, status }));
                  step.clear("sci.status");
                }}
              >
                {SCI_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {labels.sci.statuses[option]}
                  </option>
                ))}
              </Select>
              {sci.status === "registered" ? (
                <Input
                  label={labels.sci.siren}
                  help={labels.sci.sirenHelp}
                  inputMode="numeric"
                  value={sci.siren}
                  error={step.errors["sci.siren"] || undefined}
                  onChange={(event) => setSciField("siren", event.target.value)}
                />
              ) : null}
              <Input
                label={labels.sci.seatAddress}
                optional={sci.status !== "registered"}
                value={sci.seatAddress}
                error={step.errors["sci.seatAddress"] || undefined}
                onChange={(event) => setSciField("seatAddress", event.target.value)}
              />
              <Input
                label={labels.sci.representative}
                value={sci.representative}
                error={step.errors["sci.representative"] || undefined}
                onChange={(event) => setSciField("representative", event.target.value)}
              />
            </>
          ) : null}
        </div>
      </StepForm>
      <StepActions previous={backHref} saving={step.saving} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3: the price
// ---------------------------------------------------------------------------

export function PriceStep({
  listingId,
  initialEuros,
  askingCents,
}: {
  listingId: string;
  initialEuros: number | null;
  askingCents: number;
}) {
  const step = useStepForm(listingId, "price", offerFormPath(listingId, 4));
  const [price, setPrice] = useState(initialEuros === null ? "" : formatInteger(initialEuros));
  const labels = t.price;

  const typed = parseWholeEuros(price);
  const cents =
    typed !== null && Number.isInteger(typed) && typed > 0 && typed <= OFFER_AMOUNT_MAX_EUROS
      ? typed * 100
      : null;
  const words = cents === null ? null : priceInWordsFr(cents);
  const gap = cents === null ? null : offerGap(cents, askingCents);

  function submit() {
    if (typed === null) {
      step.fail({ priceEuros: t.errors.required }, null);
      return;
    }
    if (Number.isFinite(typed) && typed > OFFER_AMOUNT_MAX_EUROS) {
      step.fail({ priceEuros: labels.errors.tooHigh }, null);
      return;
    }
    step.save(offerPriceSchema, { priceEuros: typed }, () => labels.errors.price);
  }

  return (
    <>
      <StepForm step={step} onSubmit={submit}>
        <h2 className={titleClass}>{labels.title}</h2>
        <div className="flex flex-col gap-2">
          <UnitInput
            label={labels.price}
            unit="€"
            inputMode="numeric"
            autoComplete="off"
            value={price}
            error={step.errors.priceEuros || undefined}
            className="text-[1.25rem]! font-bold text-wide"
            onChange={(event) => {
              setPrice(event.target.value);
              step.clear("priceEuros");
            }}
          />
          {/* Read again when the price changes: the amount in words is what the document says. */}
          <p aria-live="polite" className="min-h-5 text-lk-secondary text-lk-ink-2">
            {words}
          </p>
        </div>
        {/* On the screen only, never in the document; neutral, never red nor green. */}
        <dl className={tileClass}>
          <TileRow label={labels.asking} value={formatPrice(askingCents)} />
          <TileRow label={labels.offer} value={cents === null ? "—" : formatPrice(cents)} />
          <TileRow
            label={labels.gap}
            value={gap === null ? "—" : (gapLabel(gap) ?? labels.noGap)}
          />
        </dl>
      </StepForm>
      <StepActions previous={offerFormPath(listingId, 2)} saving={step.saving} />
    </>
  );
}

function TileRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-lk-ink-2">{label}</dt>
      <dd
        className={strong ? "font-bold text-lk-ink tabular" : "font-semibold text-lk-ink tabular"}
      >
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: the financing
// ---------------------------------------------------------------------------

export type FinancingInitial = {
  mode: FinancingMode | null;
  downPaymentEuros: number | null;
  loanAmountEuros: number | null;
  loanDurationYears: number | null;
  loanRateMaxPct: number | null;
  lenderName: string;
  progress: (typeof FINANCING_PROGRESS)[number] | null;
  progressOther: string;
};

const amountText = (value: number | null) => (value === null ? "" : formatInteger(value));

const MODE_NAME = "financing-mode";
const readMode = (value: string | null): FinancingMode | null =>
  value === "loan" ? "loan" : value === "no_loan" ? "no_loan" : null;

function financingMessage(path: string): string {
  const labels = t.financing.errors;
  return path === "mode"
    ? labels.mode
    : path === "downPaymentEuros"
      ? labels.amount
      : path === "loanAmountEuros"
        ? labels.loanAmount
        : path === "loanDurationYears"
          ? labels.duration
          : path === "loanRateMaxPct"
            ? labels.rate
            : path === "progress"
              ? labels.progress
              : t.errors.required;
}

export function FinancingStep({
  listingId,
  initial,
  priceCents,
  isNewBuild,
  children,
}: {
  listingId: string;
  initial: FinancingInitial;
  /** The price of step 3, for the estimated budget. */
  priceCents: number | null;
  isNewBuild: boolean;
  /** The proof of financing, with its own form, between the fields and the actions. */
  children?: ReactNode;
}) {
  const step = useStepForm(listingId, "financing", offerFormPath(listingId, 5));
  const [mode, setMode] = useState<FinancingMode | null>(initial.mode);
  const [downPayment, setDownPayment] = useState(amountText(initial.downPaymentEuros));
  const [loanAmount, setLoanAmount] = useState(amountText(initial.loanAmountEuros));
  const [duration, setDuration] = useState(
    initial.loanDurationYears === null ? "" : String(initial.loanDurationYears),
  );
  const [rate, setRate] = useState(
    initial.loanRateMaxPct === null ? "" : String(initial.loanRateMaxPct).replace(".", ","),
  );
  const [lender, setLender] = useState(initial.lenderName);
  const [progress, setProgress] = useState<string>(initial.progress ?? "");
  const [progressOther, setProgressOther] = useState(initial.progressOther);
  const labels = t.financing;
  const { form } = step;
  useEffect(() => {
    const restored = readMode(checkedRadio(form.current, MODE_NAME));
    if (restored) setMode(restored);
  }, [form]);

  function submit() {
    const chosen = mode ?? readMode(checkedRadio(form.current, MODE_NAME));
    if (chosen === null) {
      step.fail({ mode: labels.errors.mode }, null);
      return;
    }
    step.save(
      offerFinancingSchema,
      chosen === "loan"
        ? {
            mode: chosen,
            downPaymentEuros: parseWholeEuros(downPayment),
            loanAmountEuros: parseWholeEuros(loanAmount),
            loanDurationYears: parseWholeNumber(duration),
            loanRateMaxPct: parseFrenchNumber(rate),
            lenderName: lender,
            progress: FINANCING_PROGRESS.find((option) => option === progress) ?? null,
            progressOther,
          }
        : // Without a loan, what was typed for one is hidden: it is not sent,
          // and cannot stop the step.
          {
            mode: chosen,
            downPaymentEuros: null,
            loanAmountEuros: null,
            loanDurationYears: null,
            loanRateMaxPct: null,
            lenderName: "",
            progress: null,
            progressOther: "",
          },
      financingMessage,
    );
  }

  const budget = priceCents === null ? null : offerBudget(priceCents, isNewBuild);
  const down = parseWholeEuros(downPayment);
  const loan = parseWholeEuros(loanAmount);
  const funds =
    mode === "loan" &&
    down !== null &&
    loan !== null &&
    Number.isInteger(down) &&
    Number.isInteger(loan) &&
    down >= 0 &&
    loan >= 0
      ? (down + loan) * 100
      : null;

  const field = (path: string, set: (value: string) => void) => ({
    error: step.errors[path] || undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      set(event.target.value);
      step.clear(path);
    },
  });

  return (
    <>
      <StepForm step={step} onSubmit={submit}>
        <h2 className={titleClass}>{labels.title}</h2>
        <div
          className="flex flex-col gap-2"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === MODE_NAME) {
              setMode(readMode(target.value));
              step.clear("mode");
            }
          }}
        >
          <p aria-hidden="true" className="text-lk-label font-medium text-lk-ink">
            {labels.question}
          </p>
          <RoleCards
            name={MODE_NAME}
            legend={labels.question}
            defaultValue={initial.mode ?? undefined}
            error={step.errors.mode || undefined}
            options={[
              { value: "loan", ...labels.modes.loan },
              { value: "no_loan", ...labels.modes.no_loan },
            ]}
          />
        </div>

        {mode === "loan" ? (
          <>
            <p className="text-lk-caption text-lk-ink-3">{labels.declared}</p>
            <UnitInput
              label={labels.downPayment}
              unit="€"
              inputMode="numeric"
              autoComplete="off"
              value={downPayment}
              {...field("downPaymentEuros", setDownPayment)}
            />
            <UnitInput
              label={labels.loanAmount}
              unit="€"
              inputMode="numeric"
              autoComplete="off"
              value={loanAmount}
              {...field("loanAmountEuros", setLoanAmount)}
            />
            <div className="grid grid-cols-2 gap-4">
              <UnitInput
                label={labels.loanDuration}
                unit={labels.years}
                inputMode="numeric"
                autoComplete="off"
                value={duration}
                {...field("loanDurationYears", setDuration)}
              />
              <UnitInput
                label={labels.loanRate}
                unit="%"
                inputMode="decimal"
                autoComplete="off"
                value={rate}
                {...field("loanRateMaxPct", setRate)}
              />
            </div>
            <Input
              label={labels.lender}
              optional
              value={lender}
              {...field("lenderName", setLender)}
            />
            <Select
              label={labels.progress}
              placeholder={labels.progressPlaceholder}
              value={progress}
              error={step.errors.progress || undefined}
              onChange={(event) => {
                setProgress(event.target.value);
                step.clear("progress");
              }}
            >
              {FINANCING_PROGRESS.map((option) => (
                <option key={option} value={option}>
                  {labels.progressOptions[option]}
                </option>
              ))}
            </Select>
            {progress === "other" ? (
              <Input
                label={labels.progressOther}
                value={progressOther}
                {...field("progressOther", setProgressOther)}
              />
            ) : null}
          </>
        ) : null}

        {budget ? (
          // Indicative and neutral: never a verdict, never a block (SPEC 13).
          <div className={tileClass}>
            <h3 className="font-semibold text-lk-ink">{labels.budget.title}</h3>
            <dl className="flex flex-col gap-2">
              <TileRow label={labels.budget.price} value={formatPrice(priceCents ?? 0)} />
              <TileRow
                label={labels.budget.fees(formatRate(budget.rate))}
                value={formatPrice(budget.feesCents)}
              />
              <TileRow label={labels.budget.total} value={formatPrice(budget.totalCents)} strong />
            </dl>
            <p className="text-lk-caption text-pretty text-lk-ink-2">{labels.budget.note}</p>
            {funds !== null ? (
              <p className="text-pretty text-lk-ink-2">
                {labels.budget.compare(formatPrice(funds), formatPrice(budget.totalCents))}
              </p>
            ) : null}
          </div>
        ) : null}
      </StepForm>
      {children}
      <StepActions previous={offerFormPath(listingId, 3)} saving={step.saving} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 5: the conditions
// ---------------------------------------------------------------------------

export function ConditionsStep({
  listingId,
  initial,
  financingMode,
}: {
  listingId: string;
  initial: OfferConditionsInput;
  financingMode: FinancingMode;
}) {
  const step = useStepForm(listingId, "conditions", offerFormPath(listingId, 6));
  const [priorSale, setPriorSale] = useState(initial.priorSale);
  const [authorization, setAuthorization] = useState(initial.authorization);
  const [other, setOther] = useState(initial.other);
  const [details, setDetails] = useState(initial.details);
  const labels = t.conditions;
  const count = details.trim().length;

  function submit() {
    step.save(offerConditionsSchema, { priorSale, authorization, other, details }, () =>
      count > OFFER_DETAILS_MAX ? labels.errors.tooLong : labels.errors.details,
    );
  }

  return (
    <>
      <StepForm step={step} onSubmit={submit}>
        <h2 className={titleClass}>{labels.title}</h2>
        {/* Shown as soon as the step opens (model of Cédric); part of the page, not news. */}
        <InlineAlert tone="warning" live={false}>
          {financingMode === "loan" ? `${labels.warning} ${labels.warningLoan}` : labels.warning}
        </InlineAlert>
        {/* Deduced from step 4, never asked again. */}
        <div className="flex flex-col gap-1">
          <p className="text-lk-label font-medium text-lk-ink">{labels.financing}</p>
          <p className="text-lk-secondary text-lk-ink-2">{labels.mention[financingMode]}</p>
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-lk-label font-medium text-lk-ink">{labels.others}</legend>
          <Checkbox
            label={labels.priorSale}
            checked={priorSale}
            onChange={(event) => setPriorSale(event.target.checked)}
          />
          <Checkbox
            label={labels.authorization}
            checked={authorization}
            onChange={(event) => setAuthorization(event.target.checked)}
          />
          <Checkbox
            label={labels.other}
            checked={other}
            onChange={(event) => {
              setOther(event.target.checked);
              step.clear("details");
            }}
          />
        </fieldset>
        <Textarea
          label={labels.details}
          optional={!other}
          rows={4}
          help={labels.count(formatInteger(count), formatInteger(OFFER_DETAILS_MAX))}
          value={details}
          error={
            step.errors.details || (count > OFFER_DETAILS_MAX ? labels.errors.tooLong : undefined)
          }
          onChange={(event) => {
            setDetails(event.target.value);
            step.clear("details");
          }}
        />
      </StepForm>
      <StepActions previous={offerFormPath(listingId, 4)} saving={step.saving} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 6: the validity
// ---------------------------------------------------------------------------

const VALIDITY_DAYS = Array.from(
  { length: OFFER_VALIDITY_MAX_DAYS - OFFER_VALIDITY_MIN_DAYS + 1 },
  (_, index) => OFFER_VALIDITY_MIN_DAYS + index,
);

export function ValidityStep({
  listingId,
  initialDays,
  now,
}: {
  listingId: string;
  initialDays: number;
  /** The time of the server when the page was rendered (the same on both sides). */
  now: string;
}) {
  const step = useStepForm(listingId, "validity", offerFormPath(listingId, 7));
  const [days, setDays] = useState(initialDays);
  // What the server will count when the step is saved, to the hour: shown
  // here from its clock at first, and written by it (saveOfferStep).
  const [until, setUntil] = useState(() => validityAfterDays(initialDays, new Date(now)));
  const labels = t.validity;

  function submit() {
    step.save(offerValiditySchema, { days }, () => labels.errors.range);
  }

  return (
    <>
      <StepForm step={step} onSubmit={submit}>
        <h2 className={titleClass}>{labels.title}</h2>
        <Select
          label={labels.duration}
          value={String(days)}
          error={step.errors.days || undefined}
          onChange={(event) => {
            const next = Number(event.target.value);
            setDays(next);
            setUntil(validityAfterDays(next));
            step.clear("days");
          }}
        >
          {VALIDITY_DAYS.map((option) => (
            <option key={option} value={option}>
              {labels.days(option)}
            </option>
          ))}
        </Select>
        <div className={tileClass}>
          <p aria-live="polite" className="font-semibold text-lk-ink tabular">
            {labels.until(formatNumericDateTime(until))}
          </p>
          <p className="text-lk-ink-2">{labels.help}</p>
        </div>
      </StepForm>
      <StepActions previous={offerFormPath(listingId, 5)} saving={step.saving} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 7: the declarations
// ---------------------------------------------------------------------------

const DECLARATIONS = [
  "accuracy",
  "priceAndFinancingChecked",
  "legalEffectsUnderstood",
  "infoRead",
] as const;
type Declaration = (typeof DECLARATIONS)[number];
const VISIT_NAME = "visited";

export function DeclarationsStep({
  listingId,
  initial,
}: {
  listingId: string;
  initial: { visited: boolean | null } & Record<Declaration, boolean>;
}) {
  const step = useStepForm(listingId, "declarations", offerFormPath(listingId, "review"));
  const [visited, setVisited] = useState(initial.visited);
  const [ticked, setTicked] = useState<Record<Declaration, boolean>>({
    accuracy: initial.accuracy,
    priceAndFinancingChecked: initial.priceAndFinancingChecked,
    legalEffectsUnderstood: initial.legalEffectsUnderstood,
    infoRead: initial.infoRead,
  });
  const labels = t.declarations;
  const { form } = step;
  useEffect(() => {
    const restored = checkedRadio(form.current, VISIT_NAME);
    if (restored) setVisited(restored === "yes");
  }, [form]);
  const complete = visited !== null && DECLARATIONS.every((name) => ticked[name]);

  function submit() {
    if (visited === null) {
      step.fail({ visited: labels.errors.visit }, null);
      return;
    }
    step.save(offerDeclarationsSchema, { visited, ...ticked }, () => labels.errors.all);
  }

  return (
    <>
      <StepForm step={step} onSubmit={submit}>
        <h2 className={titleClass}>{labels.title}</h2>
        {/* The notice of Cédric, very visible, at the head of the step. */}
        <aside className="flex flex-col gap-2 rounded-lk-md border-[1.5px] border-lk-blue bg-lk-blue-tint p-4 text-lk-secondary leading-relaxed text-lk-navy">
          <h3 className="text-lk-body font-bold text-wide">{labels.notice.title}</h3>
          {labels.notice.paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-pretty">
              {paragraph}
            </p>
          ))}
        </aside>

        <div
          className="flex flex-col gap-2"
          onChange={(event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement && target.name === VISIT_NAME) {
              setVisited(target.value === "yes");
              step.clear("visited");
            }
          }}
        >
          <p aria-hidden="true" className="text-lk-label font-medium text-lk-ink">
            {labels.visit}
          </p>
          <RoleCards
            name={VISIT_NAME}
            legend={labels.visit}
            defaultValue={initial.visited === null ? undefined : initial.visited ? "yes" : "no"}
            error={step.errors.visited || undefined}
            options={[
              { value: "yes", ...labels.visited },
              { value: "no", ...labels.notVisited },
            ]}
          />
        </div>

        <div className="flex flex-col gap-3">
          {DECLARATIONS.map((name) => (
            <Checkbox
              key={name}
              checked={ticked[name]}
              onChange={(event) =>
                setTicked((current) => ({ ...current, [name]: event.target.checked }))
              }
              label={
                name === "infoRead" ? (
                  <>
                    {labels.infoRead}{" "}
                    <a
                      href={ROUTES.faq}
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-lk-blue underline underline-offset-2 hover:no-underline"
                    >
                      {labels.infoLink}
                    </a>
                  </>
                ) : (
                  labels[name]
                )
              }
            />
          ))}
        </div>
      </StepForm>
      <StepActions
        previous={offerFormPath(listingId, 6)}
        saving={step.saving}
        label={labels.review}
        disabled={!complete}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// The review: the document, then « Envoyer mon offre au vendeur »
// ---------------------------------------------------------------------------

export function ReviewActions({ offerId, listingId }: { offerId: string; listingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<{ message: string; step: 1 | 6 } | null>(null);
  const [sending, startSending] = useTransition();
  const busy = useRef(false);
  const labels = t.review;

  function send() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    startSending(async () => {
      let result: Awaited<ReturnType<typeof submitOffer>> | null = null;
      try {
        result = await submitOffer(offerId);
      } catch (caught) {
        console.error("[offers] offer send failed", caught);
      }
      if (!result?.ok) {
        busy.current = false;
        setError(
          !result
            ? { message: t.errors.generic, step: 1 }
            : result.error === "validity"
              ? { message: labels.errors.validity, step: 6 }
              : result.error === "incomplete"
                ? { message: labels.errors.incomplete, step: 1 }
                : result.error === "auth"
                  ? { message: t.errors.signedOut, step: 1 }
                  : result.error === "closed"
                    ? { message: t.errors.closed, step: 1 }
                    : { message: t.errors.generic, step: 1 },
        );
        return;
      }
      // Sent: the form leaves no step behind it in the history.
      startSending(() => router.replace(`${offerPath(offerId)}?envoyee=1`));
    });
  }

  return (
    <>
      {error ? (
        <InlineAlert
          tone="danger"
          className="mt-5"
          action={
            <Link
              href={offerFormPath(listingId, error.step)}
              className="font-semibold underline underline-offset-2 hover:no-underline"
            >
              {labels.edit}
            </Link>
          }
        >
          {error.message}
        </InlineAlert>
      ) : null}
      {/* « Modifier » keeps its width: the long label of the sending takes the rest. */}
      <FormActionBar className="md:mt-6 [&>*]:flex-none [&>*:last-child]:flex-1">
        <Button asChild variant="ghost">
          <Link href={offerFormPath(listingId, 1)}>{labels.edit}</Link>
        </Button>
        <Button type="button" loading={sending} onClick={send} className="px-4 whitespace-nowrap">
          {labels.send}
        </Button>
      </FormActionBar>
    </>
  );
}
