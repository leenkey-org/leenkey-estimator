// Texts of the interface, part « emails » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// Transactional emails (SPEC-V2 section 18, DESIGN.md 14), texts of emails/.

import { of } from "./helpers";

export const frEmails = {
  brand: "Leenkey",
  greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,"),
  signature: "L'équipe Leenkey",
  footer: {
    why: "Vous recevez cet email parce que vous vendez un bien sur Leenkey.",
    whyBuyer: "Vous recevez cet email parce que vous avez contacté un vendeur sur Leenkey.",
    // A decision on the account itself (suspension, warning): seller or buyer.
    whyAccount: "Vous recevez cet email parce que vous avez un compte sur Leenkey.",
    preferences: "Gérer mes notifications",
    internal: "Notification interne du back office de Leenkey.",
  },
  // The reference in the subjects: one thread per listing in the inbox.
  // L1-13: a listing sent for review (SPEC-V2 section 18).
  listingReceived: {
    subject: (reference: string) => `Votre annonce est bien reçue (${reference})`,
    title: "Votre annonce est bien reçue",
    text: (title: string) => `Nous avons bien reçu « ${title} ».`,
    next: "Nous la relisons sous 24\u00A0h et vous prévenons par email dès qu'elle est en ligne, ou s'il faut la corriger.",
    action: "Voir ma vente",
  },
  // L1-22: the new messages of a conversation, in one email (SPEC-V2 10).
  newMessages: {
    subject: (name: string | null, count: number) =>
      count > 1
        ? `${count} nouveaux messages${name ? ` ${of(name)}` : ""}`
        : `Nouveau message${name ? ` ${of(name)}` : ""}`,
    about: (listing: string) => `À propos de «\u00A0${listing}\u00A0» :`,
    more: (count: number) =>
      count === 1 ? "Et un autre message." : `Et ${count} autres messages.`,
    // Its words may hold a link: never in an email (core/notifications/user-text.ts).
    hidden: "Ce message contient un lien ou une adresse : lisez-le sur Leenkey.",
    replyHint: "Pour répondre, écrivez sur Leenkey : une réponse à cet email ne lui parvient pas.",
    action: "Lire la conversation",
    // L1-34: the adviser to the seller; a seller to the team (internal).
    advisorSender: "votre conseiller Leenkey",
    advisorTeamSubject: (name: string | null, reference: string | null, count: number) =>
      `${count > 1 ? `${count} messages` : "Message"} ${name ? of(name) : "d'un vendeur"} à son conseiller${reference ? ` (${reference})` : ""}`,
    advisorTeamReply: "Répondez depuis le back office : le vendeur voit votre prénom.",
  },
  // L1-22: several listings sent for review at once, in one email (SPEC-V2 10).
  listingsToReview: {
    subject: (count: number) => `${count} annonces à valider`,
    title: (count: number) => `${count} annonces attendent votre relecture`,
    text: "Elles sont arrivées presque en même temps : les voici ensemble.",
    action: "Ouvrir les annonces à valider",
  },
  listingToReview: {
    subject: (reference: string) => `Annonce à valider (${reference})`,
    title: "Une annonce attend votre relecture",
    text: (title: string) => `« ${title} » vient d'être envoyée en validation.`,
    details: (reference: string, place: string, price: string, seller: string | null) =>
      [reference, place, price, seller].filter(Boolean).join(" · "),
    deadline: "Objectif : une réponse au vendeur sous 24\u00A0h.",
    action: "Relire l'annonce",
  },
  listingPublished: {
    subject: (reference: string) => `Votre annonce est en ligne (${reference})`,
    title: "Votre annonce est en ligne",
    text: (title: string) =>
      `Nous avons relu « ${title} » : elle est maintenant visible des acquéreurs sur Leenkey.`,
    tips: "Les premiers jours comptent : répondez vite aux messages et proposez des visites.",
    action: "Voir mon annonce",
  },
  listingRejected: {
    subject: (reference: string) => `Votre annonce est à corriger (${reference})`,
    title: "Votre annonce est à corriger",
    text: (title: string) => `Nous avons relu « ${title} » : elle ne peut pas encore être publiée.`,
    reason: "Ce qu'il faut corriger",
    next: "Corrigez-la depuis votre espace vendeur et renvoyez-la : nous la relisons sous 24\u00A0h.",
    // The way to contest a decision of moderation (DSA, article 17; /signalement).
    contest: {
      before: "Si vous n'êtes pas d'accord avec cette décision, écrivez-nous à ",
      after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    },
    action: "Corriger mon annonce",
  },
  listingSuspended: {
    subject: (reference: string) => `Votre annonce est suspendue (${reference})`,
    title: "Votre annonce est suspendue",
    text: (title: string) => `« ${title} » n'est plus visible des acquéreurs pour le moment.`,
    reason: "Motif",
    // Around the address, a mailto link. Delay of the contact form (CLAUDE.md 16), Q44.
    contest: {
      before: "Si vous n'êtes pas d'accord ou si vous avez corrigé le problème, écrivez-nous à ",
      after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    },
    action: "Voir mon Cockpit",
  },
  // L1-30a: an account suspended by the back office (SPEC-V2 17, « suspension
  // du compte (motif, email) »). Provisional text, as the listing one (Q71).
  // L1-26: a plan paid; the full summary of the order comes with L1-40.
  planActivated: {
    // The summary of the order, on a durable medium (L1-40, SPEC 11).
    subject: (plan: string, property: string) =>
      `Confirmation de votre souscription Leenkey · ${plan} · ${property}`,
    title: (plan: string) => `Votre formule ${plan} est activée`,
    text: (plan: string, property: string) =>
      `Merci : votre formule ${plan} est active pour votre bien ${property}.`,
    ordered: (plan: string, amount: string, property: string, date: string) =>
      `Votre formule ${plan}, au prix de ${amount} TTC pour le bien ${property}, a été souscrite le ${date}.`,
    orderedUpgrade: (plan: string, amount: string, property: string, date: string) =>
      `Votre passage à la formule ${plan}, au prix de ${amount} TTC pour le bien ${property}, a été souscrit le ${date}.`,
    duration: (until: string) =>
      `Durée du contrat : 12 mois, jusqu'au ${until}, sans renouvellement automatique. À l'échéance, votre bien repasse en Autonomie : votre annonce reste en ligne.`,
    includes: "Ce que comprend votre formule",
    terms: (cgu: string, cgv: string) =>
      `Vous avez accepté nos conditions générales d'utilisation (version du ${cgu}) et de vente (version du ${cgv}), à relire à tout moment :`,
    cgv: "conditions générales de vente",
    cgu: "conditions générales d'utilisation",
    withdrawalTitle: "Votre droit de rétractation",
    withdrawal: (date: string, email: string) =>
      `Vous pouvez renoncer à votre formule, sans motif, jusqu'au ${date} inclus : depuis votre espace (« Renoncer au contrat », sur la page de votre formule), par email à ${email}, ou avec le formulaire ci-dessous. Nous vous remboursons au plus tard 14 jours après votre demande, par le moyen de paiement utilisé, sans frais.`,
    withdrawalEarly:
      "Vous avez demandé que les prestations commencent avant la fin de ce délai : en cas de rétractation, un montant proportionnel aux prestations déjà fournies peut rester dû.",
    formTitle: "Formulaire de rétractation",
    form: (address: string, plan: string, reference: string, date: string) => [
      `À l'attention de ${address}.`,
      "Je vous notifie par la présente ma rétractation du contrat de prestation de services ci-dessous :",
      `Formule souscrite : ${plan}`,
      `Référence du bien : ${reference}`,
      `Commandée le : ${date}`,
      "Nom et prénom : ____________________",
      "Adresse : ____________________",
      "Adresse électronique : ____________________",
      "Date : ____________________",
      "Signature (uniquement sur papier) : ____________________",
    ],
    mediator: (name: string) => `Médiateur de la consommation : ${name}.`,
    mediatorPending: "Médiateur de la consommation : en cours de désignation.",
    paid: (amount: string) => `Montant payé : ${amount} TTC, une seule fois, pour ce bien.`,
    contactNow: "Votre conseiller Leenkey vous contacte sous 24\u00A0h.",
    contactLater: (date: string) =>
      `Votre conseiller Leenkey vous contacte à partir du ${date}, après le délai de rétractation de 14\u00A0jours.`,
    receipt: "Le reçu et la facture de votre paiement vous sont envoyés par email.",
    action: "Voir ma formule",
  },
  // L1-40: the acknowledgment of a withdrawal, to the seller.
  withdrawalReceived: {
    subject: (plan: string) => `Accusé de réception de votre rétractation · formule ${plan}`,
    title: "Votre rétractation est bien reçue",
    text: (at: string, plan: string, property: string, ordered: string) =>
      `Nous avons reçu le ${at} votre demande de rétractation pour la formule ${plan} (bien ${property}), souscrite le ${ordered}.`,
    replaced: (plan: string, ordered: string) =>
      `Elle comprend la formule ${plan}, souscrite le ${ordered} puis remplacée, encore dans son délai.`,
    refund: (amount: string) =>
      `Nous vous remboursons ${amount} TTC au plus tard 14 jours après votre demande, par le moyen de paiement utilisé lors de la commande, sans frais.`,
    early:
      "Vous aviez demandé un démarrage immédiat des prestations : un montant proportionnel à ce qui a déjà été fourni peut être retenu. Nous vous l'indiquons avant le remboursement.",
    contact: (email: string) => `Pour toute question : ${email}.`,
    action: "Voir ma formule",
  },
  // L1-40: withdrawals to refund, to the team (grouped).
  withdrawalsToProcess: {
    subject: (count: number, plan: string, property: string) =>
      count > 1
        ? `${count}\u00A0rétractations à rembourser`
        : `Rétractation à rembourser · formule ${plan} · ${property}`,
    title: (count: number) =>
      count > 1 ? `${count}\u00A0rétractations à rembourser` : "Une rétractation à rembourser",
    text: "À rembourser depuis Stripe sous 14 jours : le remboursement met fin à la formule. Une note est dans le dossier du bien.",
    item: (plan: string, property: string, amount: string, at: string) =>
      `Formule ${plan} · ${property} · ${amount} TTC payés · demande du ${at}`,
    early: "démarrage immédiat demandé : un montant proportionnel peut être retenu",
    action: "Voir les dossiers",
  },
  // L2-04a: an offer received, to its seller (SPEC-V2 18: amount, gap,
  // financing status, a link; never the PDF).
  offerReceived: {
    subject: (reference: string, price: string) => `Offre d'achat reçue : ${price} · ${reference}`,
    title: "Vous avez reçu une offre d'achat",
    text: (buyer: string | null, property: string) =>
      buyer
        ? `${buyer} vous a fait une offre d'achat pour votre bien «\u00A0${property}\u00A0».`
        : `Vous avez reçu une offre d'achat pour votre bien «\u00A0${property}\u00A0».`,
    asking: "Prix demandé",
    offer: "Offre reçue",
    gap: "Écart",
    noGap: "Aucun",
    financing: "Financement",
    validity: (date: string) =>
      `Cette offre est valable jusqu'au ${date}. Passé ce délai, elle expire.`,
    read: "Lisez l'offre complète et son analyse avant de répondre : vous pouvez l'accepter, la refuser ou en discuter avec l'acquéreur.",
    action: "Voir l'offre",
  },
  // L2-04a: the answer of the seller, to the buyer of the offer.
  offerAnswered: {
    subject: (accepted: boolean, reference: string) =>
      accepted
        ? `Votre offre d'achat a été acceptée · ${reference}`
        : `Votre offre d'achat a été refusée · ${reference}`,
    title: (accepted: boolean) =>
      accepted ? "Votre offre d'achat a été acceptée" : "Votre offre d'achat a été refusée",
    text: (accepted: boolean, price: string, property: string) =>
      accepted
        ? `Le vendeur a accepté votre offre de ${price} pour le bien «\u00A0${property}\u00A0».`
        : `Le vendeur a refusé votre offre de ${price} pour le bien «\u00A0${property}\u00A0».`,
    message: "Message du vendeur",
    acceptedNext:
      "Les conditions définitives de la vente seront déterminées avec le ou les notaires lors de la préparation de l'avant-contrat. Prenez contact avec le vendeur pour organiser la suite.",
    declinedNext:
      "Vous pouvez échanger avec le vendeur dans la messagerie, ou lui faire une nouvelle offre.",
    action: "Voir mon offre",
    why: "Vous recevez cet email parce que vous avez fait une offre d'achat sur Leenkey.",
  },
  // L1-40: a plan ending within 30 days, to its owner.
  planEnding: {
    subject: (plan: string, date: string) => `Votre formule ${plan} se termine le ${date}`,
    title: (plan: string) => `Votre formule ${plan} se termine bientôt`,
    text: (plan: string, property: string, date: string) =>
      `Votre formule ${plan} pour votre bien ${property} prend fin le ${date}.`,
    after:
      "Sans renouvellement, votre bien repasse en Autonomie : votre annonce reste en ligne et vous gardez tous les outils ; l'accompagnement de votre conseiller s'arrête.",
    renew: (email: string) =>
      `Pour la renouveler 12 mois au tarif en vigueur, ou choisir l'autre formule, répondez à cet email ou écrivez-nous à ${email}.`,
    action: "Voir ma formule",
  },
  planPurchased: {
    subject: (plan: string, property: string, upgrade: boolean) =>
      upgrade ? `Passage à ${plan} · ${property}` : `Formule ${plan} souscrite · ${property}`,
    title: (upgrade: boolean) =>
      upgrade ? "Passage à une formule supérieure" : "Nouvelle formule souscrite",
    text: (plan: string, property: string, upgrade: boolean) =>
      upgrade
        ? `Le vendeur de ${property} passe à ${plan}.`
        : `Le vendeur de ${property} a souscrit la formule ${plan}.`,
    details: (seller: string, amount: string) => `${seller} · ${amount} TTC payés.`,
    earlyStart: "Démarrage immédiat demandé : premier contact sous 24\u00A0h.",
    lateStart:
      "Pas de démarrage immédiat : premier contact à partir du 15e\u00A0jour, après le délai de rétractation.",
    heldSubject: (plan: string, property: string) =>
      `Paiement de la formule ${plan} à vérifier · ${property}`,
    heldTitle: "Paiement à vérifier",
    heldText: (plan: string, property: string) =>
      `Le vendeur de ${property} a payé la formule ${plan} : elle n'est pas activée, la commande est à vérifier. Écrivez-lui sous 24\u00A0h pour l'activer ou la rembourser.`,
    check: "À vérifier :",
    action: "Voir les dossiers",
  },
  // L1-30c: a warning after a report. Provisional wording, to be validated by Cédric (Q74).
  userWarned: {
    subject: "Un message de l'équipe Leenkey",
    title: "Un rappel de l'équipe Leenkey",
    text: "Un de vos échanges sur Leenkey nous a été signalé. Merci de tenir compte de ce message de l'équipe.",
    reason: "Message de l'équipe",
    next: "En cas de nouveau manquement, votre compte pourra être suspendu.",
    contest: {
      before: "Si vous n'êtes pas d'accord, écrivez-nous à ",
      after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    },
  },
  // L1-30c: reports, to the team (cron of L1-22, grouped).
  reportsToReview: {
    subject: (count: number, reference: string | null) =>
      count > 1
        ? `${count}\u00A0conversations signalées`
        : reference
          ? `Conversation signalée (${reference})`
          : "Conversation signalée",
    title: (count: number) =>
      count > 1 ? "Des conversations ont été signalées" : "Une conversation a été signalée",
    text: (count: number) =>
      count > 1
        ? `${count}\u00A0conversations ont été signalées.`
        : "Un utilisateur a signalé une conversation.",
    reason: "Motif",
    action: (count: number) => (count > 1 ? "Voir les signalements" : "Voir le signalement"),
  },
  // L1-31: the requests written to the team since the last email (cron of L1-22, grouped).
  caseRequests: {
    subject: (count: number, reference: string | null) =>
      count > 1
        ? `${count}\u00A0demandes à traiter`
        : reference
          ? `Nouvelle demande à traiter (${reference})`
          : "Nouvelle demande à traiter",
    title: (count: number) => (count > 1 ? "Des demandes à traiter" : "Une demande à traiter"),
    text: (count: number) =>
      count > 1
        ? `${count}\u00A0demandes ont été envoyées à l'équipe Leenkey.`
        : "Un utilisateur a écrit à l'équipe Leenkey.",
    from: (name: string, reference: string | null) => (reference ? `${name} · ${reference}` : name),
    noSubject: "Demande à lire dans le dossier.",
    action: (count: number) => (count > 1 ? "Voir les dossiers" : "Ouvrir le dossier"),
  },
  // 2026-11-08: the accounts confirmed since the last email, to the team (cron of L1-22, grouped).
  accountsCreated: {
    subject: (count: number) =>
      count > 1 ? `${count}\u00A0nouveaux comptes sur Leenkey` : "Nouveau compte sur Leenkey",
    title: (count: number) => (count > 1 ? "De nouveaux comptes" : "Un nouveau compte"),
    text: (count: number) =>
      count > 1
        ? `${count}\u00A0personnes ont confirmé leur adresse email et créé leur compte.`
        : "Une personne a confirmé son adresse email et créé son compte.",
    action: (count: number) => (count > 1 ? "Voir les comptes" : "Voir le compte"),
  },
  accountSuspended: {
    subject: "Votre compte Leenkey est suspendu",
    title: "Votre compte est suspendu",
    text: "Vous pouvez toujours vous connecter, mais votre compte ne permet plus de publier une annonce, d'envoyer un message ni d'utiliser l'assistant pour le moment.",
    reason: "Motif",
    contest: {
      before: "Si vous n'êtes pas d'accord, écrivez-nous à ",
      after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    },
  },
} as const;
