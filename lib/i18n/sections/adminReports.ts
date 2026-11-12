// Texts of the interface, part « adminReports » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-30c: the reports of the back office (SPEC-V2 section 17). The
// reported conversation is read in full here, each reading traced.

export const frAdminReports = {
  metaTitle: "Signalements · Back office · Leenkey",
  detailMetaTitle: (label: string) => `${label} · Signalements · Back office · Leenkey`,
  title: "Signalements",
  summary: {
    open: (count: number) =>
      `${count}\u00A0${count > 1 ? "signalements ouverts" : "signalement ouvert"}`,
    closed: (count: number) => `${count}\u00A0clos`,
  },
  filters: {
    label: "Statut des signalements",
    open: "Ouverts",
    closed: "Clos",
  },
  table: {
    label: "Signalements",
    reason: "Motif",
    by: "Signalé par",
    target: "Concerne",
    listing: "Annonce",
    received: "Reçu",
  },
  limited: (count: number) => `Les ${count}\u00A0premiers signalements sont affichés.`,
  by: (name: string) => `Par ${name}`,
  about: (name: string) => `concerne ${name}`,
  someone: "un compte supprimé",
  deleted: "Compte supprimé",
  noListing: "Sans annonce",
  openLabel: (reason: string) => `Ouvrir le signalement « ${reason} »`,
  empty: {
    openTitle: "Aucun signalement ouvert",
    openText: "Les conversations signalées par les utilisateurs arrivent ici.",
    closedTitle: "Aucun signalement clos",
    closedText: "Les signalements traités restent ici, avec leur suite.",
  },
  error: "Les signalements n'ont pas pu être chargés.",
  retry: "Réessayer",
  back: "Tous les signalements",
  detail: {
    title: (reference: string | null) => (reference ? `Signalement · ${reference}` : "Signalement"),
    reason: "Motif du signalement",
    reporter: "Signalé par",
    target: "Concerne",
    listing: "Annonce",
    received: "Reçu le",
    closed: "Clos le",
    open: "Ouvert",
    suspended: "Compte suspendu",
    deleted: "Compte supprimé",
    team: "Un compte de l'équipe ne s'avertit ni ne se suspend.",
    conversation: "Conversation signalée",
    conversationNote:
      "Vous lisez cette conversation dans le cadre du signalement : votre lecture est enregistrée dans l'historique.",
    conversationEmpty: "Aucun message dans cette conversation.",
    seller: "vendeur",
    buyer: "acquéreur",
    from: (name: string, role: string) => `${name}, ${role}`,
    system: "Message automatique",
    history: "Historique",
    historyEmpty: "Aucune action pour l'instant.",
    error: "Ce signalement n'a pas pu être chargé.",
    warned: "Averti le",
    historyError: "L'historique n'a pas pu être chargé.",
  },
  actions: {
    label: "Décisions sur le signalement",
    warn: (name: string | null) => (name ? `Avertir ${name}` : "Avertir l'autre partie"),
    resolve: "Clore le signalement",
  },
  warnDialog: {
    title: "Avertir l'utilisateur",
    text: "Il reçoit ce message par email, avec le rappel qu'un nouveau manquement peut suspendre son compte. Rien ne change sur son compte.",
    reason: "Message envoyé à l'utilisateur",
    hint: "Au moins 3\u00A0caractères, envoyé tel quel.",
    confirm: "Envoyer l'avertissement",
  },
  // Provisional wording, to be validated by Cédric (Q74).
  warnTemplates: [
    "Merci de rester courtois dans vos échanges.",
    "La messagerie ne sert ni au démarchage ni à la publicité.",
    "Ne demandez ni paiement ni coordonnées bancaires dans la messagerie.",
  ],
  resolveDialog: {
    title: "Clore le signalement",
    text: "Indiquez la suite donnée : elle reste dans l'historique. Personne n'est prévenu.",
    reason: "Suite donnée",
    hint: "Au moins 3\u00A0caractères, gardé dans l'historique.",
    confirm: "Clore le signalement",
  },
  resolveTemplates: [
    "Sans suite : rien d'anormal dans l'échange.",
    "Utilisateur averti.",
    "Compte suspendu.",
  ],
  history: {
    actions: {
      "report.read": "Conversation lue",
      "report.warn": "Utilisateur averti",
      "report.resolve": "Signalement clos",
    } as Record<string, string>,
    other: "Modifié",
    by: (name: string) => `par ${name}`,
    reason: (reason: string) => `« ${reason} »`,
  },
  result: {
    resolved: "Signalement clos.",
    warned: "Avertissement enregistré.",
    emailSent: "L'utilisateur est prévenu par email.",
    emailFailed: "L'email n'a pas pu partir : prévenez l'utilisateur autrement.",
  },
  errors: {
    invalid: "Le texte doit faire au moins 3\u00A0caractères.",
    conflict: "Ce signalement est déjà clos, ou personne ne peut être averti : rechargez la page.",
    notFound: "Ce signalement n'existe plus.",
    forbidden: "Cette action est réservée à l'équipe Leenkey.",
    unavailable: "La décision n'a pas pu être enregistrée. Réessayez.",
    network:
      "Pas de réponse du serveur : la décision a peut-être été enregistrée. Rechargez la page avant de recommencer.",
  },
} as const;
