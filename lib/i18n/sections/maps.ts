// Texts of the interface, part « maps » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-15: search /acheter (SPEC-V2 8.4, docs/DESIGN.md 10.3, 12.5, 12.6).
// L1-16: maps of Google Maps, loaded without a click since L1-63
// (DECISIONS 2026-10-28).

export const frMaps = {
  loading: "Chargement de la carte…",
  unavailable: "La carte n'est pas disponible pour le moment.",
} as const;
