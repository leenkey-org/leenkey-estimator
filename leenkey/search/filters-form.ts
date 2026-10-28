import { formatInteger } from "@/lib/format";
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

/** minAboveMax: the minimum above the maximum; tooHigh: beyond what the search reads. */
export type BudgetError = "minAboveMax" | "tooHigh";

export type FiltersFormErrors = { price?: BudgetError; surface?: true };

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

// The budget of the bar and of the panel (L1-61): a slider over two fields.

/** Top of the slider, in euros: a thumb there is « no maximum ». */
export const BUDGET_CAP_EUROS = 1_500_000;
export const BUDGET_STEP_EUROS = 5_000;
/** Highest budget the search reads (lib/validations/search.ts, in cents). */
export const BUDGET_LIMIT_EUROS = 1_000_000_000;

/** The two fields of the budget, as typed. */
export type BudgetDraft = { min: string; max: string };

/**
 * Where the thumbs stand for the amounts typed: an end without amount, an
 * amount beyond the top of the slider at its top (the field keeps it).
 */
export function budgetThumbs({ min, max }: BudgetDraft): [number, number] {
  const low = Math.min(wholeNumberInput(min) ?? 0, BUDGET_CAP_EUROS);
  const high = Math.min(wholeNumberInput(max) ?? BUDGET_CAP_EUROS, BUDGET_CAP_EUROS);
  return [low, Math.max(low, high)];
}

/**
 * The fields once a thumb moved: only the side that moved is written again
 * (« 1 495 000 »), so that an amount typed beyond the top of the slider stays
 * while the other thumb moves; a thumb at an end means no limit on its side.
 */
export function budgetFromThumbs(draft: BudgetDraft, [from, to]: readonly number[]): BudgetDraft {
  const [low, high] = budgetThumbs(draft);
  const amount = (euros: number) => formatInteger(euros);
  return {
    min: from === undefined || from === low ? draft.min : from > 0 ? amount(from) : "",
    max: to === undefined || to === high ? draft.max : to < BUDGET_CAP_EUROS ? amount(to) : "",
  };
}

/** A usual budget chosen: it is the maximum; the minimum stays when it is not above it. */
export function budgetPreset(draft: BudgetDraft, euros: number): BudgetDraft {
  const low = wholeNumberInput(draft.min);
  return { min: low !== undefined && low <= euros ? draft.min : "", max: formatInteger(euros) };
}

export function budgetError({ min, max }: BudgetDraft): BudgetError | undefined {
  const low = wholeNumberInput(min);
  const high = wholeNumberInput(max);
  if ((low ?? 0) > BUDGET_LIMIT_EUROS || (high ?? 0) > BUDGET_LIMIT_EUROS) return "tooHigh";
  if (low !== undefined && high !== undefined && low > high) return "minAboveMax";
  return undefined;
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
  const price = budgetError({ min: form.priceMin, max: form.priceMax });
  if (price) errors.price = price;
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
