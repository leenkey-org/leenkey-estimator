// Texts of the interface, part « advisorInterventions » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// Interventions of the adviser (DECISIONS.md 2026-11-23): the request of the
// seller with its reason, the counter of the plan, the list of the team. The
// number of interventions and the name of a plan come from the table plans,
// never from here.

const many = (count: number) => (count > 1 ? "s" : "");

export const frAdvisorInterventions = {
  // The reasons of a request, in the order of the form; « Rendez-vous initial »
  // is planned by the team, never asked for by the seller.
  reasons: {
    initial_meeting: "Rendez-vous initial",
    price_strategy: "Prix et stratégie",
    listing: "Annonce",
    visits: "Visites",
    offer: "Offre reçue",
    documents: "Documents",
    other: "Autre",
  },
  /** « 2 interventions utilisées sur 4 »: only an intervention done counts. */
  counter: (used: number, quota: number) =>
    `${used}\u00A0intervention${many(used)} utilisée${many(used)} sur\u00A0${quota}`,
  /** « Rendez-vous initial : à planifier », shown apart from the counter. */
  initialMeeting: {
    todo: "Rendez-vous initial : à planifier",
    scheduled: "Rendez-vous initial : planifié",
    done: "Rendez-vous initial : fait",
  },
  pending: (count: number) => `${count}\u00A0demande${many(count)} en cours`,
  // Where the adviser already lives: the card of « Ma vente », the conversation.
  entry: {
    request: "Demander une intervention",
    view: "Voir mes interventions",
  },
  seller: {
    metaTitle: "Interventions de mon conseiller · Leenkey",
    header: "Mon conseiller Leenkey",
    back: "Retour à ma vente",
    title: "Demander une intervention",
    for: (property: string) => `Pour «\u00A0${property}\u00A0»`,
    included: (plan: string, quota: number) =>
      `Votre formule ${plan} comprend ${quota}\u00A0intervention${many(quota)} de votre conseiller Leenkey.`,
    counted:
      "Une intervention est comptée une fois réalisée : une demande en attente ou annulée ne compte pas.",
    counterLabel: "Interventions de votre formule",
    status: {
      requested: "En attente",
      scheduled: "Planifiée",
      done: "Faite",
      cancelled: "Annulée",
    },
    form: {
      title: "Votre demande",
      reason: "Motif",
      reasonPlaceholder: "Choisir un motif",
      message: "Votre message",
      messageHelp:
        "Dites à votre conseiller ce que vous souhaitez voir avec lui : il prépare votre échange.",
      delay:
        "Nous vous répondons sous 2\u00A0jours ouvrés, du lundi au vendredi, dans votre conversation avec votre conseiller.",
      submit: "Envoyer ma demande",
      sent: "Votre demande est envoyée. Nous vous répondons sous 2\u00A0jours ouvrés, dans votre conversation avec votre conseiller.",
      conversation: "Voir la conversation",
      errors: {
        reason: "Choisissez un motif.",
        message: (min: number) => `Écrivez au moins ${min}\u00A0caractères.`,
        quota: "Les interventions de votre formule sont utilisées.",
        noAdvisor: "La formule de ce bien ne comprend pas d'intervention du conseiller.",
        rate: "Vous avez envoyé beaucoup de messages. Réessayez dans une heure.",
        auth: "Votre session a expiré. Reconnectez-vous pour envoyer votre demande.",
        unavailable: "Votre demande n'a pas pu être envoyée. Réessayez dans un instant.",
      },
    },
    // The interventions of the plan are used: writing to the adviser stays open.
    used: {
      text: (quota: number) =>
        quota > 1
          ? `Les ${quota}\u00A0interventions de votre formule sont utilisées.`
          : "L'intervention de votre formule est utilisée.",
      write: "Vous pouvez toujours écrire à votre conseiller dans votre conversation.",
      upgrade: (plan: string, quota: number) => `La formule ${plan} en comprend ${quota}.`,
      plans: "Voir les formules",
    },
    history: {
      title: "Vos demandes",
      empty: "Vous n'avez pas encore demandé d'intervention.",
      requestedOn: (date: string) => `Demandée le ${date}`,
      doneOn: (date: string) => `Faite le ${date}`,
    },
    write: "Écrire à mon conseiller",
    none: {
      title: "Pas d'intervention dans la formule de ce bien",
      text: "Les interventions d'un conseiller Leenkey sont comprises dans les formules qui en ont un.",
      action: "Voir les formules",
    },
    error: "Vos interventions n'ont pas pu être chargées.",
    retry: "Réessayer",
  },
  admin: {
    metaTitle: "Interventions · Messages clients · Back office · Leenkey",
    title: "Interventions du conseiller",
    tabs: {
      label: "Rubriques des messages clients",
      conversations: "Conversations",
      // With what waits for the team: « Interventions · 2 ».
      interventions: (open: number) => (open > 0 ? `Interventions · ${open}` : "Interventions"),
    },
    summary: (open: number, toPlan: number) =>
      toPlan > 0
        ? `${open}\u00A0à traiter, dont ${toPlan}\u00A0rendez-vous ${toPlan > 1 ? "initiaux" : "initial"} à planifier`
        : `${open}\u00A0à traiter`,
    filters: {
      label: "Statut des interventions",
      open: "À traiter",
      done: "Faites",
      cancelled: "Annulées",
      all: "Toutes",
    },
    list: "Interventions du conseiller",
    status: {
      requested: "À traiter",
      scheduled: "Planifiée",
      done: "Faite",
      cancelled: "Annulée",
      toPlan: "À planifier",
    },
    noName: "Vendeur",
    requestedOn: (date: string) => `Demandée le ${date}`,
    planSince: (date: string) => `Formule en vigueur depuis le ${date}`,
    doneOn: (date: string, name: string | null) =>
      name ? `Faite le ${date} par ${name}` : `Faite le ${date}`,
    initialText:
      "Le rendez-vous initial de la formule : il n'est pas compté dans les interventions.",
    note: (text: string) => `Note interne : ${text}`,
    write: "Écrire au vendeur",
    actions: {
      label: (name: string) => `Suivi de l'intervention de ${name}`,
      scheduled: "Planifiée",
      done: "Faite",
      cancelled: "Annulée",
    },
    dialog: {
      scheduled: {
        title: "Marquer comme planifiée",
        text: "Le vendeur lit « Planifiée » sur sa demande. La date se convient avec lui dans la conversation.",
        confirm: "Marquer comme planifiée",
      },
      done: {
        title: "Marquer comme faite",
        text: (counter: string) =>
          `L'intervention sera comptée dans la formule du vendeur. Aujourd'hui : ${counter}.`,
        // The plan ended since the request: no counter to say.
        plainText: "L'intervention sera marquée comme faite.",
        initialText:
          "Le rendez-vous initial n'est pas compté dans les interventions de la formule.",
        confirm: "Marquer comme faite",
      },
      cancelled: {
        title: "Annuler l'intervention",
        text: "Une intervention annulée n'est pas comptée. Le vendeur lit « Annulée » sur sa demande.",
        confirm: "Annuler l'intervention",
      },
      note: "Note interne",
      noteHelp: "Facultative. Le vendeur ne la lit pas.",
      labels: { back: "Retour", close: "Fermer", cancel: "Fermer sans changer" },
    },
    result: {
      scheduled: "Intervention planifiée.",
      done: "Intervention marquée comme faite.",
      cancelled: "Intervention annulée.",
    },
    errors: {
      invalid: "La note est trop longue.",
      forbidden: "Vous n'avez pas le droit de modifier cette intervention.",
      notFound: "Cette intervention n'existe plus.",
      conflict: "Cette intervention a changé depuis l'affichage de la page. La liste est à jour.",
      unavailable: "Le changement n'a pas pu être enregistré. Réessayez dans un instant.",
      network: "Pas de réponse du serveur : le changement est peut-être enregistré.",
    },
    empty: {
      title: "Aucune intervention à traiter",
      text: "Les demandes des vendeurs et les rendez-vous initiaux à planifier arrivent ici.",
      filteredTitle: "Aucune intervention pour ce filtre",
      filteredText: "Choisissez « Toutes » pour voir les autres interventions.",
    },
    error: "Les interventions n'ont pas pu être chargées.",
    retry: "Réessayer",
  },
} as const;
