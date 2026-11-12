"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { Checkbox } from "@/components/shared/checkbox";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InfoNote } from "@/components/shared/info-note";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { Select } from "@/components/shared/select";
import { UnitInput } from "@/components/shared/unit-input";
import { formatDay } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/i18n/sections/contact-email";
import { frProperties } from "@/lib/i18n/sections/properties";
import { frSearch } from "@/lib/i18n/sections/search";
import {
  DPE_KINDS,
  DPE_NUMBER,
  dpeOutdated,
  forType,
  HEATING_OPTIONS,
  NOT_FOR_TYPE,
  parseFrenchNumber,
  PROPERTY_FEATURES,
  type Characteristics,
  type CharacteristicsField,
  type DpeKind,
  parisToday,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";
import { saveCharacteristics, type SaveCharacteristicsResult } from "../actions";
import { findDpe, type FindDpeResult } from "../dpe-actions";
import type { DpeRecord } from "../dpe-record";
import type { DpeSettings } from "../dpe-rules";
import type { SellerPhoto } from "../photos";
import { PhotoUploader } from "./photo-uploader";
import { CREATION_FORM_ID, intentOf, submitWithEnter, type StepEdit } from "./creation-header";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = {
  legal: { contactEmail: CONTACT_EMAIL },
  properties: frProperties,
  search: frSearch,
} as const;

const t = fr.properties.characteristics;
const common = fr.properties.creation;
const errors = fr.properties.errors;
const edits = fr.properties.edit;

// Step 2 of the creation (SPEC-V2 section 8.3, docs/DESIGN.md 12.2): type,
// surface, rooms, bedrooms, floor, DPE, features, then the details. Numbers
// are typed in French (« 68,5 »). The fields that do not apply to the type
// are hidden and saved empty (NOT_FOR_TYPE: a floor for a house, rooms for
// land), here and on the server. Then the photos (L1-12), saved as soon as
// they are added: the step waits for them before going on. Once the listing
// is sent (L1-14b, `edit`), the same fields without the photos (their own
// tab), « Annuler » and « Enregistrer », always complete. The DPE (L1-65)
// in one block where Bien.png shows it: the classes, its date, the range of
// the costs and the year of the prices, or « non soumis » and its motive;
// optional here, asked to send the listing for review. Its number (L1-66)
// takes the classes, the date and the figures from the register of ADEME;
// they stay typed when the register has none or does not answer. What is
// asked follows the rule of its kind (dpe_rules): business premises have no
// cost range.

type NumberField = Exclude<
  CharacteristicsField,
  | "type"
  | "dpe"
  | "ges"
  | "heating"
  | "dpeExemptionReason"
  | "dpeDate"
  | "energyPriceYear"
  | "dpeNumber"
>;
type PropertyType = (typeof PROPERTY_TYPES)[number];

const NUMBER_FIELDS: readonly NumberField[] = [
  "surfaceM2",
  "carrezM2",
  "rooms",
  "bedrooms",
  "floor",
  "floorsTotal",
  "buildYear",
  "chargesMonthlyEuros",
  "propertyTaxYearlyEuros",
  "coproLots",
  "energyCostMinEuros",
  "energyCostMaxEuros",
  "energyKwhM2Year",
  "gesKgM2Year",
];

const text = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));
/** « 120,50 », not « 120,5 »: an amount with cents shows both digits. */
const amountText = (value: number | null) =>
  value === null || Number.isInteger(value) ? text(value) : value.toFixed(2).replace(".", ",");
const AMOUNT_FIELDS: readonly NumberField[] = ["chargesMonthlyEuros", "propertyTaxYearlyEuros"];
const COST_FIELDS: readonly NumberField[] = ["energyCostMinEuros", "energyCostMaxEuros"];
const FIGURE_FIELDS: readonly NumberField[] = ["energyKwhM2Year", "gesKgM2Year"];

/** What the register of ADEME answered for the number typed. */
type Lookup =
  | { status: "found"; record: DpeRecord; samePostalCode: boolean }
  | { status: "unknown" | "unavailable" | "premises" | "kindLocked" | "auth" | "not_found" };

/** « 1er juillet 2021 », as a rule is written. */
const ruleDay = (day: string) => formatDay(day).replace(/^1 /, "1er ");

const energy = fr.properties.characteristics.energy;
const OTHER_REASON = "other";
/** The reference years of the prices a DPE can carry: since its reform, to this year. */
const priceYears = (today: string) => {
  const last = Number(today.slice(0, 4));
  return Array.from({ length: last - 2021 + 1 }, (_, index) => last - index);
};

export function CharacteristicsStep({
  propertyId,
  initial,
  photos,
  dpe: settings,
  note,
  edit,
}: {
  propertyId: string;
  initial: Omit<Characteristics, "propertyId">;
  photos: SellerPhoto[];
  /** The rules of the DPE and the motives of exemption, as the base holds them. */
  dpe: DpeSettings;
  /**
   * « Repris de votre analyse de valeur du … » (L1-13b, docs/DESIGN.md 12.2);
   * once sent, what a change means for the listing (L1-14b).
   */
  note?: string;
  edit?: StepEdit;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [type, setType] = useState<PropertyType | null>(initial.type);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(
    () =>
      Object.fromEntries(
        NUMBER_FIELDS.map((field) => [
          field,
          AMOUNT_FIELDS.includes(field) ? amountText(initial[field]) : text(initial[field]),
        ]),
      ) as Record<NumberField, string>,
  );
  const [dpe, setDpe] = useState(initial.dpe);
  const [ges, setGes] = useState(initial.ges);
  const [heating, setHeating] = useState(initial.heating);
  const [dpeExempt, setDpeExempt] = useState(initial.dpeExempt);
  const listedReason = settings.reasons.includes(initial.dpeExemptionReason ?? "");
  const [reason, setReason] = useState(
    initial.dpeExemptionReason === null
      ? ""
      : listedReason
        ? initial.dpeExemptionReason
        : OTHER_REASON,
  );
  const [otherReason, setOtherReason] = useState(
    listedReason ? "" : (initial.dpeExemptionReason ?? ""),
  );
  const [dpeDate, setDpeDate] = useState(initial.dpeDate ?? "");
  const [dpeNumber, setDpeNumber] = useState(initial.dpeNumber ?? "");
  const [dpeKind, setDpeKind] = useState<DpeKind>(initial.dpeKind);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [looking, startLooking] = useTransition();
  const [priceYear, setPriceYear] = useState(initial.energyPriceYear);
  const [features, setFeatures] = useState<PropertyFeature[]>(initial.features);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CharacteristicsField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // One save at a time: a second click would only race the first.
  const submitting = useRef(false);
  const [photosBusy, setPhotosBusy] = useState(false);

  const hidden = (type && NOT_FOR_TYPE[type]) || { fields: [], features: [] };
  const land = type === "terrain";
  const shows = (field: CharacteristicsField) => !hidden.fields.includes(field);
  const shownFeatures = PROPERTY_FEATURES.filter((feature) => !hidden.features.includes(feature));
  const today = parisToday();
  const years = priceYears(today);
  // Only another property may be business premises (forType).
  const kind: DpeKind = type === "autre" ? dpeKind : "logement";
  const premises = kind === "tertiaire";
  const rule = settings.rules[kind];
  // Said as soon as the date is typed (a date after today is an error of the field).
  const outdated =
    !dpeExempt &&
    rule !== undefined &&
    dpeDate !== "" &&
    dpeDate <= today &&
    dpeOutdated(dpeDate, rule, today);

  function clearError(field: CharacteristicsField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function setNumber(field: NumberField, value: string) {
    setNumbers((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  /**
   * The DPE of the number typed, from the register of ADEME: its classes, its
   * date and its figures fill the form, which the seller checks and saves.
   */
  function retrieve() {
    const number = dpeNumber.trim().toUpperCase();
    if (!DPE_NUMBER.test(number)) {
      showErrors({ dpeNumber: errors.dpeNumber });
      return;
    }
    setError(null);
    startLooking(async () => {
      let result: FindDpeResult | null = null;
      try {
        result = await findDpe({ propertyId, number });
      } catch (caught) {
        console.error("[properties] DPE lookup failed", caught);
      }
      if (!result) return setLookup({ status: "unavailable" });
      if (!result.ok) {
        if (result.error === "invalid") return showErrors({ dpeNumber: errors.dpeNumber });
        // Said under the button, where the seller is looking.
        return setLookup({ status: result.error });
      }
      const { record, samePostalCode } = result.data;
      // A flat or a house never has the DPE of business premises.
      if (record.kind === "tertiaire" && type !== "autre") return setLookup({ status: "premises" });
      // Once sent, the kind of the DPE is declared by the team: a number of the other kind fills nothing.
      if (edit && record.kind !== kind) return setLookup({ status: "kindLocked" });
      if (type === "autre") setDpeKind(record.kind);
      setDpeNumber(number);
      if (record.dpe) setDpe(record.dpe);
      if (record.ges) setGes(record.ges);
      if (record.date) setDpeDate(record.date);
      setNumbers((current) => ({
        ...current,
        energyKwhM2Year:
          record.energyKwhM2Year === null ? current.energyKwhM2Year : text(record.energyKwhM2Year),
        gesKgM2Year: record.gesKgM2Year === null ? current.gesKgM2Year : text(record.gesKgM2Year),
      }));
      setFieldErrors((current) => ({
        ...current,
        dpeNumber: undefined,
        dpeDate: undefined,
        energyKwhM2Year: undefined,
        gesKgM2Year: undefined,
      }));
      setLookup({ status: "found", record, samePostalCode });
    });
  }

  /** The errors in the page first, then the focus on the first field in error. */
  function showErrors(fields: Partial<Record<CharacteristicsField, string>>) {
    flushSync(() => setFieldErrors(fields));
    form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (photosBusy) {
      setError(t.photosBusy);
      return;
    }
    const intent = intentOf(event);
    const typed: Partial<Record<NumberField, number | null>> = {};
    const invalid: Partial<Record<CharacteristicsField, string>> = {};
    for (const field of NUMBER_FIELDS) {
      // Exempt: its figures and its range are hidden, so not read; business
      // premises have no range.
      const unread =
        (dpeExempt && (COST_FIELDS.includes(field) || FIGURE_FIELDS.includes(field))) ||
        (premises && COST_FIELDS.includes(field));
      const value = shows(field) && !unread ? parseFrenchNumber(numbers[field]) : null;
      if (Number.isNaN(value)) invalid[field] = errors.number;
      // The label of a DPE shows whole figures; some reports give a decimal (« 57,8 »).
      else
        typed[field] = value !== null && FIGURE_FIELDS.includes(field) ? Math.round(value) : value;
    }
    if (Object.keys(invalid).length > 0) {
      showErrors(invalid);
      return;
    }
    const exemptionReason = (reason === OTHER_REASON ? otherReason : reason).trim();
    // As the server saves it: the hidden fields empty, no rooms for land.
    const payload = forType({
      propertyId,
      type,
      surfaceM2: typed.surfaceM2 ?? null,
      carrezM2: typed.carrezM2 ?? null,
      rooms: typed.rooms ?? null,
      bedrooms: typed.bedrooms ?? null,
      floor: typed.floor ?? null,
      floorsTotal: typed.floorsTotal ?? null,
      buildYear: typed.buildYear ?? null,
      isNewBuild: initial.isNewBuild,
      dpe,
      ges,
      heating,
      features,
      chargesMonthlyEuros: typed.chargesMonthlyEuros ?? null,
      propertyTaxYearlyEuros: typed.propertyTaxYearlyEuros ?? null,
      coproLots: typed.coproLots ?? null,
      dpeExempt,
      dpeExemptionReason: exemptionReason === "" ? null : exemptionReason,
      dpeDate: dpeDate === "" ? null : dpeDate,
      energyCostMinEuros: typed.energyCostMinEuros ?? null,
      energyCostMaxEuros: typed.energyCostMaxEuros ?? null,
      energyPriceYear: priceYear,
      dpeNumber: dpeNumber.trim() === "" ? null : dpeNumber.trim().toUpperCase(),
      dpeKind: kind,
      energyKwhM2Year: typed.energyKwhM2Year ?? null,
      gesKgM2Year: typed.gesKgM2Year ?? null,
    });
    setError(null);
    submitting.current = true;
    startSaving(async () => {
      let result: SaveCharacteristicsResult | null = null;
      try {
        result = await saveCharacteristics(payload, intent === "next" ? "next" : "save");
      } catch (caught) {
        console.error("[properties] characteristics save failed", caught);
      }
      if (!result?.ok) {
        submitting.current = false;
        if (result?.fieldErrors) {
          showErrors(
            Object.fromEntries(
              Object.entries(result.fieldErrors).map(([field, key]) => [
                field,
                edit && key === "required"
                  ? edits.required.field
                  : (errors[key ?? "outOfRange"] ?? errors.outOfRange),
              ]),
            ),
          );
        }
        setError(
          !result
            ? common.error
            : result.error === "auth"
              ? common.signedOut
              : result.error === "not_found"
                ? common.notFound
                : result.error === "dpe"
                  ? edits.required.dpe
                  : result.error === "dpe_exemption"
                    ? edits.required.dpeExemption(fr.legal.contactEmail)
                    : result.error === "incomplete"
                      ? edit
                        ? land
                          ? edits.required.land
                          : edits.required.characteristics
                        : land
                          ? t.requiredLand
                          : t.required
                      : result.error === "invalid"
                        ? null
                        : common.error,
        );
        return;
      }
      const target = edit
        ? edit.doneHref
        : intent === "save"
          ? "/vendeur"
          : intent === "previous"
            ? `/vendeur/biens/${propertyId}/adresse`
            : `/vendeur/biens/${propertyId}/prix`;
      // In the transition: the buttons stay busy until the next page shows.
      // A change made (edit) leaves no form behind it in the history.
      startSaving(() => (edit ? router.replace(target) : router.push(target)));
    });
  }

  const numberInput = (field: NumberField, label: string, help?: string) => (
    <Input
      label={label}
      help={help}
      inputMode="numeric"
      value={numbers[field]}
      error={fieldErrors[field]}
      onChange={(event) => setNumber(field, event.target.value)}
    />
  );
  const unitInput = (field: NumberField, label: string, unit: string) => (
    <UnitInput
      label={label}
      unit={unit}
      // The range and the figures of a DPE are whole; the other amounts may have cents.
      inputMode={
        COST_FIELDS.includes(field) || FIGURE_FIELDS.includes(field) ? "numeric" : "decimal"
      }
      value={numbers[field]}
      error={fieldErrors[field]}
      onChange={(event) => setNumber(field, event.target.value)}
    />
  );

  return (
    <form
      ref={form}
      id={CREATION_FORM_ID}
      onSubmit={submit}
      onKeyDown={(event) => submitWithEnter(event, event.currentTarget, next.current)}
      noValidate
      className="flex flex-1 flex-col gap-5"
    >
      <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">
        {edit ? edits.parts.characteristics : t.title}
      </h2>
      {note ? (
        <InfoNote>
          <p>{note}</p>
        </InfoNote>
      ) : null}
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <Select
        label={t.type}
        placeholder={t.typePlaceholder}
        value={type ?? ""}
        error={fieldErrors.type}
        onChange={(event) => {
          setType(PROPERTY_TYPES.find((value) => value === event.target.value) ?? null);
          setFieldErrors((current) => ({ ...current, type: undefined }));
          // What the register answered was for the type before.
          setLookup(null);
        }}
      >
        {/* Once sent, a property becomes land through the team (properties_keep_dpe). */}
        {PROPERTY_TYPES.filter(
          (value) => !edit || value !== "terrain" || initial.type === "terrain",
        ).map((value) => (
          <option key={value} value={value}>
            {fr.search.types[value]}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {unitInput("surfaceM2", land ? t.landSurface : t.surface, "m²")}
        {shows("rooms") ? numberInput("rooms", t.rooms) : null}
        {shows("bedrooms") ? numberInput("bedrooms", t.bedrooms) : null}
        {shows("floor") ? numberInput("floor", t.floor, t.floorHelp) : null}
        {/* Land: no charges nor co-ownership, the tax next to the surface. */}
        {land ? unitInput("propertyTaxYearlyEuros", t.tax, t.perYear) : null}
      </div>

      {land ? null : (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-lk-h3 font-semibold text-lk-ink">{energy.legend}</legend>
          {edit ? null : (
            <InfoNote>
              <p>{energy.note}</p>
            </InfoNote>
          )}
          {/* Once sent, an exemption is declared by the team, which reads it (properties_keep_dpe). */}
          {edit && !initial.dpeExempt ? null : (
            <Checkbox
              label={energy.exempt}
              checked={dpeExempt}
              onChange={(event) => setDpeExempt(event.target.checked)}
            />
          )}
          {dpeExempt ? (
            <>
              <Select
                label={energy.reason}
                placeholder={energy.reasonPlaceholder}
                value={reason}
                disabled={Boolean(edit)}
                error={reason === OTHER_REASON ? undefined : fieldErrors.dpeExemptionReason}
                onChange={(event) => {
                  setReason(event.target.value);
                  clearError("dpeExemptionReason");
                }}
              >
                {settings.reasons.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
                <option value={OTHER_REASON}>{energy.otherReason}</option>
              </Select>
              {reason === OTHER_REASON ? (
                <Input
                  label={energy.otherReasonLabel}
                  value={otherReason}
                  disabled={Boolean(edit)}
                  maxLength={300}
                  error={fieldErrors.dpeExemptionReason}
                  onChange={(event) => {
                    setOtherReason(event.target.value);
                    clearError("dpeExemptionReason");
                  }}
                />
              ) : null}
              <p className="text-lk-caption text-lk-ink-3">
                {edit ? energy.reasonLocked(fr.legal.contactEmail) : energy.reasonNote}
              </p>
            </>
          ) : (
            <>
              {type === "autre" ? (
                <Select
                  label={energy.kind}
                  value={dpeKind}
                  // Once sent, the kind of the DPE is declared by the team (properties_keep_dpe).
                  disabled={Boolean(edit)}
                  onChange={(event) => {
                    setDpeKind(
                      DPE_KINDS.find((value) => value === event.target.value) ?? "logement",
                    );
                    setLookup(null);
                  }}
                >
                  {DPE_KINDS.map((value) => (
                    <option key={value} value={value}>
                      {energy.kinds[value]}
                    </option>
                  ))}
                </Select>
              ) : null}
              <Input
                label={energy.number}
                help={energy.numberHelp}
                value={dpeNumber}
                maxLength={13}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                error={fieldErrors.dpeNumber}
                onChange={(event) => {
                  setDpeNumber(event.target.value);
                  setLookup(null);
                  clearError("dpeNumber");
                }}
                // Enter in the number asks the register, not the next step.
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  retrieve();
                }}
              />
              <Button type="button" variant="secondary" loading={looking} onClick={retrieve}>
                {energy.retrieve}
              </Button>
              {/* Always in the page: what the register answers is read out when it comes. */}
              <div aria-live="polite" className="flex flex-col gap-4 empty:hidden">
                {lookup?.status === "found" ? (
                  <>
                    <InlineAlert tone="success" live={false}>
                      {energy.found(
                        lookup.record.dpe,
                        lookup.record.ges,
                        lookup.record.date ? formatDay(lookup.record.date) : null,
                      )}
                      {lookup.record.kind === "logement" ? ` ${energy.foundCosts}` : null}
                    </InlineAlert>
                    {!lookup.samePostalCode && lookup.record.postalCode ? (
                      <InlineAlert tone="warning" live={false}>
                        {energy.otherPostalCode(lookup.record.postalCode)}
                      </InlineAlert>
                    ) : null}
                  </>
                ) : lookup ? (
                  <InlineAlert
                    tone={
                      lookup.status === "unavailable"
                        ? "info"
                        : lookup.status === "auth" || lookup.status === "not_found"
                          ? "danger"
                          : "warning"
                    }
                    live={false}
                  >
                    {
                      {
                        unknown: energy.unknown,
                        unavailable: energy.unavailable,
                        premises: energy.premisesNumber,
                        kindLocked: energy.kindLocked(fr.legal.contactEmail),
                        auth: common.signedOut,
                        not_found: common.notFound,
                      }[lookup.status]
                    }
                  </InlineAlert>
                ) : null}
              </div>
              <SegmentedPicker
                label={energy.energyClass}
                value={dpe ?? ""}
                onValueChange={(value) =>
                  setDpe(DPE_CLASSES.find((letter) => letter === value) ?? null)
                }
                options={DPE_CLASSES.map((letter) => ({
                  value: letter,
                  label: letter,
                  ariaLabel: t.energyClass(t.dpe, letter),
                }))}
              />
              <SegmentedPicker
                label={energy.climateClass}
                value={ges ?? ""}
                onValueChange={(value) =>
                  setGes(DPE_CLASSES.find((letter) => letter === value) ?? null)
                }
                options={DPE_CLASSES.map((letter) => ({
                  value: letter,
                  label: letter,
                  ariaLabel: t.energyClass(t.ges, letter),
                }))}
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                <Input
                  type="date"
                  label={energy.date}
                  help={energy.dateHelp}
                  min={rule?.validFrom ?? undefined}
                  max={today}
                  value={dpeDate}
                  error={fieldErrors.dpeDate}
                  onChange={(event) => {
                    setDpeDate(event.target.value);
                    clearError("dpeDate");
                  }}
                />
                {premises ? null : (
                  <Select
                    label={energy.priceYear}
                    help={energy.priceYearHelp}
                    placeholder={energy.priceYearPlaceholder}
                    value={priceYear === null ? "" : String(priceYear)}
                    error={fieldErrors.energyPriceYear}
                    onChange={(event) => {
                      setPriceYear(event.target.value === "" ? null : Number(event.target.value));
                      clearError("energyPriceYear");
                    }}
                  >
                    {(priceYear !== null && !years.includes(priceYear)
                      ? [priceYear, ...years]
                      : years
                    ).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              {outdated && rule ? (
                <InlineAlert tone="warning">
                  {energy.outdated(
                    rule.validFrom ? ruleDay(rule.validFrom) : null,
                    rule.validityYears,
                  )}
                </InlineAlert>
              ) : null}
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                  {unitInput("energyKwhM2Year", energy.energyUse, energy.kwh)}
                  {unitInput("gesKgM2Year", energy.emissions, energy.kg)}
                </div>
                <p className="text-lk-caption text-lk-ink-3">
                  {energy.figuresHelp}
                  {rule?.figuresRequired === false ? ` ${energy.figuresOptional}` : null}
                </p>
              </div>
              {premises ? null : (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-lk-label font-medium text-lk-ink">
                    {energy.costs}
                  </legend>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    {unitInput("energyCostMinEuros", energy.costMin, t.perYear)}
                    {unitInput("energyCostMaxEuros", energy.costMax, t.perYear)}
                  </div>
                  <p className="text-lk-caption text-lk-ink-3">{energy.costHelp}</p>
                </fieldset>
              )}
            </>
          )}
        </fieldset>
      )}

      {shownFeatures.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-lk-label font-medium text-lk-ink">{t.features}</legend>
          <div className="flex flex-wrap gap-2">
            {shownFeatures.map((feature) => (
              <ChipToggle
                key={feature}
                pressed={features.includes(feature)}
                onPressedChange={(pressed) =>
                  setFeatures((current) =>
                    pressed ? [...current, feature] : current.filter((item) => item !== feature),
                  )
                }
              >
                {t.featureLabels[feature]}
              </ChipToggle>
            ))}
          </div>
        </fieldset>
      ) : null}

      {land ? null : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {shows("carrezM2") ? unitInput("carrezM2", t.carrez, "m²") : null}
          {shows("floorsTotal")
            ? numberInput(
                "floorsTotal",
                type === "appartement" || type === null ? t.floorsTotal : t.levels,
              )
            : null}
          {shows("buildYear") ? numberInput("buildYear", t.buildYear) : null}
          {shows("heating") ? (
            <Select
              label={t.heating}
              placeholder={t.heatingPlaceholder}
              value={heating ?? ""}
              onChange={(event) =>
                setHeating(HEATING_OPTIONS.find((value) => value === event.target.value) ?? null)
              }
            >
              {HEATING_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      )}

      {land ? null : (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-lk-h3 font-semibold text-lk-ink">{t.details}</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {unitInput("chargesMonthlyEuros", t.charges, t.perMonth)}
            {unitInput("propertyTaxYearlyEuros", t.tax, t.perYear)}
            {numberInput("coproLots", t.lots)}
          </div>
        </fieldset>
      )}

      {edit ? null : (
        <PhotoUploader propertyId={propertyId} initial={photos} onBusyChange={setPhotosBusy} />
      )}

      <FormActionBar className="md:mt-3">
        {edit ? (
          <Button asChild variant="secondary">
            <Link href={edit.cancelHref}>{edits.cancel}</Link>
          </Button>
        ) : (
          // While photos are sent, the step waits: « Continuer » says it.
          <Button
            type="submit"
            name="intent"
            value="previous"
            variant="secondary"
            disabled={saving || photosBusy}
          >
            {common.previous}
          </Button>
        )}
        <Button ref={next} type="submit" name="intent" value="next" loading={saving || photosBusy}>
          {edit ? edits.save : common.next}
        </Button>
      </FormActionBar>
    </form>
  );
}
