import {
  DPE_CLASSES,
  OUTDOOR_SPACES,
  PROPERTY_TYPES,
  SEARCH_RADII_KM,
  type OutdoorSpace,
  type SearchFilters,
} from "@/lib/validations/search";

// State of the filters panel: what the person types (strings, euros), turned
// into SearchFilters (cents) for the count and when the panel is applied.

export type FiltersForm = {
  /** "0": the commune only; otherwise 2, 5, 10 or 20 km. */
  radius: string;
  type: string;
  priceMin: string;
  priceMax: string;
  surfaceMin: string;
  surfaceMax: string;
  roomsMin: string;
  bedroomsMin: string;
  outdoor: OutdoorSpace[];
  parking: boolean;
  elevator: boolean;
  dpeMax: string;
};

export type FiltersFormErrors = { price?: true; surface?: true };

const text = (value: number | undefined) => (value === undefined ? "" : String(value));

export function formFromFilters(filters: SearchFilters): FiltersForm {
  return {
    radius: text(filters.radiusKm) || "0",
    type: filters.type ?? "",
    priceMin: text(filters.priceMinCents && Math.round(filters.priceMinCents / 100)),
    priceMax: text(filters.priceMaxCents && Math.round(filters.priceMaxCents / 100)),
    surfaceMin: text(filters.surfaceMin),
    surfaceMax: text(filters.surfaceMax),
    roomsMin: text(filters.roomsMin),
    bedroomsMin: text(filters.bedroomsMin),
    outdoor: [...(filters.outdoor ?? [])],
    parking: filters.parking ?? false,
    elevator: filters.elevator ?? false,
    dpeMax: filters.dpeMax ?? "",
  };
}

/** Digits typed in a field (« 400 000 » is accepted); empty or 0: no limit. */
export function wholeNumberInput(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  const number = Number(digits);
  return number > 0 && Number.isSafeInteger(number) ? number : undefined;
}

function choice<T extends string | number>(values: readonly T[], value: string): T | undefined {
  return values.find((candidate) => String(candidate) === value);
}

/**
 * Filters of the panel; the commune comes from the search field (base).
 * A minimum above its maximum is an error: nothing is applied.
 */
export function filtersFromForm(
  form: FiltersForm,
  base: SearchFilters,
): { filters: SearchFilters; errors: FiltersFormErrors } {
  const errors: FiltersFormErrors = {};
  const priceMin = wholeNumberInput(form.priceMin);
  const priceMax = wholeNumberInput(form.priceMax);
  const surfaceMin = wholeNumberInput(form.surfaceMin);
  const surfaceMax = wholeNumberInput(form.surfaceMax);
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) errors.price = true;
  if (surfaceMin !== undefined && surfaceMax !== undefined && surfaceMin > surfaceMax) {
    errors.surface = true;
  }

  const rooms = wholeNumberInput(form.roomsMin);
  const bedrooms = wholeNumberInput(form.bedroomsMin);
  const filters: SearchFilters = {
    location: base.location,
    radiusKm: base.location ? choice(SEARCH_RADII_KM, form.radius) : undefined,
    type: choice(PROPERTY_TYPES, form.type),
    priceMinCents: priceMin === undefined ? undefined : priceMin * 100,
    priceMaxCents: priceMax === undefined ? undefined : priceMax * 100,
    surfaceMin,
    surfaceMax,
    roomsMin: rooms !== undefined && rooms <= 20 ? rooms : undefined,
    bedroomsMin: bedrooms !== undefined && bedrooms <= 20 ? bedrooms : undefined,
    outdoor: form.outdoor.length
      ? OUTDOOR_SPACES.filter((space) => form.outdoor.includes(space))
      : undefined,
    parking: form.parking || undefined,
    elevator: form.elevator || undefined,
    dpeMax: choice(DPE_CLASSES, form.dpeMax),
  };
  // No undefined keys: the object is compared and sent as is.
  for (const key of Object.keys(filters) as Array<keyof SearchFilters>) {
    if (filters[key] === undefined) delete filters[key];
  }
  return { filters, errors };
}
