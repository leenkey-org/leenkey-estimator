// Texts of the interface, part « identityDocument » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// The identity check of a buyer before a visit (DECISIONS.md 2026-11-23): on
// the project page of the buyer, in the booking of a visit, in the tab
// « Visites » of a seller and in the back office. Never « validé »: « pièce
// déposée », « identité vérifiée par Leenkey ».

export const frIdentityDocument = {
  title: "Pièce d'identité",
  intro:
    "Pour réserver une visite, déposez une pièce d'identité : carte d'identité, passeport ou titre de séjour. Vous réservez dès qu'elle est déposée, sans attendre notre vérification.",
  privacy:
    "Seule l'équipe Leenkey consulte votre pièce d'identité. Le vendeur voit seulement si elle est déposée ou vérifiée, jamais le document. Nous supprimons le fichier dès la vérification faite et nous n'en gardons aucune information : ni numéro, ni date de naissance. Elle n'est jamais transmise à notre assistant.",
  // What the buyer reads of their own status.
  status: {
    not_provided: "Pièce d'identité non déposée",
    provided: "Pièce d'identité déposée",
    checked: "Identité vérifiée par Leenkey",
  },
  // What a seller reads: a label only, never the document nor its type.
  seller: {
    not_provided: "Pièce d'identité non déposée",
    provided: "Pièce d'identité déposée, en cours de vérification",
    checked: "Identité vérifiée par Leenkey",
    mention:
      "Vous voyez seulement si la pièce d'identité d'un acquéreur est déposée ou vérifiée : seule l'équipe Leenkey la consulte.",
  },
  types: {
    carte_identite: "Carte d'identité",
    passeport: "Passeport",
    titre_sejour: "Titre de séjour",
  },
  type: "Type de pièce",
  typePlaceholder: "Choisir",
  file: "Fichier",
  fileHelp: "PDF de 3,8 Mo au plus, ou photo (JPEG, PNG, WebP). Le document entier, lisible.",
  submit: "Déposer ma pièce d'identité",
  replace: "Remplacer",
  cancel: "Annuler",
  remove: "Retirer",
  open: "Voir le document",
  openPdf: "Voir le document (PDF)",
  filed: (date: string) => `Déposée le ${date}`,
  provided:
    "Pièce d'identité déposée. Vous pouvez réserver vos visites. Notre équipe la vérifie et nous vous prévenons du résultat.",
  checked: (date: string) => `Identité vérifiée par Leenkey le ${date}`,
  // The file is deleted once checked: its type and the date of the check stay.
  fileDeleted: "Fichier supprimé après notre vérification.",
  refused: (reason: string) =>
    `Nous n'avons pas pu vérifier la pièce que vous aviez déposée. Notre remarque : ${reason}`,
  refusedNext: "Son fichier est supprimé. Déposez une autre pièce pour réserver une visite.",
  added: "Votre pièce d'identité est déposée. Vous pouvez réserver vos visites.",
  removed: "Votre pièce d'identité est retirée. Son fichier est supprimé.",
  removeDialog: {
    title: "Retirer votre pièce d'identité ?",
    description:
      "Son fichier est supprimé. Vos visites déjà réservées sont conservées ; pour en réserver une autre, vous déposerez de nouveau une pièce.",
    confirm: "Retirer la pièce",
    back: "Retour",
    close: "Fermer",
    cancel: "Annuler",
  },
  errors: {
    type: "Choisissez le type de la pièce.",
    file: "Choisissez un fichier.",
    unsupported: "Ce fichier n'est pas lisible : envoyez un PDF ou une image JPEG, PNG ou WebP.",
    tooHeavy:
      "Ce fichier est trop lourd. Envoyez un PDF de moins de 3,8 Mo ou une photo du document.",
    checked: "Votre identité est déjà vérifiée : il n'y a rien à déposer.",
    signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
    generic: "Votre pièce d'identité n'a pas pu être enregistrée. Réessayez dans un instant.",
    removeFailed: "Votre pièce d'identité n'a pas pu être retirée. Réessayez dans un instant.",
    loadError: "Votre pièce d'identité n'a pas pu être chargée. Rechargez la page.",
  },
  // The booking of a visit (SPEC-V2 14): blocked while no document is deposited.
  booking: {
    required:
      "Avant de réserver, déposez une pièce d'identité. Vous choisissez ensuite votre créneau, sans attendre notre vérification.",
    slots: (count: number) =>
      count > 1
        ? `${count} créneaux sont libres pour cette visite.`
        : count === 1
          ? "Un créneau est libre pour cette visite."
          : null,
    missing: "Déposez d'abord une pièce d'identité pour réserver ce créneau.",
    deposit: "Déposer ma pièce d'identité",
  },
  // Back office (SPEC-V2 17).
  admin: {
    title: "Pièce d'identité",
    empty: "Aucune pièce d'identité déposée.",
    filed: (date: string) => `Déposée le ${date}`,
    open: "Ouvrir le fichier",
    toCheck: "À vérifier",
    checked: (date: string, by: string | null) =>
      by ? `Vérifiée le ${date} par ${by}` : `Vérifiée le ${date}`,
    refused: (date: string, by: string | null) =>
      by ? `Refusée le ${date} par ${by}` : `Refusée le ${date}`,
    withdrawn: (date: string) => `Retirée par l'acquéreur le ${date}`,
    reason: "Motif envoyé à l'acquéreur",
    note: "Note interne",
    notePlaceholder: "Facultatif. Visible de l'équipe seulement.",
    noteHelp: (count: string, max: string) => `${count} sur ${max} caractères.`,
    fileDeleted: (date: string) => `Fichier supprimé le ${date}`,
    // Never « Valider l'identité ».
    check: "Marquer comme vérifiée",
    refuse: "Refuser",
    checkHelp:
      "Vous contrôlez que le document est une pièce d'identité du type indiqué, lisible et au nom du compte. Rien n'en est recopié. Le fichier est supprimé dès votre décision enregistrée, et l'acquéreur est prévenu : ouvrez-le avant.",
    actions: "Vérification de la pièce d'identité",
    dialog: {
      title: "Refuser cette pièce d'identité ?",
      text: "L'acquéreur lit votre motif, dans son espace et par email. Le fichier est supprimé ; il pourra déposer une autre pièce.",
      reason: "Motif du refus",
      confirm: "Refuser la pièce",
    },
    refuseTemplates: [
      "Le document est illisible ou incomplet : envoyez une photo nette de la pièce entière.",
      "La pièce a expiré : déposez une pièce en cours de validité.",
      "Le nom de la pièce ne correspond pas à celui de votre compte.",
      "Ce document n'est pas une carte d'identité, un passeport ni un titre de séjour.",
    ],
    done: "Pièce marquée comme vérifiée. Son fichier est supprimé et l'acquéreur est prévenu.",
    refusedDone: "Pièce refusée. Son fichier est supprimé et l'acquéreur est prévenu.",
    // The decision is recorded, the deletion of the file failed.
    doneFileKept:
      "Décision enregistrée et acquéreur prévenu, mais le fichier n'a pas pu être supprimé. Utilisez « Supprimer le fichier » sur sa ligne.",
    fileKept: "Le fichier de cette pièce n'est pas encore supprimé.",
    deleteFile: "Supprimer le fichier",
    fileDeletedDone: "Fichier de la pièce d'identité supprimé.",
    fileDeleteFailed: "Le fichier n'a pas pu être supprimé. Réessayez dans un instant.",
    stale: "Cette pièce n'est plus à vérifier. La fiche est à jour.",
    failed: "La décision n'a pas pu être enregistrée. Réessayez dans un instant.",
    invalid: "Écrivez un motif d'au moins 3 caractères.",
  },
} as const;
