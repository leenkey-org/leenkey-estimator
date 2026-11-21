// The sale file (L3-04, SPEC-V2 15): the tab « Documents » of a property, the
// documents shared with a buyer. Leenkey never says a diagnostic is or is
// not due (Cédric, 2026-11-09): the list is a help.
export const frSaleFile = {
  types: {
    dpe: "DPE",
    amiante: "Diagnostic amiante",
    plomb: "Diagnostic plomb",
    electricite: "Diagnostic électricité",
    gaz: "Diagnostic gaz",
    termites: "État relatif aux termites",
    erp: "État des risques (ERP)",
    carrez: "Mesurage Carrez",
    assainissement: "Diagnostic assainissement",
    titre_propriete: "Titre de propriété",
    taxe_fonciere: "Taxe foncière",
    certificat_urbanisme: "Certificat d'urbanisme ou bornage",
    pv_ag: "PV des 3 dernières assemblées générales",
    reglement_copro: "Règlement de copropriété et état descriptif de division",
    appel_charges: "Appels de charges (2 dernières années)",
    carnet_entretien: "Carnet d'entretien de l'immeuble",
    fiche_synthetique: "Fiche synthétique de la copropriété",
    pre_etat_date: "Pré-état daté",
    facture_travaux: "Factures des travaux de moins de 10 ans",
    autre: "Autre document",
  },
  categories: {
    diagnostics: "Diagnostics",
    ownership: "Propriété",
    coownership: "Copropriété",
    works: "Travaux",
    other: "Autres documents",
  },
  seller: {
    metaTitle: "Documents",
    title: "Documents",
    intro:
      "Rassemblez ici les pièces de votre vente. Vous choisissez ce que vous partagez, et avec qui : un acquéreur ne voit un document que si vous le partagez avec lui.",
    disclaimer:
      "Cette liste est une aide : les pièces à fournir dépendent de votre bien. Faites-la confirmer par votre diagnostiqueur certifié et votre notaire.",
    loadError: "Les documents n'ont pas pu être chargés. Rechargez la page.",
    progress: (done: number, total: number) => `Dossier notaire : ${done} / ${total} pièces`,
    complete: "Dossier notaire complet",
    states: { filed: "Déposé", exempt: "Non concerné", missing: "À déposer" },
    optional: "En plus du dossier notaire",
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
    failed: {
      unavailable: "L'analyse de ce document n'a pas pu être faite.",
      invalid: "L'analyse de ce document n'a pas pu être faite.",
      refused: "Notre assistant n'a pas analysé ce document.",
      unreadable:
        "Notre assistant n'a pas pu lire ce fichier. Vérifiez qu'il s'ouvre sans mot de passe.",
      too_long: "Ce document dépasse 100 pages : il n'est pas analysé.",
      too_heavy: "Ce fichier est trop lourd pour être analysé.",
      limit: "25 documents de ce bien sont déjà analysés : celui-ci ne l'est pas.",
    },
    retry: "Relancer l'analyse",
    retryAbout: (title: string) => `Relancer l'analyse : ${title}`,
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
        classe_energie: "Classe énergie (DPE)",
        classe_ges: "Classe climat (GES)",
        amiante: "Amiante",
        plomb: "Plomb",
        termites: "Termites",
        electricite: "Installation électrique",
        gaz: "Installation de gaz",
        assainissement: "Assainissement",
        risques: "Risques recensés",
        surface_carrez: "Surface Carrez",
        travaux_votes: "Travaux votés en copropriété",
        procedures: "Procédures de la copropriété",
        charges: "Charges de copropriété",
        fonds_travaux: "Fonds de travaux",
        taxe_fonciere: "Taxe foncière",
        destination: "Destination de l'immeuble",
        restrictions_usage: "Restrictions d'usage",
        servitudes: "Servitudes",
        travaux_realises: "Travaux réalisés",
      },
    },
    refresh: {
      state: "À actualiser",
      text: (date: string, age: string, diagnostic: boolean) =>
        `Document daté du ${date}, soit plus de ${age} : à vérifier avec votre ${diagnostic ? "diagnostiqueur" : "notaire"}.`,
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
