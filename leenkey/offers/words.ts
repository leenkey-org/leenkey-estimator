// The price of an offer in words (SPEC-V2 13, step 3: shown under the field,
// generated, never typed). The database writes the one of the document when
// the offer is sent (price_in_words_fr, migration `offers`): this is the same
// rule for the form, checked against it (tests/unit/offers, rls_offers.sql).
// French in its traditional spelling, as the acts write it: « trois cent
// trente-huit mille euros », « quatre-vingts », « deux cents millions »,
// « mille » invariable.

const UNITS = [
  "",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 1 to 999; `final`: nothing follows (« deux cents », « quatre-vingts »). */
function below1000(n: number, final: boolean): string {
  if (n === 0) return "";
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let head = "";
  if (hundreds === 1) head = "cent";
  else if (hundreds > 1) head = `${UNITS[hundreds]} cent${rest === 0 && final ? "s" : ""}`;
  let tail = "";
  if (rest > 0) {
    if (rest < 20) {
      tail = UNITS[rest];
    } else {
      const tens = Math.floor(rest / 10);
      const units = rest % 10;
      if (tens <= 6) {
        tail = TENS[tens] + (units === 1 ? " et un" : units > 0 ? `-${UNITS[units]}` : "");
      } else if (tens === 7) {
        tail = `soixante${units === 1 ? " et onze" : `-${UNITS[10 + units]}`}`;
      } else if (tens === 8) {
        tail = `quatre-vingt${units === 0 ? (final ? "s" : "") : `-${UNITS[units]}`}`;
      } else {
        tail = `quatre-vingt-${UNITS[10 + units]}`;
      }
    }
  }
  return `${head} ${tail}`.trim();
}

/** « trois cent trente-huit mille »; null outside 0 to 999 999 999 999. */
export function numberInWordsFr(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000_000_000) return null;
  if (n === 0) return "zéro";
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor(n / 1_000_000) % 1000;
  const thousands = Math.floor(n / 1000) % 1000;
  const rest = n % 1000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${below1000(billions, true)} milliard${billions > 1 ? "s" : ""}`);
  if (millions > 0) parts.push(`${below1000(millions, true)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest > 0) parts.push(below1000(rest, true));
  return parts.join(" ");
}

/** « trois cent trente-huit mille euros », « un euro », « un million d'euros »; whole euros only. */
export function priceInWordsFr(cents: number): string | null {
  if (!Number.isInteger(cents) || cents <= 0 || cents % 100 !== 0) return null;
  const eurosCount = cents / 100;
  const words = numberInWordsFr(eurosCount);
  if (words === null) return null;
  if (eurosCount === 1) return `${words} euro`;
  return eurosCount % 1_000_000 === 0 ? `${words} d'euros` : `${words} euros`;
}
