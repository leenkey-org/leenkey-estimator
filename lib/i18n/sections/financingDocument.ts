// Texts of the interface, part « financingDocument » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L2-02: the proof of financing of a buyer, on its project page and in the
// back office. Never « validé » (SPEC-V2 4 and 13): « fourni », « vérifié ».

export const frFinancingDocument = {
  title: "Justificatif de financement",
  // SPEC-V2 4, « Justificatifs acceptés ».
  accepted:
    "Justificatifs acceptés : accord de principe bancaire, attestation d'un courtier, simulation ou offre bancaire nominative de moins de 3 mois environ, preuve de fonds propres (attestation bancaire) en cas d'achat comptant total ou partiel.",
  privacy:
    "Seule l'équipe Leenkey lit votre justificatif. Le vendeur voit son statut, son type et la date de notre contrôle, jamais le document. Une fois le contrôle fait, nous supprimons le fichier.",
  undeclared:
    "Renseignez d'abord votre projet, votre budget, votre apport et votre besoin de prêt ci-dessus : nous comparons votre justificatif à ces informations.",
  types: {
    accord_principe: "Accord de principe bancaire",
    attestation_courtier: "Attestation d'un courtier",
    simulation_bancaire: "Simulation ou offre bancaire nominative",
    preuve_fonds_propres: "Preuve de fonds propres (attestation bancaire)",
    autre: "Autre justificatif",
  },
  type: "Type de justificatif",
  typePlaceholder: "Choisir",
  date: "Date du document",
  dateHelp: "La date qui figure sur le document.",
  file: "Fichier",
  fileHelp: "PDF de 3,8 Mo au plus, ou image (JPEG, PNG, WebP).",
  submit: "Déposer le justificatif",
  replace: "Remplacer",
  cancel: "Annuler",
  remove: "Retirer",
  open: "Voir le document",
  openPdf: "Voir le document (PDF)",
  documentDate: (date: string) => `Document du ${date}`,
  // « Sous 48 h », and the buyer is told (answers of Cédric of 2026-11-19, Q83).
  provided:
    "Justificatif fourni. Nous le contrôlons sous 48\u00A0h : le résultat s'affichera ici et nous vous préviendrons.",
  checked: (date: string) => `Contrôlé par Leenkey le ${date}`,
  // The file is deleted once checked: its type and the date of the check stay.
  fileDeleted: "Fichier supprimé après notre contrôle.",
  replaceChecked:
    "Votre justificatif actuel a été contrôlé. Un nouveau justificatif le remplace et sera contrôlé à son tour.",
  old: "Ce document a plus de 3 mois. Vous pouvez le déposer ; un document plus récent rassure davantage un vendeur.",
  added:
    "Votre justificatif est déposé. Votre dossier passe à « Justificatif fourni ». Nous le contrôlons sous 48\u00A0h.",
  removed: "Votre justificatif est retiré.",
  removeDialog: {
    title: "Retirer votre justificatif ?",
    description:
      "Votre dossier revient à ce que vous avez déclaré. Vous pourrez déposer un autre justificatif à tout moment.",
    confirm: "Retirer le justificatif",
    back: "Retour",
    close: "Fermer",
    cancel: "Annuler",
  },
  errors: {
    type: "Choisissez le type du justificatif.",
    date: "Indiquez la date du document : elle ne peut pas être dans le futur.",
    file: "Choisissez un fichier.",
    unsupported: "Ce fichier n'est pas lisible : envoyez un PDF ou une image JPEG, PNG ou WebP.",
    tooHeavy:
      "Ce fichier est trop lourd. Envoyez un PDF de moins de 3,8 Mo ou une photo du document.",
    undeclared:
      "Renseignez d'abord votre projet et votre financement, puis déposez votre justificatif.",
    signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
    generic: "Votre justificatif n'a pas pu être enregistré. Réessayez dans un instant.",
    removeFailed: "Votre justificatif n'a pas pu être retiré. Réessayez dans un instant.",
  },
  // Back office (SPEC-V2 17).
  admin: {
    title: "Justificatif de financement",
    empty: "Aucun justificatif déposé.",
    current: "En vigueur",
    removed: (date: string) => `Retiré le ${date}`,
    replaced: "Remplacé",
    filed: (date: string) => `Déposé le ${date}`,
    documentDate: (date: string) => `Document du ${date}`,
    old: "Document de plus de 3 mois",
    open: "Ouvrir le fichier",
    fileDeleted: (date: string) => `Fichier supprimé après contrôle le ${date}`,
    notChecked: "À contrôler",
    checked: (date: string, by: string | null) =>
      by ? `Contrôlé le ${date} par ${by}` : `Contrôlé le ${date}`,
    note: "Note interne",
    notePlaceholder: "Facultatif. Visible de l'équipe seulement.",
    noteHelp: (count: string, max: string) => `${count} sur ${max} caractères.`,
    // SPEC-V2 13: never « Valider le financement ».
    check: "Marquer le justificatif comme vérifié",
    checkHelp:
      "Vous contrôlez la présence du document, son type, sa date et sa cohérence apparente avec les informations déclarées. Le fichier est supprimé dès le contrôle enregistré, et l'acquéreur est prévenu : ouvrez-le avant.",
    done: "Justificatif marqué comme vérifié. Son fichier est supprimé et l'acquéreur est prévenu.",
    // The check is recorded, the deletion of the file failed.
    doneFileKept:
      "Justificatif marqué comme vérifié et acquéreur prévenu, mais son fichier n'a pas pu être supprimé. Utilisez « Supprimer le fichier » sur sa ligne.",
    // A proof checked whose file is still stored (a deletion that failed, a
    // proof checked before 2026-11-21): the team deletes it from its line.
    fileKept: "Justificatif contrôlé : son fichier n'est pas encore supprimé.",
    deleteFile: "Supprimer le fichier",
    fileDeletedDone: "Fichier du justificatif supprimé.",
    fileDeleteFailed: "Le fichier n'a pas pu être supprimé. Réessayez dans un instant.",
    stale: "Ce justificatif n'est plus à contrôler. La fiche est à jour.",
    failed: "Le contrôle n'a pas pu être enregistré. Réessayez dans un instant.",
  },
} as const;
