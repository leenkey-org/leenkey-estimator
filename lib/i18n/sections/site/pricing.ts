// Texts of the public site, part « pricing » (lib/i18n/site.ts gathers them; P-06).
// /tarifs (L1-42): the contents of the plans come from the plans table
// (SPEC-V2 11 bis), the V1 lists describing another offer.

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";

export const frSitePricing = {
  metaTitle: "Tarifs · Leenkey",
  metaDescription:
    "Trois formules à forfait fixe, jamais de commission : Autonomie gratuite, Accompagné et Sérénité payées à la souscription.",
  // The pill of the V1 page, without its emoji (L1-50), without the launch
  // phase: Autonomie is free, with no end (Younes, 2026-11-04).
  eyebrow: "Freemium",
  title: "Une formule pour chaque vendeur.",
  accent: "chaque vendeur.",
  lead: "Commencez gratuitement avec Autonomie, puis choisissez l'accompagnement qui vous convient. Vendez votre bien et économisez réellement.",
  view: "Affichage des formules",
  views: { price: "Prix des formules", savings: "Mon économie vs agence" },
  free: "Gratuit",
  taxes: "TTC",
  savings: (amount: string) => `\u2212${amount} vs agence`,
  savingsNote: `Économie indicative sur un bien à 350${N}000${N}€`,
  unavailable: "Les formules n'ont pas pu être chargées. Réessayez dans un instant.",
  items: {
    // The text of each plan (table plans) ends its card: « Gratuit, sans
    // carte bancaire… », « Forfait fixe par bien · 12 mois
    // d'accompagnement ». Under a paid price, when it is paid.
    autonomie: {
      text: "Tous les outils pour gérer votre vente vous-même.",
      badge: "Disponible gratuitement",
      action: "Commencer gratuitement",
    },
    accompagne: {
      text: "Vous gérez votre vente, un conseiller vous accompagne à chaque étape.",
      note: "Payé à la souscription, en une fois",
      action: "Choisir Accompagné",
    },
    serenite: {
      text: "Votre vente avance, nous vous accompagnons jusqu'à la signature.",
      note: "Payé à la souscription, en une fois",
      action: "Choisir Sérénité",
    },
  },
} as const;
