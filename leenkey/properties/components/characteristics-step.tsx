"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import { Button } from "@/components/shared/button";
import { ChipToggle } from "@/components/shared/chip-toggle";
import { FormActionBar } from "@/components/shared/form-action-bar";
import { InlineAlert } from "@/components/shared/inline-alert";
import { Input } from "@/components/shared/input";
import { SegmentedPicker } from "@/components/shared/segmented-picker";
import { Select } from "@/components/shared/select";
import { UnitInput } from "@/components/shared/unit-input";
import { fr } from "@/lib/i18n/fr";
import {
  forType,
  HEATING_OPTIONS,
  NOT_FOR_TYPE,
  parseFrenchNumber,
  PROPERTY_FEATURES,
  type Characteristics,
  type CharacteristicsField,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";
import { saveCharacteristics, type SaveCharacteristicsResult } from "../actions";
import type { SellerPhoto } from "../photos";
import { PhotoUploader } from "./photo-uploader";
import { CREATION_FORM_ID, intentOf, submitWithEnter } from "./creation-header";

const t = fr.properties.characteristics;
const common = fr.properties.creation;
const errors = fr.properties.errors;

// Step 2 of the creation (SPEC-V2 section 8.3, docs/DESIGN.md 12.2): type,
// surface, rooms, bedrooms, floor, DPE, features, then the details. Numbers
// are typed in French (« 68,5 »). The fields that do not apply to the type
// are hidden and saved empty (NOT_FOR_TYPE: a floor for a house, rooms for
// land), here and on the server. Then the photos (L1-12), saved as soon as
// they are added: the step waits for them before going on.

type NumberField = Exclude<CharacteristicsField, "type" | "dpe" | "ges" | "heating">;
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
];

const text = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));
/** « 120,50 », not « 120,5 »: an amount with cents shows both digits. */
const amountText = (value: number | null) =>
  value === null || Number.isInteger(value) ? text(value) : value.toFixed(2).replace(".", ",");
const AMOUNT_FIELDS: readonly NumberField[] = ["chargesMonthlyEuros", "propertyTaxYearlyEuros"];

export function CharacteristicsStep({
  propertyId,
  initial,
  photos,
}: {
  propertyId: string;
  initial: Omit<Characteristics, "propertyId">;
  photos: SellerPhoto[];
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

  function setNumber(field: NumberField, value: string) {
    setNumbers((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
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
      const value = shows(field) ? parseFrenchNumber(numbers[field]) : null;
      if (Number.isNaN(value)) invalid[field] = errors.number;
      else typed[field] = value;
    }
    if (Object.keys(invalid).length > 0) {
      showErrors(invalid);
      return;
    }
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
                errors[key ?? "outOfRange"] ?? errors.outOfRange,
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
                : result.error === "incomplete"
                  ? land
                    ? t.requiredLand
                    : t.required
                  : result.error === "invalid"
                    ? null
                    : common.error,
        );
        return;
      }
      const target =
        intent === "save"
          ? "/vendeur"
          : intent === "previous"
            ? `/vendeur/biens/${propertyId}/adresse`
            : `/vendeur/biens/${propertyId}/prix`;
      // In the transition: the buttons stay busy until the next page shows.
      startSaving(() => router.push(target));
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
      inputMode="decimal"
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
      <h2 className="text-lk-h2 font-bold text-wide text-lk-ink">{t.title}</h2>
      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <Select
        label={t.type}
        placeholder={t.typePlaceholder}
        value={type ?? ""}
        error={fieldErrors.type}
        onChange={(event) => {
          setType(PROPERTY_TYPES.find((value) => value === event.target.value) ?? null);
          setFieldErrors((current) => ({ ...current, type: undefined }));
        }}
      >
        {PROPERTY_TYPES.map((value) => (
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

      {shows("dpe") ? (
        <SegmentedPicker
          label={t.dpe}
          value={dpe ?? ""}
          onValueChange={(value) => setDpe(DPE_CLASSES.find((letter) => letter === value) ?? null)}
          options={DPE_CLASSES.map((letter) => ({
            value: letter,
            label: letter,
            ariaLabel: t.energyClass(t.dpe, letter),
          }))}
        />
      ) : null}

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

      {shows("ges") ? (
        <SegmentedPicker
          label={t.ges}
          value={ges ?? ""}
          onValueChange={(value) => setGes(DPE_CLASSES.find((letter) => letter === value) ?? null)}
          options={DPE_CLASSES.map((letter) => ({
            value: letter,
            label: letter,
            ariaLabel: t.energyClass(t.ges, letter),
          }))}
        />
      ) : null}

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

      <PhotoUploader propertyId={propertyId} initial={photos} onBusyChange={setPhotosBusy} />

      <FormActionBar className="md:mt-3">
        {/* While photos are sent, the step waits: « Continuer » says it. */}
        <Button
          type="submit"
          name="intent"
          value="previous"
          variant="secondary"
          disabled={saving || photosBusy}
        >
          {common.previous}
        </Button>
        <Button ref={next} type="submit" name="intent" value="next" loading={saving || photosBusy}>
          {common.next}
        </Button>
      </FormActionBar>
    </form>
  );
}
