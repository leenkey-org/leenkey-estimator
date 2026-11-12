// Texts of the interface, part « assistant » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// The assistant (L1-28, SPEC-V2 section 12, DESIGN.md 10.5 and 12).

import { of } from "./helpers";

export const frAssistant = {
  name: "Assistant Leenkey",
  metaTitle: "Assistant · Leenkey",
  open: "Ouvrir l'assistant Leenkey",
  close: "Fermer l'assistant",
  newConversation: "Nouvelle conversation",
  thread: "Conversation avec l'assistant",
  you: "Vous",
  intro:
    "Posez vos questions sur votre vente : les étapes, votre annonce, vos contacts. L'assistant peut aussi modifier la description ou le prix de votre annonce, toujours après votre confirmation.",
  suggestionsLabel: "Exemples de questions",
  suggestions: [
    "Que dois-je faire maintenant ?",
    "Améliore la description de mon annonce",
    "Combien de personnes ont vu mon annonce ?",
  ],
  disclaimer: "L'assistant peut se tromper : vérifiez les informations importantes.",
  howItWorks: "Comment fonctionne l'assistant",
  field: "Votre question",
  send: "Envoyer",
  writing: "L'assistant écrit…",
  reading: "L'assistant consulte votre dossier…",
  // The actions to confirm (ConfirmActionCard).
  action: {
    descriptionTitle: "Modifier la description de l'annonce",
    priceTitle: "Modifier le prix de l'annonce",
    property: (name: string) => `Bien : ${name}`,
    before: "Actuellement",
    after: "Proposé",
    valuation: (value: string) => `Analyse de valeur : ${value}`,
    gap: (gap: string) => `Écart avec l'analyse de valeur : ${gap}`,
    unknown: "L'assistant propose une modification de votre annonce.",
    confirm: "Confirmer",
    cancel: "Annuler",
    states: {
      confirmed: "Modification enregistrée.",
      declined: "Modification annulée : rien n'a changé.",
      superseded: "Proposition non confirmée : rien n'a changé.",
      error: "La modification n'a pas pu être faite : rien n'a changé.",
    },
    // contact_advisor (L1-34): the question passed on to the adviser.
    handoff: {
      title: "Écrire à mon conseiller",
      // The message cannot be read again (the conversation opened later).
      unknown: "L'assistant propose d'écrire à votre conseiller Leenkey.",
      message: "Message à votre conseiller",
      confirm: "Envoyer",
      states: {
        confirmed:
          "Message envoyé à votre conseiller Leenkey : sa réponse arrivera dans la messagerie.",
        declined: "Message annulé : rien n'a été envoyé.",
        superseded: "Message non confirmé : rien n'a été envoyé.",
        error: "Le message n'a pas pu être envoyé.",
      },
    },
    // create_case (L1-31): the request passed on to the team, without an adviser in the plan.
    request: {
      title: "Écrire à l'équipe Leenkey",
      unknown: "L'assistant propose de transmettre votre demande à l'équipe Leenkey.",
      subject: "Objet",
      message: "Votre demande",
      confirm: "Envoyer",
      states: {
        confirmed:
          "Demande transmise à l'équipe Leenkey : nous vous répondons par email sous 48\u00A0h, 7\u00A0j/7.",
        declined: "Demande annulée : rien n'a été envoyé.",
        superseded: "Demande non confirmée : rien n'a été envoyé.",
        error: "La demande n'a pas pu être envoyée.",
      },
    },
  },
  // The request written by the person (L1-31), where the assistant cannot sum it up: its
  // daily limit reached.
  request: {
    label: "Votre demande",
    help: "Décrivez votre question en quelques phrases. Un membre de l'équipe Leenkey vous répond par email sous 48\u00A0h, 7\u00A0j/7.",
    send: "Envoyer ma demande",
    cancel: "Annuler",
    sent: "Votre demande est transmise à l'équipe Leenkey. Nous vous répondons par email sous 48\u00A0h, 7\u00A0j/7.",
    // The plan of the property has an adviser: the request is theirs.
    advisor:
      "La formule de ce bien comprend un conseiller Leenkey : écrivez-lui directement dans la messagerie.",
    advisorLink: "Écrire à mon conseiller",
    errors: {
      invalid: (min: number) =>
        `Décrivez votre demande en quelques mots (${min}\u00A0caractères au moins).`,
      limit:
        "Vous avez déjà 5\u00A0demandes en cours de traitement. Nous y répondons au plus vite.",
      unavailable: "Votre demande n'a pas pu être envoyée. Réessayez dans quelques instants.",
    },
  },
  errors: {
    unavailable: "L'assistant ne répond pas pour le moment. Réessayez dans quelques instants.",
    refused:
      "L'assistant ne peut pas répondre à cette demande. Un conseiller Leenkey peut vous aider.",
    // Decision of 2026-11-11: the team answers every seller (after-sales); the adviser
    // belongs to the paid plans, shown greyed without one.
    quota:
      "Vous avez atteint la limite de messages de l'assistant pour aujourd'hui. Elle se renouvelle à minuit. Besoin d'aide maintenant ? Écrivez à l'équipe Leenkey.",
    quotaAction: "Écrire à l'équipe Leenkey",
    quotaAdvisor: "Écrire à mon conseiller",
    quotaAdvisorLocked: "Accessible avec la formule Accompagné",
    auth: "Votre session a expiré. Reconnectez-vous pour continuer.",
    conditions:
      "Acceptez les conditions d'utilisation mises à jour pour continuer : rechargez la page.",
    cut: "La réponse de l'assistant a été interrompue. Reformulez votre question si besoin.",
    retry: "Réessayer",
  },
  // The suggestions (L1-29, AssistantSuggestion): a reply in the messaging,
  // a description at the price step. Nothing is sent nor saved by them.
  suggestion: {
    replyTitle: "Réponse suggérée par l'assistant",
    descriptionTitle: "Proposition de l'assistant",
    suggestReply: "Suggérer une réponse",
    draftDescription: "Rédiger avec l'assistant",
    writing: "L'assistant rédige…",
    use: "Utiliser",
    edit: "Modifier",
    dismiss: "Ignorer",
    nothing: "Il n'y a pas encore de message de l'acquéreur auquel répondre.",
  },
  comingTitle: "L'assistant de l'espace acquéreur arrive",
  comingSoon: "Il vous aidera dans vos recherches et vos démarches d'achat.",
  back: "Retour à Ma vente",
  unavailable:
    "Votre conversation avec l'assistant n'a pas pu être lue. Réessayez dans quelques instants.",
} as const;
