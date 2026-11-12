// Texts of the interface, part « adminDashboard » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-30a: the dashboard of the back office (SPEC-V2 section 17).

import { of } from "./helpers";

export const frAdminDashboard = {
  greeting: (firstName: string | null) =>
    firstName ? `Bonjour ${firstName}, voici ce qui vous attend.` : "Voici ce qui vous attend.",
  tiles: {
    label: "Chiffres du back office",
    listings: "Annonces à valider",
    oldest: (wait: string, late: boolean) =>
      `Plus ancienne : ${wait}${late ? " · au-delà de 24\u00A0h" : " · objectif 24\u00A0h"}`,
    none: "Rien en attente",
    cases: "Dossiers ouverts",
    reports: "Signalements ouverts",
    // L1-34: the sellers who wrote to their adviser, not read by the team.
    messages: "Messages clients non lus",
    plans: (days: number) => `Formules vendues · ${days}\u00A0j`,
    plansAmount: (amount: string) => `${amount} TTC`,
    signups: (days: number) => `Inscriptions · ${days}\u00A0j`,
    signupsSplit: (sellers: number, buyers: number) =>
      `${sellers}\u00A0${sellers > 1 ? "vendeurs" : "vendeur"}, ${buyers}\u00A0${buyers > 1 ? "acquéreurs" : "acquéreur"}`,
  },
  // The header of a phone (AdminMobileHeader): three tiles, a navigation
  // named apart from the « À traiter » list of the dashboard.
  header: {
    label: "Compteurs du back office",
    listings: "À valider",
    cases: "Dossiers",
    reports: "Signalements",
  },
  todo: {
    title: "À traiter",
    lead: "Ce qui attend l'équipe, du plus ancien au plus récent.",
    kinds: {
      listing: "Annonce à valider",
      case: "Dossier",
      report: "Signalement",
    },
    since: (wait: string) => `En attente depuis ${wait}`,
    emptyTitle: "Rien à traiter",
    emptyText: "Aucune annonce, aucun dossier ni aucun signalement n'attend l'équipe.",
  },
  later: "Offres et déclencheurs de montée en gamme s'ajouteront ici avec leurs écrans.",
  error: "Une partie du tableau de bord n'a pas pu être chargée.",
  retry: "Réessayer",
} as const;
