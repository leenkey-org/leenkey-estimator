import type { Characteristics, PropertyFeature } from "@/lib/validations/property";

// The columns of properties that hold the characteristics of step 2, written
// by step 2 itself and by a creation from an analysis of value (L1-13b).

const FEATURE_COLUMNS = {
  balcony: "has_balcony",
  terrace: "has_terrace",
  garden: "has_garden",
  parking: "has_parking",
  cellar: "has_cellar",
  elevator: "has_elevator",
} as const satisfies Record<PropertyFeature, string>;

const cents = (euros: number | null) => (euros === null ? null : Math.round(euros * 100));

export function characteristicsColumns(value: Omit<Characteristics, "propertyId">) {
  const has = (feature: PropertyFeature) => value.features.includes(feature);
  return {
    type: value.type,
    surface_m2: value.surfaceM2,
    carrez_m2: value.carrezM2,
    rooms: value.rooms,
    bedrooms: value.bedrooms,
    floor: value.floor,
    floors_total: value.floorsTotal,
    build_year: value.buildYear,
    is_new_build: value.isNewBuild,
    dpe_class: value.dpe,
    ges_class: value.ges,
    heating: value.heating,
    charges_monthly_cents: cents(value.chargesMonthlyEuros),
    property_tax_yearly_cents: cents(value.propertyTaxYearlyEuros),
    copro_lots: value.coproLots,
    [FEATURE_COLUMNS.balcony]: has("balcony"),
    [FEATURE_COLUMNS.terrace]: has("terrace"),
    [FEATURE_COLUMNS.garden]: has("garden"),
    [FEATURE_COLUMNS.parking]: has("parking"),
    [FEATURE_COLUMNS.cellar]: has("cellar"),
    [FEATURE_COLUMNS.elevator]: has("elevator"),
  };
}
