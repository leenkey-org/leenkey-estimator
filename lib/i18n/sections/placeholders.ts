// Texts of the interface, part « placeholders » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-10: pages whose screen comes with a later task (ComingSoon).

export const frPlaceholders = {
  // « Dossier » tab (L1-14): the page of the property, or the list of them.
  sellerFile: {
    metaTitle: "Dossier de vente · Leenkey",
    title: "Dossier de vente",
  },
  admin: {
    offers: {
      metaTitle: "Offres · Back office · Leenkey",
      title: "Offres",
      comingTitle: "Le suivi des offres arrive",
      comingText: "Nous préparons l'écran qui réunira les offres d'achat et leur historique.",
    },
  },
} as const;
