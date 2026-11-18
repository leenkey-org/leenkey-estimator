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
    states: { filed: "Déposé", exempt: "Non concerné", missing: "Manquant" },
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
      reasonHelp: "Par exemple : « Pas d'installation de gaz », « Construction de 2005 ».",
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
        count === 0 ? "Aucun document partagé" : `${count} sur ${total} documents partagés`,
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
