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
    // A request for an intervention of the adviser (DECISIONS.md 2026-11-23).
    advisorTeamInterventionSubject: (name: string | null, reference: string | null) =>
      `Demande d'intervention ${name ? of(name) : "d'un vendeur"}${reference ? ` (${reference})` : ""}`,
    advisorTeamIntervention:
      "Planifiez l'intervention avec le vendeur dans la conversation, puis marquez-la faite dans le back office : elle est alors comptée dans sa formule.",
    advisorTeamInterventionAction: "Voir la demande",
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
      `Votre formule ${plan}, au prix de ${amount} pour le bien ${property}, a été souscrite le ${date}.`,
    orderedUpgrade: (plan: string, amount: string, property: string, date: string) =>
      `Votre passage à la formule ${plan}, au prix de ${amount} pour le bien ${property}, a été souscrit le ${date}.`,
    vat: "TVA non applicable, article 293 B du CGI.",
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
      "Vous avez demandé que les prestations commencent avant la fin de ce délai : en cas de rétractation, nous vous remboursons tout de même l'intégralité du prix.",
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
    paid: (amount: string) => `Montant payé : ${amount}, une seule fois, pour ce bien.`,
    contactNow: "Votre conseiller Leenkey vous contacte sous 1\u00A0jour ouvré.",
    contactLater: (date: string) =>
      `Votre conseiller Leenkey vous contacte à partir du ${date}, après le délai de rétractation de 14\u00A0jours.`,
    // The invoice of the order (Cédric, 2026-11-26): attached, or to download.
    invoiceAttached:
      "Votre facture acquittée est jointe à cet email. Vous la retrouvez à tout moment dans votre espace, rubrique « Mes factures et paiements ».",
    invoiceLink:
      "Votre facture acquittée est à télécharger dans votre espace, rubrique « Mes factures et paiements » :",
    invoiceLinkLabel: "télécharger ma facture",
    action: "Voir ma formule",
  },
  // The confirmation of a refund, to the seller, with its credit note
  // (Cédric, 2026-11-26): once per credit note.
  planRefunded: {
    // `property` may be empty (a property without a reference nor a town).
    subject: (plan: string, property: string) =>
      property
        ? `Confirmation de votre remboursement · formule ${plan} · ${property}`
        : `Confirmation de votre remboursement · formule ${plan}`,
    title: "Votre remboursement est effectué",
    text: (amount: string, plan: string, property: string) =>
      `Nous vous avons remboursé ${amount} pour votre formule ${plan}${property ? ` (bien ${property})` : ""}, par le moyen de paiement utilisé lors de la commande, sans frais.`,
    withdrawal: (date: string) =>
      `Ce remboursement fait suite à l'exercice de votre droit de rétractation, le ${date}.`,
    bank: "Le délai pour le voir apparaître sur votre relevé dépend de votre banque.",
    keepsTitle: "Ce que vous conservez",
    keeps:
      "Votre annonce, vos documents, vos messages et l'avancement de votre vente restent en place : rien n'est supprimé. La formule en vigueur pour votre bien est indiquée dans votre espace.",
    // The date is the one of the credit note (Stripe), not of the refund itself.
    creditNoteAttached: (number: string, date: string) =>
      `Votre avoir ${number}, émis le ${date}, est joint à cet email. Vous le retrouvez à tout moment dans votre espace, rubrique « Mes factures et paiements ».`,
    creditNoteLink: (number: string, date: string) =>
      `Votre avoir ${number}, émis le ${date}, est à télécharger dans votre espace, rubrique « Mes factures et paiements » :`,
    creditNoteLinkLabel: "télécharger mon avoir",
    contact: (email: string) => `Pour toute question : ${email}.`,
    action: "Voir mes factures et paiements",
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
      `Nous vous remboursons ${amount} au plus tard 14 jours après votre demande, par le moyen de paiement utilisé lors de la commande, sans frais.`,
    early:
      "Vous aviez demandé un démarrage immédiat des prestations : le remboursement reste intégral.",
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
      `Formule ${plan} · ${property} · ${amount} payés · demande du ${at}`,
    early: "démarrage immédiat demandé : remboursement intégral tout de même",
    action: "Voir les remboursements",
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
  // L2-04b: an offer withdrawn by its buyer, to the seller (SPEC-V2 18: the
  // date and the time of the withdrawal).
  offerWithdrawn: {
    subject: (reference: string) => `Offre d'achat retirée · ${reference}`,
    title: "Une offre d'achat a été retirée",
    text: (buyer: string | null, price: string, property: string, date: string | null) =>
      `${buyer ?? "L'acquéreur"} a retiré son offre de ${price} pour votre bien «\u00A0${property}\u00A0»${date ? ` le ${date}` : ""}.`,
    next: "Cette offre n'attend plus de réponse de votre part. Vos autres offres en cours restent visibles dans votre espace.",
    action: "Voir l'offre",
    why: "Vous recevez cet email parce que vous avez reçu une offre d'achat sur Leenkey.",
  },
  // L2-04b: an offer past its validity, to its buyer and to its seller.
  offerExpired: {
    subject: (reference: string) => `Offre d'achat expirée · ${reference}`,
    title: "Offre d'achat expirée",
    buyerText: (price: string, property: string, date: string | null) =>
      `Votre offre de ${price} pour le bien «\u00A0${property}\u00A0» a expiré${date ? ` le ${date}` : ""} : le vendeur ne peut plus l'accepter.`,
    buyerNext:
      "Tant que l'annonce est en ligne, vous pouvez faire une nouvelle offre sur ce bien : elle reprend le contenu de celle-ci.",
    sellerText: (price: string, property: string, date: string | null) =>
      `L'offre de ${price} reçue pour votre bien «\u00A0${property}\u00A0» a expiré${date ? ` le ${date}` : ""} : elle ne peut plus être acceptée.`,
    sellerNext: "Vous pouvez échanger avec l'acquéreur dans la messagerie.",
    buyerAction: "Voir mon offre",
    sellerAction: "Voir l'offre",
    buyerWhy: "Vous recevez cet email parce que vous avez fait une offre d'achat sur Leenkey.",
    sellerWhy: "Vous recevez cet email parce que vous avez reçu une offre d'achat sur Leenkey.",
  },
  // L3-02: the emails of a visit on invitation (SPEC-V2 14 and 18). The exact
  // address goes to the buyer of a confirmed visit only; never a contact
  // detail of the other party.
  visit: {
    /** « le bien « Maison 5 pièces » », or words that need no title. */
    property: (title: string | null, mine: boolean) =>
      title
        ? `${mine ? "votre bien" : "le bien"} «\u00A0${title}\u00A0»`
        : mine
          ? "votre bien"
          : "le bien",
    address: (address: string) => `Adresse : ${address}`,
    calendar: "Le fichier joint à cet email ajoute la visite à votre agenda.",
    icsSummary: (title: string | null) => (title ? `Visite : ${title}` : "Visite"),
    icsBuyer: "Visite réservée sur Leenkey. Vous pouvez annuler jusqu'à 2 h avant la visite.",
    icsSeller: (buyer: string | null) =>
      buyer ? `Visite de ${buyer}, réservée sur Leenkey.` : "Visite réservée sur Leenkey.",
    buyerWhy:
      "Vous recevez cet email parce qu'un vendeur vous propose de visiter son bien sur Leenkey.",
    sellerWhy:
      "Vous recevez cet email parce que vous organisez les visites de votre bien sur Leenkey.",
    invited: {
      subject: (city: string | null) =>
        city ? `Invitation à visiter un bien à ${city}` : "Invitation à visiter un bien",
      title: "Invitation à visiter",
      text: (seller: string | null, property: string, city: string | null) =>
        `${seller ?? "Le vendeur"} vous invite à visiter ${property}${city ? ` à ${city}` : ""}.`,
      next: "Choisissez le créneau qui vous convient parmi ceux que le vendeur propose.",
      validity: (date: string) => `Cette invitation est valable jusqu'au ${date}.`,
      action: "Réserver un créneau",
    },
    booked: {
      subject: (date: string) => `Visite confirmée · ${date}`,
      title: "Visite confirmée",
      buyerText: (property: string, date: string) =>
        `Votre visite pour ${property} est confirmée : ${date}.`,
      buyerCancel: "Vous pouvez annuler jusqu'à 2 h avant la visite.",
      sellerText: (buyer: string | null, property: string, date: string) =>
        `${buyer ?? "Un acquéreur"} a réservé une visite de ${property} : ${date}.`,
      sellerNext: "Vous retrouvez cette visite dans l'onglet Visites de votre bien.",
      buyerAction: "Voir ma visite",
      sellerAction: "Voir mes visites",
      // The technical sheet of the property (DECISIONS.md 2026-11-24): a link
      // to the site, read once signed in; never a file in the email.
      sheetText:
        "Avant la visite, retrouvez les caractéristiques du bien dans sa fiche technique :",
      sheetLink: "Fiche technique du bien (PDF)",
    },
    cancelled: {
      subject: (date: string) => `Visite annulée · ${date}`,
      title: "Visite annulée",
      buyerText: (property: string, date: string) =>
        `Le vendeur a annulé votre visite pour ${property}, prévue ${date}.`,
      buyerNext:
        "Vous pouvez réserver un autre créneau depuis votre invitation tant qu'elle est valide.",
      sellerText: (buyer: string | null, property: string, date: string) =>
        `${buyer ?? "L'acquéreur"} a annulé sa visite de ${property}, prévue ${date}.`,
      sellerNext: "Vous n'avez rien à faire.",
      buyerAction: "Voir ma visite",
      sellerAction: "Voir mes visites",
    },
    reminder: {
      subject: (hour: string) => `Rappel : visite demain à ${hour}`,
      title: "Votre visite a lieu demain",
      buyerText: (property: string, date: string) =>
        `Nous vous rappelons votre visite pour ${property} : demain, ${date}.`,
      sellerText: (buyer: string | null, property: string, date: string) =>
        `Nous vous rappelons la visite de ${property} par ${buyer ?? "un acquéreur"} : demain, ${date}.`,
      buyerAction: "Voir ma visite",
      sellerAction: "Voir mes visites",
    },
    // L3-03: the request for feedback, the day after a visit that took place.
    feedback: {
      buyerSubject: "Votre retour sur votre visite",
      sellerSubject: "Votre note sur la visite de votre bien",
      title: "Comment s'est passée la visite ?",
      buyerText: (property: string, date: string) => `Vous avez visité ${property} ${date}.`,
      buyerNext:
        "Dites au vendeur votre intérêt pour ce bien, de 1 à 5, avec un commentaire si vous le souhaitez. Il lit votre retour tel que vous l'écrivez.",
      sellerText: (buyer: string | null, property: string, date: string) =>
        `${buyer ?? "Un acquéreur"} a visité ${property} ${date}.`,
      sellerNext:
        "Vous pouvez écrire une note sur cette visite : elle reste privée, l'acquéreur ne la lit pas. Son retour s'affiche sur la même page dès qu'il le donne.",
      delay: "Cette page reste ouverte 7 jours après la visite.",
      buyerAction: "Donner mon retour",
      sellerAction: "Voir la visite",
      buyerWhy: "Vous recevez cet email parce que vous avez visité un bien avec Leenkey.",
    },
  },
  // L3-04: the emails of the sale file (SPEC-V2 10, 15 and 18). Documents
  // shared, to the buyer: one email per property and per day, with the number
  // shared since the last one. A request to read the documents, to the
  // seller: the first name and the financing status of the buyer in its exact
  // words, never an amount, never a contact detail.
  documents: {
    shared: {
      subject: (count: number, city: string | null) =>
        `${count > 1 ? `${count}\u00A0documents partagés avec vous` : "Un document partagé avec vous"}${city ? ` · ${city}` : ""}`,
      title: (count: number) =>
        count > 1 ? "Des documents sont partagés avec vous" : "Un document est partagé avec vous",
      text: (count: number, title: string | null, city: string | null) => {
        const property = `${title ? `du bien «\u00A0${title}\u00A0»` : "d'un bien"}${city ? ` à ${city}` : ""}`;
        return count > 1
          ? `${count}\u00A0documents ${property} sont partagés avec vous.`
          : `Un document ${property} est partagé avec vous.`;
      },
      disclaimer:
        "Ces documents vous sont transmis par le vendeur. Leenkey ne garantit ni leur contenu ni leur exhaustivité.",
      action: "Voir les documents",
      why: "Vous recevez cet email parce qu'un vendeur partage les documents de son bien avec vous sur Leenkey.",
    },
    requested: {
      subject: (buyer: string | null) =>
        `${buyer ?? "Un acquéreur"} demande l'accès à vos documents`,
      title: "Demande d'accès à vos documents",
      text: (buyer: string | null, title: string | null) =>
        `${buyer ?? "Un acquéreur"} souhaite consulter les documents de votre bien${title ? ` «\u00A0${title}\u00A0»` : ""}.`,
      financing: "Financement",
      choice:
        "Vous choisissez : accorder l'accès partage vos documents avec cet acquéreur, refuser ne partage rien.",
      action: "Répondre à la demande",
    },
    // L3-05: documents the assistant could not read as what they should be,
    // to their seller: one email per property for those found together.
    needsAttention: {
      subject: (count: number) =>
        count > 1
          ? `${count}\u00A0documents de votre dossier sont à vérifier`
          : "Un document de votre dossier est à vérifier",
      title: (count: number) => (count > 1 ? "Documents à vérifier" : "Document à vérifier"),
      text: (count: number, title: string | null) => {
        const property = title ? ` de votre bien «\u00A0${title}\u00A0»` : "";
        return count > 1
          ? `En lisant les documents du dossier de vente${property}, notre assistant en a relevé ${count} à vérifier.`
          : `En lisant un document du dossier de vente${property}, notre assistant a relevé qu'il est à vérifier.`;
      },
      line: (document: string, problem: string) => `${document} : ${problem}`,
      unnamed: "Un document",
      problems: {
        illegible: "illisible",
        incomplete: "incomplet",
        wrong_type: "ne semble pas correspondre au type choisi",
      },
      help: "Ouvrez le fichier pour le vérifier. Si besoin, retirez-le de votre dossier et déposez-le à nouveau.",
      mention:
        "Aide à la lecture générée automatiquement. Elle ne remplace ni le diagnostiqueur ni le notaire.",
      action: "Voir mes documents",
    },
  },
  // L3-06: the daily digest of the alerts of a buyer (SPEC-V2 16 and 18), and
  // the listings similar to one sold. Public facts of the listings only.
  alerts: {
    why: "Vous recevez cet email parce que vous avez créé une alerte sur Leenkey.",
    listingFacts: (surface: string | null, rooms: number | null) =>
      [surface, rooms ? (rooms > 1 ? `${rooms}\u00A0pièces` : "1\u00A0pièce") : null]
        .filter(Boolean)
        .join(" · "),
    seeListing: "Voir l'annonce",
    manage: "Gérer mes alertes",
    digest: {
      subject: (count: number) =>
        count > 1
          ? `${count}\u00A0nouveaux biens correspondent à vos alertes`
          : "Un nouveau bien correspond à vos alertes",
      title: (count: number) =>
        count > 1 ? "De nouveaux biens pour vos alertes" : "Un nouveau bien pour vos alertes",
      text: (count: number) =>
        count > 1
          ? `${count}\u00A0biens publiés récemment correspondent à vos alertes.`
          : "Un bien publié récemment correspond à vos alertes.",
      more: (shown: number) =>
        `Voici les ${shown} plus récents. Les autres vous attendent dans vos recherches.`,
      searches: "Vos recherches",
      // The name of an alert that a mail client would turn into a link.
      unnamed: "Votre recherche",
      alertCount: (name: string, count: number) =>
        count > 1 ? `${name} (${count}\u00A0nouveaux biens)` : `${name} (1\u00A0nouveau bien)`,
      actionSearch: "Voir tous les biens",
      actionAlerts: "Voir mes alertes",
    },
    similar: {
      // The commune is left out when its name cannot go in an email (a link).
      subject: (city: string | null) =>
        city ? `Des biens similaires à ${city}` : "Des biens similaires sont en vente",
      title: "Des biens similaires sont en vente",
      text: (title: string | null, city: string | null) =>
        `${title ? `Le bien «\u00A0${title}\u00A0»` : "Un bien"}${city ? ` à ${city}` : ""}, que vous avez suivi, est vendu. Voici des biens proches, dans la même ville et pour un budget comparable.`,
      action: "Voir les biens à vendre",
    },
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
    details: (seller: string, amount: string) => `${seller} · ${amount} payés.`,
    earlyStart: "Démarrage immédiat demandé : premier contact sous 1\u00A0jour ouvré.",
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
  // L2-07: offers accepted on sales with an adviser since the last email, to the team.
  offersAccepted: {
    subject: (count: number, reference: string | null) =>
      count > 1
        ? `${count}\u00A0offres acceptées sur des ventes avec conseiller`
        : reference
          ? `Offre acceptée sur une vente avec conseiller (${reference})`
          : "Offre acceptée sur une vente avec conseiller",
    title: (count: number) => (count > 1 ? "Des offres acceptées" : "Une offre acceptée"),
    text: (count: number) =>
      count > 1
        ? `${count}\u00A0offres d'achat ont été acceptées sur des ventes avec conseiller.`
        : "Une offre d'achat a été acceptée sur une vente avec conseiller.",
    item: (reference: string, property: string | null) =>
      property ? `Offre ${reference} · ${property}` : `Offre ${reference}`,
    price: (price: string) => `Prix accepté : ${price}`,
    noPrice: "Offre à lire dans le back office.",
    next: "La suite revient au vendeur et à son notaire ; la formule de la vente prévoit l'accompagnement d'un conseiller.",
    action: (count: number) => (count > 1 ? "Voir les offres" : "Ouvrir l'offre"),
  },
  // 2026-11-21: the offers received on sales with an adviser since the last
  // email, to the team (answer of Cédric of 2026-11-19; cron of L1-22, grouped).
  offersReceived: {
    subject: (count: number, reference: string | null) =>
      count > 1
        ? `${count}\u00A0offres reçues sur des ventes avec conseiller`
        : reference
          ? `Offre reçue sur une vente avec conseiller (${reference})`
          : "Offre reçue sur une vente avec conseiller",
    title: (count: number) => (count > 1 ? "Des offres reçues" : "Une offre reçue"),
    text: (count: number) =>
      count > 1
        ? `${count}\u00A0offres d'achat ont été reçues sur des ventes avec conseiller.`
        : "Une offre d'achat a été reçue sur une vente avec conseiller.",
    item: (reference: string, property: string | null) =>
      property ? `Offre ${reference} · ${property}` : `Offre ${reference}`,
    price: (price: string) => `Prix proposé : ${price}`,
    noPrice: "Offre à lire dans le back office.",
    next: "Le vendeur n'a pas encore répondu ; la formule de la vente prévoit l'accompagnement d'un conseiller.",
    action: (count: number) => (count > 1 ? "Voir les offres" : "Ouvrir l'offre"),
  },
  // 2026-11-21: a proof of financing checked by the team, to its buyer.
  // « Vérifié », never « validé »; the check guarantees nothing.
  financingChecked: {
    subject: "Votre justificatif de financement est vérifié",
    title: "Votre justificatif est vérifié",
    text: (type: string | null) =>
      `Nous avons contrôlé votre justificatif de financement${type ? ` (${type})` : ""} : votre dossier affiche désormais « Justificatif vérifié ».`,
    next: "Les vendeurs voient ce statut, le type du document et la date de notre contrôle, jamais le document. Nous supprimons le fichier après ce contrôle.",
    scope:
      "Ce contrôle porte sur la présence du document et sa cohérence apparente avec votre projet : il ne garantit pas l'obtention de votre financement.",
    action: "Voir mon projet d'achat",
    why: "Vous recevez cet email parce que vous avez déposé un justificatif de financement sur Leenkey.",
  },
  // 2026-11-23: the identity document of a buyer checked or refused by the
  // team, to its buyer. « Vérifiée », never « validée »; never what the
  // document says.
  identityChecked: {
    subject: "Votre identité est vérifiée",
    title: "Votre identité est vérifiée",
    text: "Nous avons vérifié la pièce d'identité que vous avez déposée : votre espace affiche désormais « Identité vérifiée par Leenkey ».",
    next: "Les vendeurs dont vous visitez le bien voient cette mention, jamais le document. Nous supprimons le fichier après cette vérification. Nous ne gardons que le type de la pièce et les dates, jamais le fichier ni ce qu'il contient.",
    action: "Voir mon projet d'achat",
    why: "Vous recevez cet email parce que vous avez déposé une pièce d'identité sur Leenkey.",
  },
  identityRefused: {
    subject: "Votre pièce d'identité est à déposer de nouveau",
    title: "Nous n'avons pas pu vérifier votre pièce d'identité",
    text: "Nous avons examiné la pièce d'identité que vous avez déposée et nous n'avons pas pu la vérifier.",
    reason: (reason: string) => `Notre remarque : ${reason}`,
    next: "Nous supprimons son fichier. Vos visites déjà réservées sont conservées ; pour en réserver une autre, déposez une nouvelle pièce depuis votre espace.",
    action: "Déposer une pièce d'identité",
    why: "Vous recevez cet email parce que vous avez déposé une pièce d'identité sur Leenkey.",
  },
  // DECISIONS.md 2026-11-22: the request of the team to bring a listing into
  // line, its reminder 2 days before the deadline, the final notice of its
  // deletion. To its seller; an answer goes to Leenkey.
  listingCompliance: {
    listing: (title: string | null) => (title ? ` «\u00A0${title}\u00A0»` : ""),
    reason: (reason: string) => `Notre remarque : ${reason}`,
    why: "Vous recevez cet email parce que vous avez publié une annonce sur Leenkey.",
    requested: {
      subject: (reference: string) => `Votre annonce ${reference} est à mettre en conformité`,
      title: "Votre annonce est à mettre en conformité",
      text: (listing: string, date: string) =>
        `Nous avons relu votre annonce${listing} : elle est à modifier avant le ${date}.`,
      next: "Sans modification de votre part à cette date, nous pourrons la supprimer. Pour en parler, répondez simplement à cet email.",
      action: "Voir mon annonce",
    },
    reminder: {
      subject: (reference: string) =>
        `Rappel : votre annonce ${reference} est à mettre en conformité`,
      title: "Rappel : votre annonce est à mettre en conformité",
      text: (listing: string, date: string) =>
        `Votre annonce${listing} n'a pas été modifiée depuis notre demande. Il vous reste jusqu'au ${date}.`,
      next: "Sans modification de votre part à cette date, nous pourrons la supprimer. Pour en parler, répondez simplement à cet email.",
      action: "Modifier mon annonce",
    },
    deleted: {
      subject: (reference: string) => `Votre annonce ${reference} a été supprimée`,
      title: "Nous avons supprimé votre annonce",
      text: (listing: string) =>
        `Votre annonce${listing} n'a pas été mise en conformité dans le délai demandé : nous l'avons supprimée. Elle n'est plus visible des acquéreurs.`,
      next: "Vos conversations restent lisibles dans votre messagerie. Pour en parler, répondez simplement à cet email.",
      action: "Ouvrir Ma vente",
    },
  },
  // L1-30e (DECISIONS.md 2026-11-24): a listing changed by the team from the
  // back office, to its seller, with the reason. An answer goes to Leenkey.
  listingTeamEdited: {
    subject: (reference: string) => `Nous avons modifié votre annonce ${reference}`,
    title: "Nous avons modifié votre annonce",
    text: (listing: string) => `Notre équipe a modifié votre annonce${listing}.`,
    fields: {
      price: "le prix",
      title: "le titre",
      description: "la description",
    } as Record<string, string>,
    changed: (fields: readonly string[]) => `Modifié : ${fields.join(", ")}.`,
    price: (before: string, after: string) => `Prix : ${before} → ${after}.`,
    reason: (reason: string) => `Notre motif : ${reason}`,
    reasonInApp: "Notre motif est à lire dans l'historique de votre annonce.",
    next: "La modification figure dans l'historique de votre annonce. Pour en parler, répondez simplement à cet email.",
    action: "Voir mon annonce",
    // In review too: not « publié ».
    why: "Vous recevez cet email parce que vous avez une annonce sur Leenkey.",
  },
  // 2026-11-21: a report handled by the team, to its author. Never what was decided.
  reportHandled: {
    subject: "Votre signalement a été traité",
    title: "Votre signalement a été traité",
    text: (listing: string | null) =>
      `Notre équipe a examiné votre signalement${listing ? `, à propos de «\u00A0${listing}\u00A0»,` : ""} et l'a clos.`,
    next: "Nous ne détaillons pas la suite donnée. Si le problème continue, signalez de nouveau la conversation.",
    action: "Ouvrir la conversation",
    why: "Vous recevez cet email parce que vous avez signalé une conversation sur Leenkey.",
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
