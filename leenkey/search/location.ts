import { LAUNCH_ZONE, type LaunchZoneCommune } from "@/lib/config/launch-zone";
import { searchKey, slugify } from "@/lib/slug";

// Place of a search: a commune (slug) or a postal code, from the `ville`
// parameter. Communes of the launch zone have a name and a centre for the
// radius; any other commune is still searched by its slug, without radius.

export type CommuneOption = LaunchZoneCommune & {
  /** URL value and SQL filter (same as public.slugify of the city). */
  slug: string;
  /** Lower case, no accents, spaces: compared with what is typed. */
  key: string;
};

export const COMMUNES: readonly CommuneOption[] = [...LAUNCH_ZONE]
  .sort((a, b) => a.zone - b.zone || a.name.localeCompare(b.name, "fr"))
  .map((commune) => ({ ...commune, slug: slugify(commune.name), key: searchKey(commune.name) }));

export type ResolvedLocation = {
  /** Value of the `ville` parameter. */
  value: string;
  /** Shown in the search field and the results header. */
  label: string;
  kind: "commune" | "postal_code";
  citySlug?: string;
  postalCode?: string;
  /** Centre of the radius, when the place is in the launch zone. */
  centre?: { lat: number; lng: number };
};

const POSTAL_CODE = /^\d{5}$/;
// Lower case words inside French commune names (« Saulx-les-Chartreux »).
const LOWER_WORDS = new Set([
  "sur",
  "sous",
  "les",
  "lès",
  "le",
  "la",
  "de",
  "des",
  "du",
  "en",
  "et",
  "aux",
  "au",
]);

/** « saint-denis » → « Saint-Denis », for a commune outside the launch zone. */
function labelFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word, index) =>
      index > 0 && LOWER_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join("-");
}

function centroid(communes: readonly CommuneOption[]): ResolvedLocation["centre"] {
  if (communes.length === 0) return undefined;
  const lat = communes.reduce((sum, commune) => sum + commune.centre.lat, 0) / communes.length;
  const lng = communes.reduce((sum, commune) => sum + commune.centre.lng, 0) / communes.length;
  return { lat, lng };
}

export function resolveLocation(value: string): ResolvedLocation {
  if (POSTAL_CODE.test(value)) {
    const communes = COMMUNES.filter((commune) => commune.postalCodes.includes(value));
    return {
      value,
      label: value,
      kind: "postal_code",
      postalCode: value,
      centre: centroid(communes),
    };
  }
  const commune = COMMUNES.find((candidate) => candidate.slug === value);
  return {
    value,
    label: commune?.name ?? labelFromSlug(value),
    kind: "commune",
    citySlug: value,
    centre: commune?.centre,
  };
}

/**
 * Communes of the launch zone matching what is typed: name starting with it
 * first, then a word of the name, then anywhere; digits match the postal
 * code. Empty input: every commune, core market first.
 */
export function suggestCommunes(input: string, limit = COMMUNES.length): CommuneOption[] {
  const query = searchKey(input);
  if (!query) return COMMUNES.slice(0, limit);
  if (/^\d+$/.test(query)) {
    return COMMUNES.filter((commune) =>
      commune.postalCodes.some((code) => code.startsWith(query)),
    ).slice(0, limit);
  }
  const rank = (commune: CommuneOption) => {
    if (commune.key.startsWith(query)) return 0;
    if (commune.key.split(" ").some((word) => word.startsWith(query))) return 1;
    return commune.key.includes(query) ? 2 : -1;
  };
  return COMMUNES.map((commune) => ({ commune, score: rank(commune) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ commune }) => commune)
    .slice(0, limit);
}

/**
 * What a typed text becomes when it is submitted without picking a
 * suggestion: the best suggestion, a postal code, or the slug of the text.
 */
export function locationFromText(input: string): string | undefined {
  const text = input.trim();
  if (!text) return undefined;
  if (POSTAL_CODE.test(text)) return text;
  const best = suggestCommunes(text, 1)[0];
  if (best) return best.slug;
  const slug = slugify(text);
  return slug && slug.length <= 80 ? slug : undefined;
}
