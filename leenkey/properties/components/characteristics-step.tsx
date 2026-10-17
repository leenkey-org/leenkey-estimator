"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  HEATING_OPTIONS,
  parseFrenchNumber,
  PROPERTY_FEATURES,
  type Characteristics,
  type PropertyFeature,
} from "@/lib/validations/property";
import { DPE_CLASSES, PROPERTY_TYPES } from "@/lib/validations/search";
import {
  saveCharacteristics,
  type CharacteristicsField,
  type SaveCharacteristicsResult,
} from "../actions";
import { CREATION_FORM_ID, intentOf, submitWithEnter } from "./creation-header";

const t = fr.properties.characteristics;
const common = fr.properties.creation;
const errors = fr.properties.errors;

// Step 2 of the creation (SPEC-V2 section 8.3, docs/DESIGN.md 12.2): type,
// surface, rooms, bedrooms, floor, DPE, features, then the details. Numbers
// are typed in French (« 68,5 »). The fields that do not apply to the type
// are hidden and saved empty (a floor for a house, rooms for land). Photos:
// L1-12.

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

/** Fields and features that a type of property does not have. */
const HIDDEN: Partial<
  Record<
    PropertyType,
    { fields: readonly CharacteristicsField[]; features: readonly PropertyFeature[] }
  >
> = {
  maison: { fields: ["carrezM2", "floor", "floorsTotal", "coproLots"], features: ["elevator"] },
  terrain: {
    fields: [
      "carrezM2",
      "rooms",
      "bedrooms",
      "floor",
      "floorsTotal",
      "buildYear",
      "dpe",
      "ges",
      "heating",
      "chargesMonthlyEuros",
      "coproLots",
    ],
    features: PROPERTY_FEATURES,
  },
};

const text = (value: number | null) => (value === null ? "" : String(value).replace(".", ","));

export function CharacteristicsStep({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: Omit<Characteristics, "propertyId">;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const [type, setType] = useState<PropertyType | null>(initial.type);
  const [numbers, setNumbers] = useState<Record<NumberField, string>>(
    () =>
      Object.fromEntries(NUMBER_FIELDS.map((field) => [field, text(initial[field])])) as Record<
        NumberField,
        string
      >,
  );
  const [dpe, setDpe] = useState(initial.dpe);
  const [ges, setGes] = useState(initial.ges);
  const [heating, setHeating] = useState(initial.heating);
  const [features, setFeatures] = useState<PropertyFeature[]>(initial.features);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CharacteristicsField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const hidden = (type && HIDDEN[type]) || { fields: [], features: [] };
  const shows = (field: CharacteristicsField) => !hidden.fields.includes(field);
  const shownFeatures = PROPERTY_FEATURES.filter((feature) => !hidden.features.includes(feature));

  function setNumber(field: NumberField, value: string) {
    setNumbers((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstError(fields: Partial<Record<CharacteristicsField, string>>) {
    // After the render that shows the errors.
    window.setTimeout(() => {
      const invalid = form.current?.querySelector<HTMLElement>("[aria-invalid=true]");
      invalid?.focus();
    }, 0);
    return fields;
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intent = intentOf(event);
    const typed: Partial<Record<NumberField, number | null>> = {};
    const invalid: Partial<Record<CharacteristicsField, string>> = {};
    for (const field of NUMBER_FIELDS) {
      const value = shows(field) ? parseFrenchNumber(numbers[field]) : null;
      if (Number.isNaN(value)) invalid[field] = errors.number;
      else typed[field] = value;
    }
    if (Object.keys(invalid).length > 0) {
      setFieldErrors(focusFirstError(invalid));
      return;
    }
    const payload: Characteristics = {
      propertyId,
      type,
      surfaceM2: typed.surfaceM2 ?? null,
      carrezM2: typed.carrezM2 ?? null,
      // Land has no rooms: 0, which a listing needs.
      rooms: type === "terrain" ? 0 : (typed.rooms ?? null),
      bedrooms: typed.bedrooms ?? null,
      floor: typed.floor ?? null,
      floorsTotal: typed.floorsTotal ?? null,
      buildYear: typed.buildYear ?? null,
      isNewBuild: initial.isNewBuild,
      dpe: shows("dpe") ? dpe : null,
      ges: shows("ges") ? ges : null,
      heating: shows("heating") ? heating : null,
      features: features.filter((feature) => shownFeatures.includes(feature)),
      chargesMonthlyEuros: typed.chargesMonthlyEuros ?? null,
      propertyTaxYearlyEuros: typed.propertyTaxYearlyEuros ?? null,
      coproLots: typed.coproLots ?? null,
    };
    setError(null);
    startSaving(async () => {
      let result: SaveCharacteristicsResult | null = null;
      try {
        result = await saveCharacteristics(payload, intent === "next" ? "next" : "save");
      } catch (caught) {
        console.error("[properties] characteristics save failed", caught);
      }
      if (!result?.ok) {
        if (result?.fieldErrors) {
          setFieldErrors(
            focusFirstError(
              Object.fromEntries(
                Object.entries(result.fieldErrors).map(([field, key]) => [
                  field,
                  errors[key ?? "outOfRange"] ?? errors.outOfRange,
                ]),
              ),
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
                  ? t.required
                  : result.error === "invalid"
                    ? null
                    : common.error,
        );
        return;
      }
      router.push(
        intent === "save"
          ? "/vendeur"
          : intent === "previous"
            ? `/vendeur/biens/${propertyId}/adresse`
            : `/vendeur/biens/${propertyId}/prix`,
      );
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
      className="flex flex-col gap-5"
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
            {fr.propertyType[value]}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {unitInput("surfaceM2", type === "terrain" ? t.landSurface : t.surface, "m²")}
        {shows("rooms") ? numberInput("rooms", t.rooms) : null}
        {shows("bedrooms") ? numberInput("bedrooms", t.bedrooms) : null}
        {shows("floor") ? numberInput("floor", t.floor, t.floorHelp) : null}
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

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        {shows("carrezM2") ? unitInput("carrezM2", t.carrez, "m²") : null}
        {shows("floorsTotal") ? numberInput("floorsTotal", t.floorsTotal) : null}
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

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lk-h3 font-semibold text-lk-ink">{t.details}</legend>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          {shows("chargesMonthlyEuros")
            ? unitInput("chargesMonthlyEuros", t.charges, t.perMonth)
            : null}
          {unitInput("propertyTaxYearlyEuros", t.tax, t.perYear)}
          {shows("coproLots") ? numberInput("coproLots", t.lots) : null}
        </div>
      </fieldset>

      <FormActionBar className="mt-3">
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
