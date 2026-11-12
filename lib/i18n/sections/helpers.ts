// Helpers of the texts (lib/i18n/sections).

/** « de David », « d'Alice », « d'Hélène »: the elision before a vowel or an h (« de Yann »). */
export function of(name: string): string {
  return /^[aeiouhàâäéèêëîïôöùûüæœ]/i.test(name) ? `d'${name}` : `de ${name}`;
}
