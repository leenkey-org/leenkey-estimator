// Texts of the interface, part « nav » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-10: navigation shells (docs/DESIGN.md 10.6 to 10.8).

import { of } from "./helpers";

export const frNav = {
  label: "Navigation principale",
  adminLabel: "Navigation du back office",
  brand: "Leenkey",
  // The space of the admins (Younes, 2026-10-28: « Back office » for the
  // admins, « Cockpit » for the clients).
  backOffice: "Back office",
  // From the back office, back to the site (DECISIONS 2026-10-26).
  site: "Voir le site",
  links: {
    buy: "Acheter",
    sell: "Vendre",
    // Never « Estimer mon bien » (CLAUDE.md section 16, DESIGN.md 17).
    valuation: "Valoriser mon bien",
  },
  sellCta: "Vendre mon bien",
  signIn: "Mon compte",
  favourites: "Favoris",
  tabs: {
    sale: "Ma vente",
    file: "Dossier",
    messages: "Messages",
    account: "Compte",
    search: "Chercher",
    favourites: "Favoris",
    // The way to the other side, for every account (DECISIONS 2026-10-19).
    buy: "Acheter",
    sell: "Vendre",
    listings: "Annonces",
    cases: "Dossiers",
    users: "Utilisateurs",
    assistant: "Assistant",
  },
  admin: {
    dashboard: "Tableau de bord",
    listings: "Annonces",
    users: "Utilisateurs",
    cases: "Dossiers",
    offers: "Offres",
    reports: "Signalements",
    messages: "Messages",
    assistant: "Assistant",
    role: "Administrateur",
  },
  menu: {
    trigger: "Menu du compte",
    // The space of a client, seller or buyer (Younes, 2026-10-28).
    home: "Cockpit",
    // The plans of a seller's properties (/vendeur/formule).
    plans: "Ma formule",
    account: "Mon compte",
    signOut: "Se déconnecter",
  },
  notifications: {
    bell: "Notifications",
    bellUnread: (count: number) =>
      count === 1 ? "Notifications, 1 nouvelle" : `Notifications, ${count} nouvelles`,
    title: "Notifications",
    close: "Fermer les notifications",
    settings: "Réglages des notifications",
    emptyTitle: "Aucune notification",
    emptySeller:
      "Nous vous prévenons ici des messages, des visites et des offres reçus pour votre bien.",
    completeListing: "Compléter mon annonce",
    emptyBuyer:
      "Nous vous prévenons ici des réponses des vendeurs et des nouveaux biens de vos recherches.",
    emptyAdmin: "Nous vous prévenons ici des annonces envoyées en relecture.",
    reviewListings: "Voir les annonces à valider",
  },
} as const;
