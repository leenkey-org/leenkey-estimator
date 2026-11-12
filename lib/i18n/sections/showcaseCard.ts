// Texts of the interface, part « showcaseCard » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// The card of a property of direction C (components/shared/showcase-card.tsx).

export const frShowcaseCard = {
  previousPhoto: "Photo précédente",
  nextPhoto: "Photo suivante",
  photoPosition: (position: number, total: number) => `Photo ${position} sur ${total}`,
} as const;
