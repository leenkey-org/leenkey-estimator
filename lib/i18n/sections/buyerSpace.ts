// Texts of the interface, part « buyerSpace » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-25: the buyer home and their buying project (SPEC-V2 8.9, DESIGN.md 12.10).

export const frBuyerSpace = {
  home: {
    description: "Des biens vendus directement par leurs propriétaires. Sans frais d'agence.",
    error: "Une partie de votre espace n'a pas pu être chargée.",
    lastSearch: {
      title: "Reprendre votre dernière recherche ?",
      reading: "Votre dernière recherche, en cours de lecture",
      any: "Tous les biens",
      resume: "Reprendre",
      fresh: "Nouvelle recherche",
      newCount: (count: number) =>
        count >= 20
          ? "20 nouveaux biens et plus"
          : count > 1
            ? `${count} nouveaux biens`
            : "1 nouveau bien",
    },
    start: {
      title: "Trouvez le bien qui vous ressemble",
      text: "Parcourez les biens à vendre et gardez vos préférés d'un cœur.",
      action: "Voir les biens",
    },
    file: {
      label: "Pour vous",
      title: "Votre dossier fait la différence auprès des vendeurs",
      count: (done: number, total: number) => `${done}/${total}`,
      countLabel: (done: number, total: number) =>
        done > 1 ? `${done} étapes sur ${total} faites` : `${done} étape sur ${total} faite`,
      heading: "Votre dossier acquéreur",
      items: {
        project: "Votre projet et vos villes",
        financing: "Votre financement déclaré",
      },
      states: { done: "Fait", current: "À faire maintenant", todo: "À faire" },
      text: "Un vendeur répond plus volontiers à un acquéreur dont le projet est clair. Il voit le statut de votre dossier ; vos montants n'apparaissent que dans les offres que vous envoyez.",
      complete: "Compléter mon dossier",
      edit: "Modifier mon projet",
    },
    favorites: {
      title: "Vos favoris",
      all: (count: number) => (count > 1 ? `Voir les ${count} favoris` : "Voir mon favori"),
      empty: "Pas encore de favori. Le cœur d'une annonce l'ajoute ici.",
    },
    conversations: {
      title: "Vos conversations",
      all: "Toutes les conversations",
      empty: "Pas encore de conversation. Écrivez au vendeur depuis une annonce.",
    },
    services: {
      title: "Nos services",
      valuation: "Valoriser mon bien",
    },
  },
  profile: {
    metaTitle: "Mon projet d'achat · Leenkey",
    title: "Mon projet d'achat",
    back: "Espace acquéreur",
    formTitle: "Votre recherche et votre financement",
    status: "Votre dossier de financement",
    declaredRule:
      "Projet, budget, apport et besoin de prêt renseignés : votre dossier passe à « Informations déclarées ».",
    note: "Le vendeur voit le statut de votre dossier de financement (déclaré, justificatif fourni, justificatif vérifié). Il ne voit ni votre justificatif ni les montants de votre profil. Les montants figurent uniquement dans les offres que vous choisissez d'envoyer.",
    project: "Votre projet",
    projects: {
      residence_principale: "Résidence principale",
      residence_secondaire: "Résidence secondaire",
      investissement: "Investissement",
    },
    cities: "Villes recherchées",
    citiesHelp: "Séparez les villes par une virgule, 20 au plus.",
    budget: "Budget maximum",
    downPayment: "Apport personnel",
    loan: "Financement",
    loanOptions: { yes: "Avec prêt", no: "Sans prêt" },
    loanAmount: "Montant du prêt",
    situation: "Votre situation",
    situationHelp: (count: string, max: string) =>
      `Facultatif, ${count} sur ${max} caractères. Par exemple : couple, un enfant, CDI tous les deux.`,
    save: "Enregistrer",
    saved: "Votre projet est enregistré.",
    errors: {
      amount: "Indiquez un montant en euros, sans centimes.",
      cities: "20 villes au plus, de 80 caractères chacune.",
      situation: "280 caractères au plus.",
      generic: "Votre projet n'a pas pu être enregistré. Réessayez dans un instant.",
      signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
      loadError: "Votre projet n'a pas pu être chargé.",
    },
  },
} as const;
