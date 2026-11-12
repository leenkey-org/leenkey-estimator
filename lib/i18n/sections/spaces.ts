// Texts of the interface, part « spaces » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// Signed-in areas until their screens exist (L1-10, L1-19, L1-24).

export const frSpaces = {
  greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : "Bonjour"),
  signOut: "Se déconnecter",
  home: "Accueil Leenkey",
  seller: {
    metaTitle: "Ma vente · Leenkey",
    title: "Mettez votre bien en vente",
    // The two ways to start (DECISIONS 2026-10-26).
    text: "Créez votre annonce, ou commencez par une analyse de valeur gratuite : tout est enregistré au fur et à mesure, vous reprenez quand vous voulez.",
  },
  buyer: {
    metaTitle: "Cockpit · Leenkey",
  },
  admin: {
    metaTitle: "Back office · Leenkey",
  },
} as const;
