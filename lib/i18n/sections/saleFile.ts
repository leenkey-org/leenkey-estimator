// The sale file (L3-04, SPEC-V2 15): the tab « Documents » of a property, the
// documents shared with a buyer. Leenkey never says a diagnostic is or is
// not due (Cédric, 2026-11-09): the list is a help. The categories, the
// stages and the names of the documents are those of Cédric (2026-11-22,
// DECISIONS.md 2026-11-23).
export const frSaleFile = {
  types: {
    dpe: "DPE",
    amiante: "Diagnostic amiante",
    plomb: "Diagnostic plomb",
    electricite: "Diagnostic électricité",
    gaz: "Diagnostic gaz",
    termites: "État relatif aux termites",
    erp: "État des risques (ERP)",
    carrez: "Mesurage loi Carrez",
    assainissement: "Diagnostic assainissement",
    titre_propriete: "Titre de propriété",
    taxe_fonciere: "Taxe foncière",
    certificat_urbanisme: "Certificat d'urbanisme ou bornage",
    pv_ag: "PV des assemblées générales des 3 dernières années",
    reglement_copro: "Règlement de copropriété et état descriptif de division",
    appel_charges: "Informations financières et charges de copropriété",
    carnet_entretien: "Carnet d'entretien",
    fiche_synthetique: "Fiche synthétique de copropriété",
    plan_pluriannuel_travaux: "Plan pluriannuel de travaux",
    pre_etat_date: "Pré-état daté",
    etat_date: "État daté fourni par le syndic",
    facture_travaux: "Factures et justificatifs de travaux",
    autre: "Documents complémentaires",
  },
  categories: {
    property: "Documents du bien",
    coownership: "Documents de copropriété",
    notary: "Documents pour le notaire",
  },
  // When a document is needed: on each line, and to filter the list.
  stages: {
    listing: "Dès la mise en vente",
    agreement: "Avant le compromis",
    deed: "Avant la signature",
  },
  seller: {
    metaTitle: "Documents",
    title: "Documents",
    intro:
      "Rassemblez ici les pièces de votre vente. Vous choisissez ce que vous partagez, et avec qui : un acquéreur ne voit un document que si vous le partagez avec lui.",
    disclaimer:
      "Cette liste est une aide : les pièces à fournir dépendent de votre bien. Faites-la confirmer par votre diagnostiqueur certifié et votre notaire.",
    // Under the count of the notary file, when a document is asked for after it.
    notaryScope:
      "Le dossier notaire compte les pièces à réunir avant le compromis. L'état daté vient ensuite, avant la signature.",
    stagesTitle: "Les étapes de votre dossier",
    stagesIntro:
      "Vous n'avez pas à tout réunir d'emblée : chaque pièce est demandée au moment où elle sert.",
    stageStates: { done: "Complet", current: "En cours", todo: "À venir" },
    stageProgress: (done: number, total: number) =>
      `${done} sur ${total} ${total > 1 ? "pièces" : "pièce"}`,
    // The documents to file of a stage, three named at most: « DPE,
    // Diagnostic amiante, Diagnostic plomb et 4 autres ».
    missingNames: (names: readonly string[]) => {
      const more = names.length - 3;
      return more > 0
        ? `${names.slice(0, 3).join(", ")} et ${more} ${more > 1 ? "autres" : "autre"}`
        : names.join(", ");
    },
    // « maintenant » up to the agreement only: the « état daté » comes after it.
    stageMissing: (progress: string, names: string, now: boolean) =>
      `${progress} · ${now ? "À déposer maintenant" : "À déposer"} : ${names}`,
    categoryProgress: (done: number, total: number) => `${done} sur ${total}`,
    filter: { label: "Filtrer les pièces par étape", all: "Toutes" },
    // Under the title of a category.
    categoryHelp: {
      property:
        "Les diagnostics forment votre dossier de diagnostics techniques (DDT) : déposez-les un par un.",
      coownership:
        "Votre syndic vous remet la plupart de ces pièces. Si votre bien n'est pas en copropriété, indiquez « Non concerné ».",
    },
    // A word on a line, after the stage it is needed for.
    lineHelp: {
      carrez: "Pour un lot de copropriété.",
      plan_pluriannuel_travaux: "S'il existe.",
      appel_charges: "Vos appels de charges des 2 dernières années, par exemple.",
      autre: "Ce que votre notaire vous demande en plus (hors pièces d'identité).",
    },
    // Never filed on Leenkey: an information, no deposit (DECISIONS.md 2026-11-23).
    identity: {
      title: "À préparer pour votre notaire",
      text: "Pièces d'identité et situation des vendeurs (état civil, régime matrimonial). Ces pièces ne se déposent pas sur Leenkey : vous les remettez directement à votre notaire.",
    },
    loadError: "Les documents n'ont pas pu être chargés. Rechargez la page.",
    progress: (done: number, total: number) => `Dossier notaire : ${done} / ${total} pièces`,
    complete: "Dossier notaire complet",
    states: {
      filed: "Déposé",
      exempt: "Non concerné",
      missing: "À déposer",
      optional: "Facultatif",
    },
    optional: "En plus des pièces demandées",
    filedOn: (date: string) => `Déposé le ${date}`,
    open: "Ouvrir",
    openAbout: (title: string) => `Ouvrir ${title}`,
    remove: "Retirer",
    removeAbout: (title: string) => `Retirer ${title}`,
    removeDialog: {
      title: "Retirer ce document ?",
      description:
        "Il disparaît de votre dossier et les acquéreurs avec qui vous l'aviez partagé ne le voient plus.",
      confirm: "Retirer le document",
      back: "Retour",
      close: "Fermer",
      cancel: "Annuler",
    },
    reason: (reason: string) => `Motif : ${reason}`,
    exempt: {
      action: "Non concerné",
      actionAbout: (label: string) => `Non concerné : ${label}`,
      undo: "Annuler « Non concerné »",
      undoAbout: (label: string) => `Annuler « Non concerné » : ${label}`,
      title: (label: string) => `${label} : non concerné ?`,
      description:
        "Indiquez pourquoi ce document ne s'applique pas à votre bien. Il comptera comme présent dans votre dossier. En cas de doute, demandez à votre diagnostiqueur.",
      reasonLabel: "Motif",
      reasonHelp: "Par exemple : « Pas d'installation de gaz ».",
      confirm: "Enregistrer",
      back: "Retour",
      close: "Fermer",
      cancel: "Annuler",
      reasonError: "Indiquez un motif de 3 à 300 caractères.",
    },
    upload: {
      title: "Déposer un document",
      file: "Fichier",
      fileHelp: "PDF, JPEG ou PNG, 20 Mo au plus.",
      type: "Type de document",
      typePlaceholder: "Choisir",
      name: "Nom du document",
      nameHelp: "Tel que vous et les acquéreurs le verrez.",
      submit: "Déposer le document",
      sending: "Envoi du fichier…",
      added: "Document déposé.",
      errors: {
        auth: "Votre session a expiré. Reconnectez-vous.",
        invalid: "Choisissez un fichier, son type et son nom.",
        unsupported: "Ce fichier n'est pas un PDF, un JPEG ou un PNG lisible.",
        too_heavy: "Ce fichier dépasse 20 Mo.",
        unavailable: "Le document n'a pas pu être déposé. Réessayez.",
      },
    },
    requests: {
      title: "Demandes d'accès",
      asks: (name: string | null) =>
        name
          ? `${name} demande à consulter vos documents`
          : "Un acquéreur demande à consulter vos documents",
      grant: "Accorder",
      grantAbout: (name: string) => `Accorder l'accès à ${name}`,
      decline: "Refuser",
      declineAbout: (name: string) => `Refuser l'accès à ${name}`,
      grantHelp: "Accorder partage tous les documents de votre dossier avec cet acquéreur.",
      granted: (count: number) =>
        count > 1
          ? `${count} documents partagés.`
          : count === 1
            ? "1 document partagé."
            : "Accès accordé.",
      declined: "Demande refusée.",
      errors: {
        auth: "Votre session a expiré. Reconnectez-vous.",
        invalid: "Ça n'a pas fonctionné. Réessayez.",
        answered: "Cette demande a déjà reçu une réponse.",
        unavailable: "Ça n'a pas fonctionné. Réessayez.",
      },
    },
    share: {
      title: "Partager avec un acquéreur",
      empty:
        "Aucun acquéreur ne vous a encore écrit ni fait d'offre. Vous pourrez partager vos documents avec ceux qui le feront.",
      noDocument: "Déposez d'abord un document.",
      someone: "Un acquéreur",
      shared: (count: number, total: number) =>
        count === 0
          ? "Aucun document partagé"
          : `${count} ${count > 1 ? "documents partagés" : "document partagé"} sur ${total}`,
      all: "Partager tout le dossier",
      allAbout: (name: string) => `Partager tout le dossier avec ${name}`,
      diagnostics: "Partager les diagnostics",
      diagnosticsAbout: (name: string) => `Partager les diagnostics avec ${name}`,
      stop: "Ne plus rien partager",
      stopAbout: (name: string) => `Ne plus rien partager avec ${name}`,
      done: (count: number, name: string) =>
        count === 0
          ? `Ces documents sont déjà partagés avec ${name}.`
          : count === 1
            ? `1 document partagé avec ${name}.`
            : `${count} documents partagés avec ${name}.`,
      stopped: (name: string) => `Plus aucun document n'est partagé avec ${name}.`,
      errors: {
        auth: "Votre session a expiré. Reconnectez-vous.",
        invalid: "Ça n'a pas fonctionné. Réessayez.",
        noRelation: "Cet acquéreur ne vous a ni écrit ni fait d'offre sur ce bien.",
        unavailable: "Ça n'a pas fonctionné. Réessayez.",
      },
    },
    errors: { generic: "Ça n'a pas fonctionné. Réessayez." },
  },
  // L3-05 (SPEC-V2 15, « Analyse IA »): the reading aid written by the
  // assistant from a document. Never a word on the validity of a document,
  // never an advice: what the document says, to be checked with a
  // professional. The mention stays under every summary.
  analysis: {
    mention:
      "Aide à la lecture générée automatiquement. Elle ne remplace ni le diagnostiqueur ni le notaire.",
    notice:
      "Les documents déposés sont lus par notre assistant (modèle d'Anthropic, États-Unis) pour produire une aide à la lecture. Elle ne remplace ni le diagnostiqueur ni le notaire.",
    title: "Aide à la lecture",
    pending: "Analyse en cours… Elle s'affiche ici dans quelques minutes.",
    delayed:
      "L'analyse de ce document est indisponible pour le moment. Elle reprendra dès que possible.",
    failed: {
      not_started: "Ce document n'a pas encore été lu par notre assistant.",
      unavailable: "L'analyse de ce document n'a pas pu être faite.",
      invalid: "L'analyse de ce document n'a pas pu être faite.",
      refused: "Notre assistant n'a pas analysé ce document.",
      unreadable:
        "Notre assistant n'a pas pu lire ce fichier. Vérifiez qu'il s'ouvre sans mot de passe.",
      too_long: "Ce document est trop long pour être analysé : notre limite est de 100 pages.",
      too_heavy: "Ce fichier est trop lourd pour être analysé.",
      limit: "25 documents de ce bien sont déjà analysés : celui-ci ne l'est pas.",
    },
    retry: "Relancer l'analyse",
    retryAbout: (title: string) => `Relancer l'analyse : ${title}`,
    start: "Lancer l'analyse",
    startAbout: (title: string) => `Lancer l'analyse : ${title}`,
    retryErrors: {
      auth: "Votre session a expiré. Reconnectez-vous.",
      invalid: "Ça n'a pas fonctionné. Réessayez.",
      limit: "Vous avez déjà relancé cette analyse 3 fois en 24 heures. Réessayez demain.",
      unavailable: "Ça n'a pas fonctionné. Réessayez.",
    },
    documentDate: (date: string) => `Document daté du ${date}`,
    facts: "Points clés",
    points: "Points d'attention",
    levels: { info: "À noter", attention: "Attention" },
    quality: {
      illegible: "Document à vérifier : illisible.",
      incomplete: "Document à vérifier : incomplet.",
      wrong_type: (label: string) =>
        `Document à vérifier : il ne semble pas correspondre au type «\u00A0${label}\u00A0».`,
      help: "Vérifiez le fichier, puis retirez-le et déposez-le à nouveau si besoin.",
    },
    buyerSummary: "Ce que lit un acquéreur avec qui vous partagez ce document",
    publicFacts: {
      title: "Informations affichables sur votre annonce",
      help: "Vous décidez : ces informations n'apparaissent sur votre annonce que si vous le choisissez. Relisez-les avant de les afficher.",
      show: "Afficher sur l'annonce",
      showAbout: (title: string) => `Afficher sur l'annonce : ${title}`,
      hide: "Retirer de l'annonce",
      hideAbout: (title: string) => `Retirer de l'annonce : ${title}`,
      shown: "Affiché sur votre annonce",
      error: "Ça n'a pas fonctionné. Réessayez.",
      labels: {
        amiante: "Amiante",
        plomb: "Plomb",
        termites: "Termites",
        electricite: "Installation électrique",
        gaz: "Installation de gaz",
        assainissement: "Assainissement",
        surface_carrez: "Surface Carrez",
        travaux_votes: "Travaux votés par la dernière assemblée lue",
        destination: "Destination de l'immeuble",
        charges: "Charges de copropriété appelées",
        fonds_travaux: "Fonds de travaux appelé",
        taxe_fonciere: "Taxe foncière",
      },
      // Our own words for each value: a public fact is never a text of the assistant.
      values: {
        presence: {
          presence: "Présence indiquée par le diagnostic",
          absence: "Absence indiquée par le diagnostic",
        },
        anomalies: {
          anomalies: "Anomalies indiquées par le diagnostic",
          sans_anomalie: "Aucune anomalie indiquée par le diagnostic",
        },
        yesNo: { oui: "Oui", non: "Non" },
        destination: {
          habitation: "Habitation",
          mixte: "Mixte (habitation et activités)",
          professionnelle: "Professionnelle",
        },
        periods: { mois: "mois", trimestre: "trimestre", an: "an" },
        surface: (value: string) => `${value}\u00A0m²`,
        recurring: (amount: string, period: string) => `${amount}\u00A0€ par ${period}`,
        yearly: (amount: string, year: number) => `${amount}\u00A0€ (${year})`,
      },
    },
    refresh: {
      state: "À actualiser",
      text: (date: string, age: string, who: "diagnostiqueur" | "syndic" | "notaire") =>
        `Document daté du ${date}, soit plus de ${age} : à vérifier avec votre ${who}.`,
      age: (months: number) =>
        months % 12 === 0
          ? months === 12
            ? "1\u00A0an"
            : `${months / 12}\u00A0ans`
          : `${months}\u00A0mois`,
    },
    // The public page of a listing: the facts its seller chose to show.
    listing: {
      title: "D'après les documents du vendeur",
      intro:
        "Informations relevées par notre assistant dans des documents du dossier de vente, affichées à la demande du vendeur.",
      source: (label: string) => `Source : ${label}`,
    },
  },
  buyer: {
    metaTitle: "Documents partagés",
    title: "Documents partagés",
    intro:
      "Les documents que les vendeurs ont choisi de partager avec vous. Ils sont transmis par le vendeur : Leenkey ne garantit ni leur contenu ni leur exhaustivité.",
    loadError: "Vos documents n'ont pas pu être chargés. Rechargez la page.",
    empty: {
      title: "Aucun document partagé pour l'instant",
      text: "Quand un vendeur partage des documents avec vous, vous les retrouvez ici.",
      action: "Voir mes messages",
    },
    offline: "Bien retiré",
    sharedOn: (date: string) => `Partagé le ${date}`,
    open: "Ouvrir",
    openAbout: (title: string) => `Ouvrir ${title}`,
    listing: "Voir l'annonce",
    // To the assistant, about the documents of this property (L3-07).
    question: "Poser une question sur les documents",
    questionAbout: (title: string) => `Poser une question sur les documents : ${title}`,
    ask: {
      title: "Demander des documents",
      intro:
        "Vous pouvez demander au vendeur d'un bien avec lequel vous êtes en contact de partager ses documents.",
      action: "Demander l'accès",
      actionAbout: (title: string) => `Demander l'accès aux documents : ${title}`,
      pending: "Demande envoyée, en attente de la réponse du vendeur.",
      declined: "Le vendeur n'a pas donné suite à votre demande.",
      sent: "Votre demande est envoyée au vendeur.",
      errors: {
        auth: "Votre session a expiré. Reconnectez-vous.",
        invalid: "Ça n'a pas fonctionné. Réessayez.",
        contactFirst: "Écrivez d'abord au vendeur de ce bien.",
        unavailable: "Ça n'a pas fonctionné. Réessayez.",
      },
    },
    homeLink: "Documents partagés avec moi",
    back: "Mon espace",
  },
  size: (bytes: number) =>
    bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1).replace(".", ",")} Mo`
      : `${Math.max(1, Math.round(bytes / 1024))} ko`,
} as const;
