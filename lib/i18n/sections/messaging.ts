// Texts of the interface, part « messaging » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-21: messaging (SPEC-V2 8.6, DESIGN.md 10.5 and 12.9).

import { of } from "./helpers";

export const frMessaging = {
  metaTitle: "Messages · Leenkey",
  title: "Messages",
  conversationMetaTitle: (title: string) => `${title} · Messages · Leenkey`,
  newMetaTitle: "Contacter le vendeur · Leenkey",
  // The other party without a first name.
  someone: { buyer: "l'acquéreur", seller: "le vendeur" },
  list: {
    label: "Vos conversations",
    unread: "Non lu",
    you: "Vous :",
    // Group of the conversations of an account that also sells.
    buying: "Annonces contactées",
    error: "Vos conversations n'ont pas pu être chargées. Réessayez dans un instant.",
    empty: {
      title: "Aucune conversation pour l'instant",
      buyer: "Écrivez à un vendeur depuis son annonce : votre échange apparaîtra ici.",
      seller: "Les acquéreurs qui vous écrivent depuis votre annonce apparaîtront ici.",
      action: "Voir les annonces",
    },
    choose: {
      title: "Choisissez une conversation",
      text: "Ses messages s'affichent ici, à côté de la liste.",
    },
  },
  thread: {
    back: "Toutes les conversations",
    label: "Messages de la conversation",
    with: (name: string) => `Avec ${name}`,
    withFinancing: (name: string, financing: string) => `Avec ${name}\u00A0· ${financing}`,
    // L1-25: the financing of the buyer, for the seller.
    you: "Vous",
    menu: "Plus d'actions",
    report: "Signaler la conversation",
    reported: "Votre signalement est transmis à l'équipe Leenkey.",
    closed: "Cette conversation est close : vous ne pouvez plus y écrire.",
    // Back to what the conversation is about (DECISIONS 2026-10-26).
    listing: "Voir l'annonce",
    property: "Voir mon bien",
  },
  composer: {
    label: "Votre message",
    send: "Envoyer",
  },
  // L1-34: the conversation with the Leenkey adviser (SPEC-V2 8.6).
  advisor: {
    name: "Mon conseiller Leenkey",
    team: "L'équipe Leenkey",
    // An admin who answered: their first name (SPEC 8.6).
    member: (firstName: string) => `${firstName}, équipe Leenkey`,
    avatar: "LK",
    // The header of the seller: the plan of the property, then the delay (SPEC 8.13).
    reply: "Réponse sous 24\u00A0h",
    // No immediate start (SPEC 11): the first contact after the withdrawal.
    from: (date: string) => `Accompagnement à partir du ${date}`,
    closed:
      "Votre formule ne comprend plus de conseiller : cette conversation est fermée. Choisissez une formule pour échanger de nouveau avec l'équipe Leenkey.",
    closedTeam:
      "La formule de ce bien ne comprend plus de conseiller : la conversation est fermée.",
    write: "Écrire à mon conseiller",
    // Autonomie (SPEC 8.6, decision of 2026-11-11): the adviser shown greyed, with the way
    // to the plans that have one.
    invite: {
      locked: "Accessible avec la formule Accompagné",
      text: "Un conseiller Leenkey vous répond sous 24\u00A0h, avec les formules Accompagné et Sérénité.",
      action: "Voir les formules",
    },
    // Its link in the header: the plan of the property.
    plan: "Voir ma formule",
    // A question passed on by the assistant (contact_advisor), signed by its author.
    handoff: (author: string) => `${author}, via l'assistant`,
    // The team's view: the case of the property, in the back office.
    case: "Voir le dossier",
  },
  start: {
    back: "Retour à l'annonce",
    intro: (name: string) => `Présentez-vous et posez vos questions : ${name} vous répond ici.`,
    visit: "Bonjour, je souhaiterais visiter votre bien. Quelles sont vos disponibilités ?",
  },
  report: {
    title: "Signaler la conversation",
    text: "Dites-nous ce qui ne va pas : l'équipe Leenkey examine chaque signalement.",
    reason: "Motif du signalement",
    confirm: "Envoyer le signalement",
    tooShort: "Indiquez le motif du signalement, en 3 caractères au moins.",
    tooLong: "Le motif dépasse 2\u00A0000 caractères.",
    unavailable: "Le signalement n'est pas parti. Réessayez dans un instant.",
  },
  errors: {
    empty: "Écrivez votre message.",
    tooLong: "Votre message dépasse 4\u00A0000 caractères.",
    auth: "Votre session a expiré : reconnectez-vous pour envoyer votre message.",
    messagesPerHour:
      "Vous avez envoyé 20 messages en une heure : c'est la limite. Réessayez un peu plus tard.",
    conversationsPerDay:
      "Vous avez contacté 5 nouveaux vendeurs en 24\u00A0h : c'est la limite. Réessayez demain.",
    closed: "Cette conversation est close : vous ne pouvez plus y écrire.",
    inactive:
      "Votre compte ne permet plus d'envoyer de messages : écrivez-nous depuis le formulaire de contact.",
    subjectUnavailable:
      "Cette annonce n'est plus en ligne : son vendeur ne peut plus être contacté.",
    unavailable: "Votre message n'est pas parti. Vérifiez votre connexion et réessayez.",
  },
  dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
  // A conversation that could not be read (SPEC-V2 section 6, « Erreur »).
  error: {
    title: "Ça n'a pas fonctionné.",
    text: "Vos messages n'ont pas pu être chargés. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
    retry: "Réessayer",
    back: "Toutes les conversations",
  },
} as const;
