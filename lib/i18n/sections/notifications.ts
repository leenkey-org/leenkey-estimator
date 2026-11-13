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
    // The offers (L2) and the alerts (L3) add theirs with their emails.
    messages: {
      label: "Nouveaux messages",
      hint: "Quand un acquéreur ou un vendeur vous écrit : au plus un email toutes les 15\u00A0minutes par conversation, aucun si vous l'avez déjà lue.",
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
