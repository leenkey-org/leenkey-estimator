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

  // What follows an offer for its buyer (SPEC-V2 13, « Côté acquéreur : suivi
  // et retrait de l'offre »): three states, the texts of the SPEC word for
  // word. Never a legal conclusion, never a button to withdraw once accepted.
  followUp: {
    withdraw: "Retirer mon offre",
    withdrawDialog: {
      title: "Retirer votre offre ?",
      description:
        "Vous êtes sur le point de retirer votre offre. Le vendeur en sera immédiatement informé et votre retrait sera enregistré dans Leenkey.",
      confirm: "Retirer mon offre",
      back: "Retour",
      close: "Fermer",
      cancel: "Annuler",
    },
    withdrawnOn: (date: string) => `Offre retirée le ${date}.`,
    declined: "Le vendeur a refusé cette offre.",
    expired: "Offre expirée : le vendeur ne peut plus l'accepter.",
    newOffer: "Faire une nouvelle offre",
    /** While the offer waits: a change is a new offer. */
    newOfferToChange:
      "Pour modifier un élément de votre offre, faites-en une nouvelle : elle reprend son contenu et remplace celle-ci à son envoi.",
    /** Once it is over (declined, expired, withdrawn). */
    newOfferAgain:
      "Vous pouvez faire une nouvelle offre sur ce bien : elle reprend le contenu de celle-ci.",
    accepted: {
      title: "Vous souhaitez renoncer à votre projet ?",
      text: "Votre offre a déjà été acceptée par le vendeur. Les conséquences dépendent de votre situation et de l'avancement de la transaction. Contactez le vendeur et votre notaire avant toute démarche.",
    },
    precontract: {
      title: "Avant-contrat",
      signedOn: (date: string) => `Avant-contrat signé le ${date}.`,
      periodEnd: (date: string) => `Délai légal de rétractation de 10 jours : jusqu'au ${date}.`,
      indicative: "Date indicative. Votre notaire fait foi.",
      unknownStart:
        "Le point de départ de votre délai de rétractation dépend de la date de notification ou de remise de l'avant-contrat. Votre notaire peut vous l'indiquer.",
    },
    errors: {
      generic: "Votre demande n'a pas pu être enregistrée. Réessayez.",
      signedOut: "Votre session a expiré. Reconnectez-vous pour continuer.",
      expired: "Cette offre a expiré : elle ne peut plus être retirée.",
      answered: "Cette offre n'est plus en cours : elle a reçu une réponse ou a déjà été retirée.",
      closed: "Une nouvelle offre n'est pas possible sur ce bien pour le moment.",
    },
    // The offers of the buyer, on their home (docs/DESIGN.md 12.10).
    list: {
      title: "Vos offres",
      label: "Vos offres d'achat",
      open: "Voir l'offre",
      resume: "Reprendre",
      detail: (price: string | null, date: string | null) =>
        [price, date].filter((part) => part !== null).join(" · "),
      sentOn: (date: string) => `envoyée le ${date}`,
      draft: "brouillon non envoyé",
      /** A draft whose listing is no longer online. */
      offline: "Annonce hors ligne",
      about: (title: string) => `offre sur ${title}`,
      loadError: "Vos offres n'ont pas pu être chargées. Rechargez la page.",
    },
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

  // The summary of an offer for its seller (SPEC-V2 13, « Synthèse pour le
  // vendeur »): built from templates, never by a model; never an advice to
  // accept or to decline. On the screen only, never in the document.
  synthesis: {
    asking: "Prix demandé",
    offer: "Offre reçue",
    gap: "Écart",
    noGap: "Aucun",
    financing: "Financement déclaré",
    downPayment: (amount: string) => `Apport : ${amount}`,
    loan: (amount: string) => `Prêt envisagé : ${amount}`,
    noLoan: "Sans recours à un prêt immobilier",
    proof: "Justificatif financement",
    proofProvided: "Document fourni",
    proofChecked: (date: string) => `Contrôlé par Leenkey le ${date}`,
    proofNone: "Aucun document fourni",
    analysis: "Analyse Leenkey",
    // The gap in percent, or in euros when it is under 0,1 %.
    below: (gap: string) => `L'offre est inférieure de ${gap} au prix demandé.`,
    above: (gap: string) => `L'offre est supérieure de ${gap} au prix demandé.`,
    equal: "L'offre est égale au prix demandé.",
    withLoan: (downPayment: string) =>
      `L'acquéreur déclare financer l'acquisition avec ${downPayment} d'apport et un prêt.`,
    withLoanOnly: "L'acquéreur déclare financer l'acquisition avec un prêt, sans apport.",
    withoutLoan: "L'acquéreur déclare financer l'acquisition sans recours à un prêt immobilier.",
    proofCheckedSentence: "Un justificatif de financement a été fourni et contrôlé par Leenkey.",
    proofProvidedSentence:
      "Un justificatif de financement a été fourni ; Leenkey ne l'a pas encore contrôlé.",
    proofNoneSentence: "Aucun justificatif de financement n'a été fourni.",
    conditions: (list: string) => `L'offre mentionne également ${list}.`,
    conditionNames: {
      priorSale: "une vente préalable d'un autre bien",
      authorization: "l'obtention d'une autorisation particulière",
      other: "une autre situation à préciser",
    },
    and: "et",
    last: "Avant de prendre votre décision, vérifiez notamment le prix proposé, les modalités de financement et les conditions indiquées.",
  },

  // The offer as its seller reads it and answers it (SPEC-V2 13, « Côté
  // vendeur », « Acceptation par le vendeur »).
  seller: {
    metaTitle: "Offre reçue",
    title: "Offre reçue",
    received: "Nouvelle offre reçue",
    from: (name: string, city: string) => (city ? `${name}, ${city}` : name),
    remaining: {
      days: (days: number) => (days > 1 ? `${days} jours` : "1 jour"),
      hours: (hours: number) => (hours > 1 ? `${hours} heures` : "1 heure"),
      // « 2 jours restants », « 1 heure restante », « 4 jours et 7 heures restantes ».
      daysLeft: (duration: string, plural: boolean) =>
        `${duration} ${plural ? "restants" : "restant"}`,
      hoursLeft: (duration: string, plural: boolean) =>
        `${duration} ${plural ? "restantes" : "restante"}`,
      and: "et",
      lessThanAnHour: "Moins d'une heure restante",
    },
    expiredOn: (date: string) => `Offre expirée le ${date}`,
    masked:
      "Avant acceptation, vous voyez le nom, le prénom et la ville de l'acquéreur. Ses coordonnées complètes vous sont communiquées une fois l'offre acceptée.",
    accept: "Accepter l'offre",
    decline: "Refuser l'offre",
    discuss: "Discuter avec l'acquéreur",
    full: "Voir l'offre complète",
    pdf: "Télécharger le PDF",
    state: {
      accepted: (date: string) => `Vous avez accepté cette offre le ${date}.`,
      declined: (date: string) => `Vous avez refusé cette offre le ${date}.`,
      withdrawn: (date: string) => `L'acquéreur a retiré cette offre le ${date}.`,
      expired: (date: string) =>
        `Cette offre a expiré le ${date} : vous ne pouvez plus l'accepter.`,
      superseded: "L'acquéreur a remplacé cette offre par une nouvelle.",
    },
    declineDialog: {
      title: "Refuser cette offre ?",
      description: "L'acquéreur sera informé de votre refus. Vous pouvez lui laisser un message.",
      message: "Message à l'acquéreur",
      count: (count: string, max: string) => `${count} / ${max}`,
      confirm: "Refuser l'offre",
      back: "Retour",
      close: "Fermer",
      cancel: "Annuler",
    },
    acceptScreen: {
      metaTitle: "Accepter l'offre",
      header: "Accepter l'offre",
      title: "Vous êtes sur le point d'accepter cette offre",
      price: "Prix proposé",
      buyer: "Acquéreur",
      financing: "Financement",
      financingLabels: {
        loanAndDownPayment: "prêt + apport",
        loan: "prêt",
        noLoan: "sans prêt",
      },
      validity: "Validité",
      until: (date: string) => `jusqu'au ${date}`,
      warning: [
        "L'acceptation d'une offre d'achat peut produire des conséquences juridiques. Prenez connaissance de l'intégralité de l'offre avant de confirmer.",
        "En cas de doute, contactez votre notaire ou un conseiller Leenkey avant de poursuivre.",
      ],
      advisor: "Écrire à mon conseiller Leenkey",
      plans: "Voir les formules avec un conseiller Leenkey",
      confirmRead: "J'ai lu l'intégralité de l'offre et souhaite confirmer mon acceptation.",
      confirm: "Confirmer mon acceptation",
      back: "Revenir à l'offre",
    },
    errors: {
      generic: "Votre réponse n'a pas pu être enregistrée. Réessayez.",
      signedOut: "Votre session a expiré. Reconnectez-vous pour continuer.",
      expired: "Cette offre a expiré : elle ne peut plus être acceptée ni refusée.",
      answered:
        "Cette offre n'attend plus de réponse : elle a été retirée, remplacée ou a déjà reçu la vôtre.",
      offSale: "Votre annonce n'est plus en vente : cette offre ne peut pas être acceptée.",
      tooLong: "Votre message dépasse 1 000 caractères.",
    },
    history: {
      title: "Historique",
      events: {
        created: "Brouillon créé",
        submitted: "Offre envoyée",
        viewed: "Offre consultée par le vendeur",
        accepted: "Offre acceptée par le vendeur",
        declined: "Offre refusée par le vendeur",
        withdrawn: "Offre retirée par l'acquéreur",
        expired: "Offre expirée",
        superseded: "Offre remplacée par une nouvelle",
        pdf_generated: "Document généré",
        precontract_recorded: "Avant-contrat enregistré",
      },
      message: (text: string) => `Message du vendeur : « ${text} »`,
    },
    tab: {
      metaTitle: "Offres",
      title: "Offres reçues",
      empty:
        "Aucune offre reçue pour ce bien. Dès qu'un acquéreur en envoie une, elle apparaît ici.",
      version: (version: number) => `Version ${version}`,
      receivedOn: (date: string) => `Reçue le ${date}`,
      open: "Voir l'offre",
      loadError: "Les offres de ce bien n'ont pas pu être chargées. Rechargez la page.",
    },
    // The avant-contrat of an accepted offer, recorded by its seller (SPEC-V2
    // 13, Q7): its date and, when known, the day it was notified or handed to
    // the buyer, from which an indicative end of the withdrawal period is read.
    precontract: {
      title: "Avant-contrat",
      intro:
        "Une fois l'avant-contrat signé (promesse ou compromis de vente), enregistrez sa date. L'acquéreur la lit sur son offre.",
      signedAt: "Date de signature de l'avant-contrat",
      notifiedAt: "Date de notification ou de remise de l'avant-contrat à l'acquéreur",
      notifiedAtHelp:
        "Si vous la connaissez. Elle sert à indiquer une date indicative de fin du délai légal de rétractation de l'acquéreur.",
      save: "Enregistrer",
      edit: "Modifier",
      cancel: "Annuler",
      saved: "Avant-contrat enregistré.",
      signedOn: (date: string) => `Avant-contrat signé le ${date}.`,
      notifiedOn: (date: string) => `Notifié ou remis à l'acquéreur le ${date}.`,
      periodEnd: (date: string) => `Fin du délai légal de rétractation de l'acquéreur : ${date}.`,
      indicative:
        "Date indicative calculée à partir de la date que vous avez renseignée. Votre notaire fait foi.",
      errors: {
        signedAt: "Indiquez une date entre le jour de l'acceptation de l'offre et aujourd'hui.",
        notifiedAt: "Indiquez une date entre la signature de l'avant-contrat et aujourd'hui.",
        generic: "L'avant-contrat n'a pas pu être enregistré. Réessayez.",
        signedOut: "Votre session a expiré. Reconnectez-vous pour continuer.",
        closed: "Cette offre n'est plus acceptée : l'avant-contrat ne peut pas être enregistré.",
      },
    },
    dashboard: {
      title: "Offres en attente de votre réponse",
      loadError: "Vos offres reçues n'ont pas pu être chargées. Rechargez la page.",
    },
    /** The offer an action is about, for a screen reader (several cards on a page). */
    about: (reference: string) => `offre ${reference}`,
  },

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
