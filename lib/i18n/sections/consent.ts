// Texts of the interface, part « consent » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// Cookie consent banner (L1-37, Q23).

import { of } from "./helpers";

export const frConsent = {
  title: "Cookies",
  // Short paragraphs (P-06): the banner is never the largest paint of a page.
  text: "Nous utilisons des cookies de mesure d'audience (Google Analytics) pour comprendre comment le site est utilisé et l'améliorer, uniquement si vous l'acceptez.",
  necessary: "Les cookies nécessaires au fonctionnement du site restent actifs.",
  textMore: "Vous pouvez changer d'avis à tout moment avec « Gérer mes cookies », en bas de page.",
  policy: "Politique cookies",
  accept: "Accepter",
  refuse: "Refuser",
  customize: "Personnaliser",
  panelTitle: "Vos préférences",
  necessaryTitle: "Nécessaires",
  necessaryText:
    "Connexion à votre compte, sécurité, mémorisation de vos choix, reprise de votre analyse de valeur, comptage des visites des annonces. Toujours actifs.",
  analyticsLabel: "Mesure d'audience",
  analyticsText: "Statistiques de visite avec Google Analytics, par Google Tag Manager.",
  save: "Enregistrer mes choix",
} as const;
