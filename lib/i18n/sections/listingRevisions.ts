// Texts of the interface, part « listingRevisions » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-35: the history of a listing changed once online, on the page of the
// property (seller) and in the back office.

const NBSP = " ";

export const frListingRevisions = {
  sellerTitle: "Historique des modifications",
  sellerIntro:
    "Chaque modification faite depuis la mise en ligne est notée ici, et nous en sommes informés.",
  adminTitle: "Modifications depuis la mise en ligne",
  adminIntro: "Faites par le vendeur sans nouvelle relecture : à contrôler.",
  empty: "Aucune modification depuis la mise en ligne.",
  unavailable: "L'historique ne peut pas être affiché pour le moment.",
  limited: (count: number) => `Les ${count} dernières modifications.`,
  price: "Prix",
  title: "Titre",
  description: "Description modifiée",
  photoAdded: "Photo ajoutée",
  photoRemoved: "Photo retirée",
  caption: "Légende d'une photo",
  change: (before: string, after: string) => `${before} → ${after}`,
  quoted: (words: string) => `«${NBSP}${words}${NBSP}»`,
  none: "aucun",
  noCaption: "sans légende",
  pct: (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value)}${NBSP}%`,
  byTeam: "par l'équipe Leenkey",
  showTexts: "Voir l'ancienne et la nouvelle description",
  before: "Avant",
  after: "Après",
  emptyText: "(vide)",
} as const;
