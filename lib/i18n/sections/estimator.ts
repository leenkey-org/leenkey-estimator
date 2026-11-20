// Texts of the interface, part « estimator » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-13b: from the result of the wizard to the creation of the listing.

export const frEstimator = {
  listing: {
    title: "Mettre votre bien en vente",
    text: "Créez votre annonce : nous reprenons l'adresse, les caractéristiques et la valeur de cette analyse.",
    action: "Créer mon annonce",
  },
  // Names without visible text (L1-44): the buttons of the dialog
  // « Prendre contact », the surface slider, the state of a next step.
  contactDialog: { back: "Retour", close: "Fermer" },
  surfaceSlider: "Surface habitable",
  // Under the contact form of the wizard: how long an analysis made without
  // an account is kept, with the way to the privacy policy.
  contactStep: {
    retention: {
      before: "Sans compte, votre analyse de valeur est conservée 12 mois. Voir notre ",
      link: "politique de confidentialité",
      after: ".",
    },
  },
  nextStep: { done: "Fait :", todo: "À faire :" },
} as const;
