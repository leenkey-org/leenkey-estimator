// Texts of the interface, part « saleDashboard » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// « Ma vente », the dashboard of a sale (L1-24, SPEC-V2 8.7, DESIGN.md 12.3).

export const frSaleDashboard = {
  title: "Ma vente",
  switch: { trigger: "Changer de bien" },
  figures: (price: string, published: string | null) =>
    published ? `${price} · publié le ${published}` : price,
  step: (position: number, total: number, title: string) =>
    `Étape ${position} sur ${total} · ${title}`,
  next: {
    label: "Prochaine action",
    rejected: {
      title: "Corrigez votre annonce",
      text: "Nous vous indiquons ce qu'il faut modifier avant de la publier.",
      action: "Corriger l'annonce",
      secondary: "Voir le bien",
    },
    // Rule 3 (L1-34): the adviser wrote, the seller has not read it yet.
    advisor: {
      title: "Votre conseiller Leenkey vous a écrit",
      text: (since: string) => `Message reçu ${since}.`,
      action: "Lire le message",
    },
    waiting: {
      title: (firstName: string | null) =>
        firstName ? `Répondez à ${firstName}` : "Répondez à un acquéreur",
      text: (since: string) =>
        `Message reçu ${since}. Une réponse rapide garde l'acquéreur intéressé.`,
      action: "Répondre",
      secondary: "Toutes les conversations",
    },
    task: {
      // What to do, for the tasks a seller does (their titles say them done).
      titles: {
        property_complete: "Complétez la fiche du bien",
        photos_min6: "Ajoutez au moins 6 photos",
        listing_written: "Rédigez votre annonce",
        listing_submitted: "Envoyez-nous votre annonce",
        deed_signed: "Indiquez que le bien est vendu",
        notary_chosen: "Choisissez votre notaire",
        notary_file_sent: "Transmettez le dossier au notaire",
        precontract_signed: "Signez l'avant-contrat",
        conditions_lifted: "Faites lever les conditions suspensives",
      } as Record<string, string>,
      text: (step: string) => `Étape « ${step} ».`,
      action: "Continuer",
      done: "C'est fait",
      secondary: "Toutes les étapes",
    },
    advice: { listing: "Voir l'annonce en ligne", sheet: "Voir le bien" },
    review: {
      title: "Nous relisons votre annonce",
      text: "Nous la relisons sous 24\u00A0h et vous prévenons par email.",
    },
  },
  stats: {
    label: "Votre annonce en chiffres",
    views: (count: number) => (count > 1 ? "vues · 7 j" : "vue · 7 j"),
    contacts: (count: number) => (count > 1 ? "contacts" : "contact"),
    qualified: (count: number) => (count > 1 ? "qualifiés" : "qualifié"),
  },
  todo: {
    title: "À faire",
    all: "Toutes les étapes",
    states: { done: "Fait", current: "À faire maintenant", todo: "À venir" },
    leenkey: "Par votre conseiller Leenkey",
    automatic: "Se coche automatiquement",
    manual: "À cocher quand c'est fait",
    markDone: "Fait",
    markUndone: "Annuler",
    markDoneLabel: (title: string) => `Marquer « ${title} » comme fait`,
    markUndoneLabel: (title: string) => `Remettre « ${title} » à faire`,
    error: "Ça n'a pas fonctionné. Réessayez dans un instant.",
  },
  conversations: {
    title: "Conversations",
    all: "Toutes les conversations",
    empty: "Pas encore de message. Les acquéreurs vous écrivent depuis votre annonce.",
  },
  draft: {
    title: "Terminez votre annonce",
    text: "Votre bien est enregistré. Il reste quelques étapes avant de nous l'envoyer.",
    action: "Reprendre la création",
  },
  sold: {
    title: "Vente terminée",
    text: "Félicitations. Voici le bilan de votre vente sur Leenkey.",
    price: "prix de vente",
    askedPrice: "dernier prix affiché",
    days: (count: number) => (count > 1 ? "jours en vente" : "jour en vente"),
    contacts: (count: number) => (count > 1 ? "contacts" : "contact"),
  },
  steps: {
    metaTitle: "Toutes les étapes · Leenkey",
    title: "Toutes les étapes",
    back: "Ma vente",
    current: "Étape en cours",
    done: "Terminée",
    count: (done: number, total: number) => `${done} sur ${total}`,
    // The steps side by side, swiped (Younes, DECISIONS 2026-11-07).
    region: "Étapes de la vente",
    previous: "Voir l'étape précédente",
    next: "Voir l'étape suivante",
  },
} as const;
