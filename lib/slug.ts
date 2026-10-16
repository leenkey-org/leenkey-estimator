// Same result as the SQL function public.slugify() (L1-04): lower case, no
// accents, every other run of characters becomes one hyphen.
// « Viry-Châtillon » → « viry-chatillon », « La Ville-du-Bois » → « la-ville-du-bois ».

const LIGATURES: Record<string, string> = { œ: "oe", æ: "ae", ß: "ss" };

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[œæß]/g, (letter) => LIGATURES[letter] ?? letter)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Comparison key for a search typed by a person: no case, no accents, single spaces. */
export function searchKey(value: string): string {
  return slugify(value).replace(/-/g, " ");
}
