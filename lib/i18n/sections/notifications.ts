// Texts of the interface, part « notifications » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-22 (SPEC-V2 section 10, docs/DESIGN.md 10.7): the list of the panel,
// the wording of each type of notification and the email preferences.

import { of } from "./helpers";

export const frNotifications = {
  filtersLabel: "Filtrer les notifications",
  filters: {
    all: "Toutes",
    searches: "Mes recherches",
    visitsOffers: "Visites et offres",
    messages: "Messages",
    offersVisits: "Offres et visites",
  },
  groups: { today: "Aujourd'hui", week: "Cette semaine", older: "Plus ancien" },
  unread: "non lue",
  markAllRead: "Tout marquer comme lu",
  filterEmpty: "Aucune notification de ce type pour l'instant.",
  loadError: "Les notifications n'ont pas pu être chargées.",
  retry: "Réessayer",
  types: {
    // L1-26: a plan paid (seller), its case and its refunds (team).
    // L1-40: a plan ending within 30 days, to its owner.
    planEnding: {
      title: (plan: string | null) =>
        plan ? `Votre formule ${plan} se termine bientôt` : "Votre formule se termine bientôt",
      detail: (date: string | null) =>
        date
          ? `Le ${date}. Sans renouvellement, votre bien repasse en Autonomie.`
          : "Sans renouvellement, votre bien repasse en Autonomie.",
    },
    // L1-40: a withdrawal to refund, to the team.
    planWithdrawn: {
      title: "Rétractation à rembourser",
      detail: (plan: string | null, reference: string | null) =>
        [plan ? `Formule ${plan}` : null, reference].filter(Boolean).join(" · ") || null,
    },
    planActivated: {
      title: (plan: string | null) => (plan ? `Formule ${plan} activée` : "Formule activée"),
      detail: (reference: string | null) =>
        reference ? `Pour votre bien ${reference}.` : "Votre conseiller Leenkey va vous contacter.",
    },
    caseCreated: {
      title: (plan: string | null, upgrade: boolean) =>
        upgrade
          ? `Passage à ${plan ?? "une formule supérieure"}`
          : `Nouvelle formule ${plan ?? "payante"}`,
      // A payment recorded with something to check (stripe_checkout_complete).
      checkTitle: (held: boolean) => (held ? "Paiement à vérifier" : "Formule à vérifier"),
      detail: (reference: string | null) =>
        reference ? `Dossier à suivre pour ${reference}.` : "Un dossier à suivre.",
      // L1-31: a request of a user to the team (create_case).
      requestTitle: "Nouvelle demande à traiter",
      requestDetail: (subject: string | null, name: string, reference: string | null) =>
        [name, subject, reference].filter(Boolean).join(" · "),
    },
    // 2026-11-08: an account confirmed, to the team.
    // L2-10: an account closed 30 days ago the scheduled task could not anonymise.
    accountAnonymizeFailed: {
      title: "Anonymisation d'un compte en échec",
      detail:
        "Un compte fermé depuis plus de 30 jours n'a pas pu être anonymisé. Le journal de la tâche planifiée « anonymize-deleted » dit pourquoi ; elle réessaie chaque dimanche.",
    },
    accountCreated: {
      title: "Nouveau compte",
      detail: (name: string | null, roles: string | null) =>
        [name, roles].filter(Boolean).join(" · ") || null,
    },
    // L1-30c: a conversation reported, to the team.
    reportCreated: {
      title: "Conversation signalée",
      detail: (excerpt: string | null, reference: string | null) =>
        [excerpt ? `«\u00A0${excerpt}\u00A0»` : null, reference].filter(Boolean).join(" · ") ||
        null,
    },
    planRefunded: {
      title: (full: boolean) => (full ? "Formule remboursée" : "Remboursement partiel"),
      checkTitle: "Remboursement à vérifier",
      detail: (amount: string | null, reference: string | null) =>
        [amount, reference].filter(Boolean).join(" · ") || null,
    },
    messageNew: {
      title: (name: string | null) => (name ? `Nouveau message ${of(name)}` : "Nouveau message"),
      detail: (excerpt: string, truncated: boolean) =>
        `«\u00A0${excerpt}${truncated ? "…" : ""}\u00A0»`,
    },
    // L1-34: the adviser wrote to the seller; a seller wrote to the team.
    advisorMessage: {
      title: "Nouveau message de votre conseiller Leenkey",
    },
    advisorFromClient: {
      title: (name: string | null) =>
        name ? `Message ${of(name)} à son conseiller` : "Message d'un vendeur à son conseiller",
      handoff: (name: string | null) =>
        name
          ? `Question ${of(name)} transmise par l'assistant`
          : "Question transmise par l'assistant",
      // A request for an intervention of the adviser (DECISIONS.md 2026-11-23).
      intervention: (name: string | null) =>
        name ? `Demande d'intervention ${of(name)}` : "Demande d'intervention d'un vendeur",
      detail: (reference: string | null, excerpt: string | null, truncated: boolean) =>
        [reference, excerpt ? `«\u00A0${excerpt}${truncated ? "…" : ""}\u00A0»` : null]
          .filter(Boolean)
          .join(" · "),
    },
    listingPending: {
      title: "Une annonce attend votre relecture",
      detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · "),
    },
    // L1-35: a listing online changed by its seller, to check afterwards.
    listingRevised: {
      title: "Une annonce en ligne a été modifiée",
      fields: {
        price: "prix",
        title: "titre",
        description: "description",
        photo: "photos",
      } as Record<string, string>,
      changed: (fields: readonly string[]) =>
        fields.length > 0 ? `Modifié : ${fields.join(", ")}` : null,
      price: (before: string, after: string) => `Prix : ${before} → ${after}`,
      detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · "),
    },
    listingPublished: {
      title: "Votre annonce est en ligne",
      detail: (title: string) => `«\u00A0${title}\u00A0» est visible des acquéreurs.`,
    },
    listingRejected: {
      title: "Votre annonce est à corriger",
      detail: (title: string) =>
        `Nous avons relu «\u00A0${title}\u00A0» : voyez ce qu'il faut corriger.`,
    },
    // DECISIONS.md 2026-11-22: a request to bring a listing into line, its
    // reminder 2 days before the deadline, the deletion once it passed.
    listingComplianceRequested: {
      title: "Votre annonce est à mettre en conformité",
      detail: (title: string | null, date: string | null) =>
        `${title ? `«\u00A0${title}\u00A0» : modifiez-la` : "Modifiez votre annonce"}${date ? ` avant le ${date}` : ""}.`,
    },
    listingComplianceReminder: {
      title: "Rappel : votre annonce est à mettre en conformité",
      detail: (title: string | null, date: string | null) =>
        `${title ? `«\u00A0${title}\u00A0» : sans` : "Sans"} modification${date ? ` avant le ${date}` : ""}, nous pourrons la supprimer.`,
    },
    // L1-30e: a listing changed by the team, to its seller.
    listingTeamEdited: {
      title: "Notre équipe a modifié votre annonce",
      reason: (reason: string) => `Motif : ${reason}`,
    },
    listingDeleted: {
      title: "Nous avons supprimé votre annonce",
      detail: (title: string | null) =>
        `${title ? `«\u00A0${title}\u00A0» n'a` : "Votre annonce n'a"} pas été mise en conformité dans le délai demandé.`,
    },
    // L2-04a: an offer received by its seller, read and answered for its buyer.
    offerReceived: {
      title: (firstName: string | null) =>
        firstName
          ? `${firstName} vous a fait une offre d'achat`
          : "Vous avez reçu une offre d'achat",
      detail: (price: string | null, title: string | null) =>
        [price, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    offerViewed: {
      title: "Le vendeur a consulté votre offre",
      detail: (title: string) => `«\u00A0${title}\u00A0»`,
    },
    offerAnswered: {
      accepted: "Votre offre d'achat a été acceptée",
      declined: "Votre offre d'achat a été refusée",
      detail: (title: string) => `«\u00A0${title}\u00A0»`,
    },
    // L2-04b: an offer withdrawn by its buyer (the seller), an offer past its
    // validity (its buyer and its seller).
    offerWithdrawn: {
      title: (firstName: string | null) =>
        firstName ? `${firstName} a retiré son offre d'achat` : "Une offre d'achat a été retirée",
      detail: (price: string | null, title: string | null) =>
        [price, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    // L2-07: for the team, an offer accepted on a property whose plan has an adviser.
    offerAcceptedTeam: {
      title: "Offre acceptée sur une vente avec conseiller",
      detail: (price: string | null, reference: string | null, city: string | null) =>
        [price, [reference, city].filter(Boolean).join(" · ")].filter(Boolean).join(" · ") || null,
    },
    // 2026-11-21: for the team, an offer received on a property whose plan has
    // an adviser (answer of Cédric of 2026-11-19).
    offerReceivedTeam: {
      title: "Offre reçue sur une vente avec conseiller",
      detail: (price: string | null, reference: string | null, city: string | null) =>
        [price, [reference, city].filter(Boolean).join(" · ")].filter(Boolean).join(" · ") || null,
    },
    // 2026-11-21: a proof of financing checked by the team, for its buyer.
    // « Vérifié », never « validé ».
    financingChecked: {
      title: "Votre justificatif de financement est vérifié",
      detail:
        "Votre dossier affiche « Justificatif vérifié ». Nous supprimons le fichier après ce contrôle.",
    },
    // 2026-11-23: the identity document of a buyer checked or refused by the
    // team, for its buyer. « Vérifiée », never « validée ».
    identityChecked: {
      title: "Votre identité est vérifiée",
      detail:
        "Votre espace affiche « Identité vérifiée par Leenkey ». Nous supprimons le fichier après cette vérification.",
    },
    identityRefused: {
      title: "Votre pièce d'identité n'a pas pu être vérifiée",
      detail: (reason: string | null) =>
        reason ? `Notre remarque : ${reason}` : "Déposez une autre pièce pour réserver une visite.",
    },
    // 2026-11-21: a report handled by the team, for its author. Never what was decided.
    reportHandled: {
      title: "Votre signalement a été traité",
      detail: (title: string | null) =>
        title ? `Conversation à propos de «\u00A0${title}\u00A0»` : null,
    },
    offerExpired: {
      buyer: "Votre offre d'achat a expiré",
      seller: "Une offre d'achat reçue a expiré",
      detail: (price: string | null, title: string | null) =>
        [price, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    // L3-02: a visit on invitation (SPEC-V2 14). The invitation goes to the
    // buyer; a booking and a reminder to both parties; a cancelling to the
    // party who did not cancel (`role` says who reads it). Never the address.
    visitInvited: {
      title: (seller: string | null) =>
        seller ? `${seller} vous invite à visiter son bien` : "Invitation à visiter un bien",
      until: (date: string) => `Réservation jusqu'au ${date}`,
      detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · ") || null,
    },
    visitBooked: {
      buyer: "Votre visite est confirmée",
      seller: (buyer: string | null) =>
        buyer ? `${buyer} a réservé une visite` : "Une visite a été réservée",
      detail: (date: string | null, title: string | null) =>
        [date, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    visitCancelled: {
      buyer: "Le vendeur a annulé votre visite",
      seller: (buyer: string | null) =>
        buyer ? `${buyer} a annulé sa visite` : "Une visite a été annulée",
      detail: (date: string | null, title: string | null) =>
        [date, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    visitReminder: {
      title: "Rappel de visite",
      detail: (date: string | null, title: string | null) =>
        [date, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    // L3-03: the request for feedback, the day after a visit (both parties).
    visitFeedbackRequested: {
      buyer: "Donnez votre retour sur votre visite",
      seller: (buyer: string | null) =>
        buyer ? `Visite de ${buyer} : votre note` : "Visite passée : votre note",
      detail: (date: string | null, title: string | null) =>
        [date, title ? `«\u00A0${title}\u00A0»` : null].filter(Boolean).join(" · ") || null,
    },
    // L3-04: the sale file (SPEC-V2 15). Documents shared, for the buyer (the
    // number shared at once; the seller is not named); a request to read the
    // documents, for the seller. Never the name of a document.
    documentShared: {
      title: (count: number | null) =>
        count === null
          ? "Des documents sont partagés avec vous"
          : count > 1
            ? `${count}\u00A0documents partagés avec vous`
            : "1\u00A0document partagé avec vous",
      detail: (title: string | null, city: string | null) =>
        [title ? `«\u00A0${title}\u00A0»` : null, city].filter(Boolean).join(" · ") || null,
    },
    documentAccessRequested: {
      title: (buyer: string | null) =>
        buyer
          ? `${buyer} demande l'accès à vos documents`
          : "Un acquéreur demande l'accès à vos documents",
      detail: (title: string | null) => (title ? `«\u00A0${title}\u00A0»` : null),
    },
    // L3-05: a document of the sale file the assistant could not read as what
    // it should be, for its seller (the name is the one the seller gave it).
    documentNeedsAttention: {
      title: "Un document de votre dossier est à vérifier",
      problems: {
        illegible: "illisible",
        incomplete: "incomplet",
        wrong_type: "ne semble pas correspondre au type choisi",
      },
      detail: (document: string | null, problem: string | null) =>
        [document ? `«\u00A0${document}\u00A0»` : null, problem].filter(Boolean).join(" : ") ||
        null,
    },
    // L1-23: the sale reaches a step (SPEC-V2 section 9).
    stepAdvanced: {
      title: (step: string | null) =>
        step ? `Nouvelle étape : ${step}` : "Votre vente passe à l'étape suivante",
      position: (position: number, total: number) => `Étape ${position} sur ${total}`,
      detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · "),
    },
    fallback: "Nouvelle notification",
  },
  preferences: {
    metaTitle: "Notifications · Mon compte",
    title: "Notifications",
    lead: "Choisissez les emails que vous recevez. Dans l'application, la cloche vous prévient de tout.",
    legend: "Emails",
    messages: {
      label: "Nouveaux messages",
      hint: "Quand un acquéreur ou un vendeur vous écrit : au plus un email toutes les 15\u00A0minutes par conversation, aucun si vous l'avez déjà lue.",
    },
    offers: {
      label: "Offres d'achat",
      hint: "Quand vous recevez une offre sur votre bien, ou quand le vendeur répond à la vôtre.",
    },
    // L3-06: the daily digest of the alerts, and the similar listings after a sale.
    alerts: {
      label: "Alertes de recherche",
      hint: "Les nouveaux biens qui correspondent à vos alertes : un email par jour au plus, et des biens similaires quand un bien que vous avez suivi est vendu.",
    },
    always:
      "Les emails sur votre annonce (relecture, mise en ligne, corrections) partent toujours.",
    save: "Enregistrer",
    saved: "Vos préférences sont enregistrées.",
    error: "Vos préférences n'ont pas pu être enregistrées. Réessayez.",
    loadError: "Vos préférences n'ont pas pu être chargées. Rechargez la page.",
    back: "Mon compte",
  },
} as const;
