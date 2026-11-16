// Texts of the interface, part « upgrade » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L2-09: the upgrade prompts (SPEC-V2 section 11 bis). The sentences are the
// ones of the SPEC, word for word; the titles are ours (DESIGN 10.4).

export const frUpgrade = {
  dismiss: "Masquer cette proposition",
  action: "Voir l'accompagnement",
  passTo: (plan: string, price: string) => `Passer à ${plan}\u00A0: +${price}`,
  prompts: {
    offer_accepted: {
      title: "Préparer la suite jusqu'au notaire",
      text: "Votre offre est acceptée. La prochaine étape consiste à constituer et transmettre votre dossier au notaire. Vous pouvez continuer seul ou confier à Leenkey la préparation et le suivi de votre dossier jusqu'à la signature.",
    },
    offer_received: {
      title: "Être accompagné sur cette offre",
      text: (price: string, asking: string) =>
        `Vous avez reçu une offre de ${price} pour un prix affiché de ${asking}. Vous pouvez la traiter vous-même ou demander à un conseiller Leenkey de l'analyser avec vous et de vous accompagner dans votre négociation.`,
    },
    visits_no_offer: {
      title: "Analyser les retours de visite",
      text: "Plusieurs visites ont déjà eu lieu sans offre. Un conseiller Leenkey peut analyser avec vous les retours et votre positionnement.",
    },
    contacts_no_visit: {
      title: "Faire le point sur votre annonce",
      text: "Vous recevez des contacts mais peu de demandes de visite. Faisons le point sur votre annonce et votre stratégie.",
    },
    low_contacts: {
      title: "Faire le point sur votre prix",
      text: "Votre annonce génère peu de demandes. Faites le point sur votre prix et votre stratégie avec un conseiller Leenkey.",
    },
    file_incomplete: {
      title: "Constituer votre dossier de vente",
      text: "Plusieurs documents sont encore nécessaires pour préparer votre vente. Leenkey peut constituer et suivre votre dossier avec vous jusqu'au notaire.",
    },
    listing_ready: {
      title: "Faire relire votre annonce",
      text: "Votre annonce est prête. Vous souhaitez faire vérifier votre prix, votre présentation et votre annonce par un conseiller Leenkey\u00A0?",
    },
    valuation_done: {
      title: "Définir votre prix de mise en vente",
      text: "Vous connaissez maintenant la valeur de votre bien. Besoin d'aide pour définir votre prix et votre stratégie de mise en vente\u00A0?",
    },
  },
  // The measure of the back office (SPEC 11 bis), on its dashboard.
  admin: {
    title: "Propositions de formule",
    period: (days: number) => `${days}\u00A0derniers jours`,
    trigger: "Déclencheur",
    shown: "Affichées",
    clicked: "Ouvertes",
    dismissed: "Masquées",
    converted: "Formule commandée sous 7\u00A0jours",
    empty: "Aucune proposition affichée sur la période.",
    error: "Les propositions n'ont pas pu être chargées.",
    names: {
      offer_accepted: "Offre acceptée",
      offer_received: "Offre reçue",
      visits_no_offer: "Visites sans offre",
      contacts_no_visit: "Contacts sans visite",
      low_contacts: "Peu de contacts",
      file_incomplete: "Dossier incomplet",
      listing_ready: "Annonce prête",
      valuation_done: "Valorisation faite",
    },
  },
} as const;
