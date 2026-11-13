// Texts of the interface, part « offer » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L2-03: the purchase offer (SPEC-V2 13). The texts of the model of Cédric of
// 2026-10-05 (docs/client/modele-offre-cedric-2026-10-05.md) are taken word
// for word: do not reword them. The document (`document`) is what the screen
// and the PDF show; it never carries a status of qualification (never
// « vérifié », never « validé »), the gap to the asking price, nor a summary.

export const frOffer = {
  metaTitle: "Faire une offre",
  header: {
    title: "Faire une offre",
    backToListing: "Retour à l'annonce",
    previousStep: "Étape précédente",
  },
  step: (index: number, name: string) => `Étape ${index} sur 7 · ${name}`,
  steps: {
    buyer: "L'acquéreur",
    property: "Le bien concerné",
    price: "Mon offre",
    financing: "Financement",
    conditions: "Conditions de l'offre",
    validity: "Durée de validité",
    declarations: "Déclarations et envoi",
  },
  reviewStep: "Relecture de votre offre",
  previous: "Précédent",
  next: "Continuer",
  reference: (reference: string) => `Offre ${reference}`,
  replaces:
    "Vous avez déjà une offre en cours sur ce bien. Quand vous enverrez celle-ci, elle la remplacera.",
  errors: {
    generic: "Votre offre n'a pas pu être enregistrée. Réessayez.",
    signedOut: "Votre session a expiré. Reconnectez-vous pour continuer.",
    closed: "Cette annonce n'accepte plus d'offre pour le moment.",
    invalid: "Vérifiez les champs signalés.",
    required: "Ce champ est obligatoire.",
    characters:
      "Ce texte contient des caractères qui ne peuvent pas figurer dans l'offre. Écrivez-le en lettres latines.",
    tooLong: "Ce texte est trop long.",
  },

  // What stops an offer before the form (SPEC 13, prerequisites).
  blocked: {
    undeclared: {
      title: "Renseignez d'abord votre projet d'achat",
      text: "Pour faire une offre, indiquez votre projet, votre budget, votre apport et votre besoin de prêt. Cela prend deux minutes.",
      action: "Renseigner mon projet d'achat",
    },
    accepted: {
      title: "Votre offre sur ce bien a été acceptée",
      text: "Le vendeur a accepté votre offre. Vous ne pouvez pas en faire une nouvelle sur ce bien.",
      action: "Voir mon offre",
    },
    unavailable: {
      title: "Cette page n'a pas pu être chargée",
      text: "Réessayez dans un instant.",
      action: "Réessayer",
    },
  },

  buyer: {
    title: "L'acquéreur",
    intro: "Ces informations figurent dans votre offre. Vérifiez-les avant de continuer.",
    lastName: "Nom",
    firstName: "Prénom",
    birthDate: "Date de naissance",
    addressLine: "Adresse",
    addressLineHelp: "Numéro et rue.",
    postalCode: "Code postal",
    city: "Ville",
    email: "E-mail",
    phone: "Téléphone",
    coBuyer: (index: number) => `Co-acquéreur ${index}`,
    addCoBuyer: "Ajouter un co-acquéreur",
    removeCoBuyer: "Retirer ce co-acquéreur",
    mode: "Acquisition envisagée",
    modes: {
      own_name: "En nom propre",
      joint: "À deux / indivision",
      sci: "SCI",
      other: "Autre",
    },
    modeOther: "Précisez",
    sci: {
      name: "Dénomination de la SCI",
      status: "État de la SCI",
      statuses: {
        registered: "SCI déjà constituée",
        in_formation: "SCI en cours de constitution",
      },
      statusPlaceholder: "Choisir",
      siren: "SIREN",
      sirenHelp: "9 chiffres.",
      seatAddress: "Adresse du siège social",
      representative: "Représentant",
    },
    errors: {
      birthDate: "Indiquez une date de naissance valide.",
      email: "Indiquez une adresse e-mail valide.",
      phone: "Indiquez un numéro de téléphone valide.",
      coBuyers: "Pour une acquisition à deux ou en indivision, ajoutez au moins un co-acquéreur.",
      siren: "Le SIREN compte 9 chiffres.",
    },
  },

  property: {
    title: "Le bien concerné",
    note: "Repris de l'annonce, non modifiable",
    address: "Adresse",
    type: "Type",
    surface: "Surface déclarée",
    annexes: "Annexes comprises",
    noAnnex: "Aucune",
    reference: "Référence annonce Leenkey",
    annex: {
      parking: "Parking",
      cellar: "Cave",
      garden: "Jardin",
      balcony: "Balcon",
      terrace: "Terrasse",
    },
  },

  price: {
    title: "Mon offre",
    price: "Prix proposé",
    asking: "Prix affiché",
    offer: "Offre",
    gap: "Écart",
    noGap: "Aucun",
    errors: {
      price: "Indiquez un prix en euros, sans centimes.",
      tooHigh: "Ce prix est trop élevé : vérifiez-le.",
    },
  },

  financing: {
    title: "Financement",
    question: "Comment financez-vous votre acquisition ?",
    modes: {
      loan: { title: "Avec prêt", hint: "Avec recours à un prêt immobilier" },
      no_loan: { title: "Sans prêt", hint: "Sans recours à un prêt immobilier" },
    },
    declared: "Déclaré par l'acquéreur",
    downPayment: "Apport personnel",
    loanAmount: "Montant prévisionnel du prêt",
    loanDuration: "Durée envisagée",
    years: "ans",
    loanRate: "Taux maximal envisagé",
    lender: "Établissement bancaire ou courtier",
    progress: "Situation du financement",
    progressPlaceholder: "Choisir",
    progressOptions: {
      not_presented: "Projet non encore présenté",
      simulation_done: "Simulation réalisée",
      broker_consulted: "Courtier consulté",
      agreement_in_principle: "Accord de principe obtenu",
      other: "Autre",
    },
    progressOther: "Précisez",
    budget: {
      title: "Budget global estimé du projet",
      price: "Prix proposé",
      fees: (rate: string) => `Frais d'acquisition indicatifs (${rate})`,
      total: "Budget global estimé",
      note: "Estimation indicative des frais d'acquisition. Le montant exact dépend du bien et du régime applicable : votre notaire vous le précisera.",
      compare: (funds: string, total: string) =>
        `Votre apport et votre prêt représentent ${funds} pour un budget global estimé à ${total}.`,
    },
    document: "Justificatif",
    checked: "Justificatif vérifié par Leenkey",
    errors: {
      mode: "Indiquez comment vous financez votre acquisition.",
      amount: "Indiquez un montant en euros, sans centimes.",
      loanAmount: "Indiquez le montant du prêt envisagé.",
      duration: "Indiquez une durée de 1 à 40 ans.",
      rate: "Indiquez un taux, par exemple 3,85.",
      progress: "Indiquez la situation de votre financement.",
    },
  },

  conditions: {
    title: "Conditions de l'offre",
    warning:
      "Attention : les conditions juridiques définitives de la vente seront déterminées avec le ou les notaires lors de la préparation de l'avant-contrat. Une information renseignée ici ne remplace pas la rédaction d'une condition suspensive adaptée par le professionnel chargé de l'acte.",
    warningLoan:
      "Pour un achat financé par prêt, la condition suspensive de financement devra notamment être correctement reprise dans l'avant-contrat.",
    financing: "Financement",
    mention: {
      loan: "Offre formulée avec recours à un prêt immobilier.",
      no_loan: "Offre formulée sans recours à un prêt immobilier.",
    },
    others: "Autres éléments à porter à la connaissance du vendeur",
    priorSale: "Vente préalable d'un autre bien",
    authorization: "Obtention d'une autorisation particulière",
    other: "Autre situation à préciser",
    details: "Précisions",
    count: (count: string, max: string) => `${count} / ${max}`,
    errors: {
      details: "Précisez la situation.",
      tooLong: "Vos précisions dépassent 500 caractères.",
    },
  },

  validity: {
    title: "Durée de validité",
    duration: "Votre offre est valable",
    days: (days: number) => `${days} jours`,
    until: (date: string) => `La présente offre est valable jusqu'au : ${date}`,
    help: "Passé ce délai, votre offre expire : le vendeur ne peut plus l'accepter.",
    errors: {
      range: "La validité d'une offre va de 2 à 10 jours. Choisissez-la de nouveau.",
    },
  },

  declarations: {
    title: "Déclarations et envoi",
    notice: {
      title: "Avant d'envoyer votre offre",
      paragraphs: [
        "Une offre d'achat n'est pas une simple manifestation d'intérêt. Elle formalise votre volonté d'acquérir le bien aux conditions indiquées et peut produire des effets juridiques lorsqu'elle est acceptée par le vendeur.",
        "Leenkey facilite la création, la transmission et la compréhension de l'offre mais ne se substitue pas au notaire ou à un professionnel du droit.",
        "Aucun versement n'est demandé ou encaissé par Leenkey au titre de cette offre d'achat.",
      ],
    },
    visit: "Visite du bien",
    visited: { title: "Bien visité", hint: "Je confirme avoir visité le bien" },
    notVisited: { title: "Sans visite", hint: "Je formule mon offre sans visite préalable" },
    visitedText: "Je confirme avoir visité le bien",
    notVisitedText: "Je formule mon offre sans visite préalable",
    accuracy: "Je confirme l'exactitude des informations que j'ai renseignées.",
    priceAndFinancingChecked:
      "J'ai vérifié le prix proposé et les modalités de financement indiquées.",
    legalEffectsUnderstood:
      "J'ai compris que cette offre constitue une démarche susceptible de produire des effets juridiques en cas d'acceptation.",
    infoRead:
      "J'ai lu les informations relatives au fonctionnement de l'offre d'achat sur Leenkey.",
    infoLink: "Lire ces informations",
    review: "Relire mon offre",
    errors: {
      visit: "Indiquez si vous avez visité le bien.",
      all: "Cochez les quatre déclarations pour relire votre offre.",
    },
  },

  review: {
    title: "Relisez votre offre",
    intro:
      "Voici le document tel que le vendeur le recevra. Une fois envoyée, votre offre ne peut plus être modifiée.",
    send: "Envoyer mon offre au vendeur",
    edit: "Modifier",
    errors: {
      incomplete: "Votre offre est incomplète. Reprenez les étapes pour la compléter.",
      validity:
        "La date de validité de votre offre n'est plus comprise entre 2 et 10 jours. Choisissez-la de nouveau.",
    },
  },

  // The page of an offer, for its buyer.
  page: {
    metaTitle: "Mon offre d'achat",
    title: "Votre offre d'achat",
    sent: "Votre offre a été envoyée au vendeur.",
    sentOn: (date: string) => `Envoyée le ${date}`,
    validUntil: (date: string) => `Valable jusqu'au ${date}`,
    expiredOn: (date: string) => `Expirée le ${date}`,
    version: (version: number) => `Version ${version}`,
    pdf: "Télécharger le PDF",
    listing: "Voir l'annonce",
    superseded: "Vous avez remplacé cette offre par une nouvelle.",
    newer: "Voir la nouvelle offre",
    loadError: "Votre offre n'a pas pu être chargée. Réessayez dans un instant.",
  },

  status: {
    draft: "Brouillon",
    submitted: "Envoyée",
    viewed: "Consultée",
    accepted: "Acceptée",
    declined: "Refusée",
    expired: "Expirée",
    withdrawn: "Retirée",
    superseded: "Remplacée",
  },

  listing: { action: "Faire une offre" },

  // The document of the offer, on the screen and in the PDF.
  document: {
    title: "OFFRE D'ACHAT LEENKEY",
    reference: (reference: string) => `Référence de l'offre : ${reference}`,
    version: (version: number) => `Version : ${version}`,
    issued: (date: string) => `Date et heure d'émission : ${date}`,
    notIssued: "Date et heure d'émission : à l'envoi de l'offre",
    sections: {
      buyer: "L'acquéreur",
      property: "Le bien concerné",
      price: "Mon offre",
      financing: "Financement de l'acquisition",
      conditions: "Conditions de l'offre",
      validity: "Durée de validité",
      declarations: "Déclaration de l'acquéreur",
    },
    coBuyer: (index: number) => `Co-acquéreur ${index}`,
    mode: "Acquisition envisagée",
    modeOther: (text: string) => `Autre : ${text}`,
    sci: {
      name: "Dénomination",
      status: "État",
      siren: "SIREN",
      seatAddress: "Siège social",
      representative: "Représentant",
    },
    undersigned: (name: string) =>
      `Je soussigné(e) ${name} formule une offre d'achat portant sur le bien désigné ci-dessus au prix de :`,
    undersignedMany: (names: string) =>
      `Nous soussignés ${names} formulons une offre d'achat portant sur le bien désigné ci-dessus au prix de :`,
    and: "et",
    priceReserve:
      "Le prix proposé s'entend sous réserve des conditions et modalités indiquées dans la présente offre.",
    financingQuestion: "Mode de financement",
    financingModes: {
      loan: "Avec recours à un prêt immobilier",
      no_loan: "Sans recours à un prêt immobilier",
    },
    declaredByBuyer: "Informations déclarées par l'acquéreur.",
    lender: "Établissement bancaire / courtier",
    years: (years: number) => `${years} ans`,
    progressOther: (text: string) => `Autre : ${text}`,
    noOther: "Aucun autre élément signalé.",
    validUntil: (date: string) => `La présente offre est valable jusqu'au : ${date}`,
    acceptedAt: (date: string) => `Déclarations acceptées le ${date}.`,
    at: "à",
    footer: (reference: string, version: number) => `${reference} · version ${version}`,
    page: (page: number, total: number) => `Page ${page} sur ${total}`,
    fileName: (reference: string, version: number) => `offre-${reference}-v${version}.pdf`,
  },
} as const;
