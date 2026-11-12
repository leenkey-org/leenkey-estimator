// Texts of the interface, part « billing » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-26: the plan of a property and its payment (SPEC-V2 8.8 and 11,
// DESIGN.md 12.4). The texts of the plans come from the plans table.

import type { Database } from "@/types/database";

export const frBilling = {
  metaTitle: "Choisir ma formule · Leenkey",
  header: "Choisir ma formule",
  back: "Retour à ma vente",
  // Under the steps of « Ma vente ».
  entry: "Voir les formules",
  title: "Un forfait fixe par bien. Jamais de commission.",
  lead: "Le prix ne dépend pas de la valeur de votre bien. Vous pouvez passer à une formule supérieure à tout moment.",
  property: (name: string) => `Pour ${name}`,
  /** `total`: all the properties of the seller, this one included. */
  otherProperties: (total: number) =>
    total > 2 ? `Choisir un autre de vos ${total}\u00A0biens` : "Choisir votre autre bien",
  otherPropertiesLabel: "Vos autres biens",
  free: "Gratuit",
  taxes: "TTC",
  // The comparison table of the plans (SPEC-V2 11 bis, wording of the plans
  // of 2026-11-06): a row without a feature is in every plan (the steps of
  // a sale never depend on a plan); a row with one is ticked for the plans
  // that have it in plan_entitlements (L1-33), so that the table never
  // says other than the rights.
  comparison: {
    title: "Comparer les formules",
    caption: "Ce que comprend chaque formule",
    toggle: "Comparer les formules en détail",
    feature: "Ce qui est inclus",
    included: "Inclus",
    notIncluded: "Non inclus",
    rows: [
      { label: "Analyse de valeur" },
      { label: "Espace vendeur / tableau de bord" },
      { label: "Assistant IA" },
      { label: "Création de l'annonce avec l'IA" },
      { label: "Publication sur Leenkey" },
      { label: "Messagerie acquéreurs" },
      { label: "Agenda / visites" },
      { label: "Réception d'offres structurées" },
      { label: "Checklist des documents" },
      { label: "Conseiller dédié", feature: "advisor" },
      {
        label: "Regard personnalisé sur le prix et la stratégie",
        feature: "human_price_strategy",
      },
      { label: "Relecture et optimisation de l'annonce", feature: "human_listing_review" },
      {
        label: "Analyse des offres et des informations de financement",
        feature: "human_offer_analysis",
      },
      {
        label: "Aide à la décision jusqu'à l'acceptation d'une offre",
        feature: "negotiation_support",
      },
      { label: "Préparation du dossier de vente", feature: "sale_file_building" },
      { label: "Analyse des documents", feature: "deep_document_review" },
      {
        label: "Aide à la préparation des échanges avec le notaire",
        feature: "notary_coordination",
      },
      { label: "Suivi jusqu'à la signature", feature: "closing_follow_up" },
    ] as const satisfies readonly {
      label: string;
      feature?: Database["public"]["Enums"]["plan_feature"];
    }[],
  },
  badge: "Le plus complet",
  current: "Formule actuelle",
  activeSince: (since: string, until: string) => `Active depuis le ${since}, jusqu'au ${until}.`,
  included: "Comprise dans votre formule",
  choose: (plan: string) => `Choisir ${plan}`,
  upgrade: (plan: string, price: string) => `Passer à ${plan} pour ${price}`,
  reassurance:
    "Paiement sécurisé par carte via Stripe. Reçu envoyé par email. Forfait payé une fois, pour ce bien. Sans abonnement.",
  sold: "Ce bien est vendu : il n'y a plus de formule à choisir.",
  noProperty: {
    title: "Aucun bien pour l'instant",
    text: "Une formule se choisit pour un bien : créez d'abord votre annonce.",
    action: "Créer mon annonce",
  },
  closed: {
    title: "Les formules payantes ouvrent bientôt",
    text: "Pour être accompagné dès maintenant, écrivez-nous : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    action: "Nous écrire",
  },
  error: "Les formules n'ont pas pu être chargées.",
  retry: "Réessayer",
  recap: {
    title: "Récapitulatif de votre commande",
    plan: "Formule",
    property: "Bien",
    price: "Prix",
    priceValue: (price: string) => `${price} TTC, payé une fois`,
    upgradeValue: (price: string, from: string) =>
      `${price} TTC : la différence avec ${from}, déjà payée`,
    duration: "Durée",
    durationValue:
      "12 mois à partir du paiement, renouvelables à l'échéance, jamais automatiquement. Sans renouvellement, votre bien repasse en Autonomie.",
    withdrawal: "Rétractation",
    withdrawalValue: "Vous pouvez renoncer au contrat pendant 14 jours après la commande.",
    mediator: "Médiateur de la consommation",
    mediatorPending: "En cours de désignation.",
    includes: "Ce qui est compris",
    terms: {
      before: "J'ai lu et j'accepte les ",
      cgu: "conditions générales d'utilisation",
      and: " et les ",
      cgv: "conditions générales de vente",
      after: (cgu: string, cgv: string) => ` (versions du ${cgu} et du ${cgv}).`,
    },
    earlyStart:
      "Je demande que les prestations commencent avant la fin du délai de rétractation de 14 jours.",
    earlyStartHelp:
      "Sans cette demande, votre conseiller vous contacte à partir du 15e jour. Vous pouvez renoncer au contrat pendant 14 jours dans tous les cas.",
    pay: (price: string) => `Commander et payer ${price} TTC`,
    change: "Changer de formule",
    termsRequired: "Cochez la case pour accepter les conditions générales.",
  },
  errors: {
    session: "Votre session a expiré. Reconnectez-vous pour commander.",
    suspended:
      "Votre compte est suspendu : il ne permet pas de commander une formule pour le moment.",
    invalid: "Cochez la case pour accepter les conditions générales.",
    termsChanged:
      "Les conditions générales viennent d'être mises à jour : rechargez la page pour lire la nouvelle version avant de payer.",
    notFound: "Ce bien n'existe plus.",
    sold: "Ce bien est vendu : il n'y a plus de formule à choisir.",
    current: "Cette formule est déjà la vôtre pour ce bien.",
    withdrawn:
      "Votre rétractation est en cours : il n'est pas possible de commander une autre formule pour ce bien d'ici le remboursement.",
    lower: "Votre formule actuelle comprend déjà celle-ci.",
    closed: "Les formules payantes ne sont pas encore ouvertes à la commande.",
    unavailable:
      "Le paiement n'est pas disponible pour le moment. Réessayez dans quelques minutes.",
    network: "Pas de réponse du serveur : rien n'a été débité. Réessayez.",
  },
  cancelled: "Le paiement a été annulé : rien n'a été débité.",
  // L1-40: « Renoncer au contrat » during the 14 days (SPEC 11).
  withdrawal: {
    title: "Droit de rétractation",
    text: (date: string) =>
      `Vous pouvez renoncer à votre formule, sans motif, jusqu'au ${date} inclus. Nous vous remboursons sous 14 jours.`,
    early:
      "Vous avez demandé que les prestations commencent avant la fin de ce délai : un montant proportionnel à ce qui a déjà été fourni peut rester dû.",
    action: "Renoncer au contrat",
    dialogTitle: "Renoncer à votre formule ?",
    dialogText: (plan: string, property: string, date: string) =>
      `Formule ${plan} pour ${property}, souscrite le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé lors de la commande.`,
    dialogEmail: (email: string) => `Un accusé de réception part à ${email}.`,
    dialogName: (name: string) => `Au nom de ${name}.`,
    dialogReplaced: (plan: string, date: string) =>
      `Votre formule ${plan}, souscrite le ${date} puis remplacée, est encore dans son délai : elle est comprise dans cette rétractation.`,
    confirm: "Confirmer la rétractation",
    labels: { back: "Retour", close: "Fermer", cancel: "Annuler" },
    done: (date: string) =>
      `Rétractation enregistrée le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé ; un accusé de réception vous a été envoyé par email.`,
    doneNoEmail: (date: string, email: string) =>
      `Rétractation enregistrée le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé. L'accusé de réception n'a pas pu partir par email : cette page en tient lieu, et vous pouvez le demander à ${email}.`,
    withdrawnNote:
      "Votre rétractation est en cours : il n'est pas possible de commander une autre formule pour ce bien d'ici le remboursement.",
    errors: {
      session: "Votre session a expiré. Reconnectez-vous pour renoncer au contrat.",
      over: "Le délai de rétractation de 14 jours est passé. Pour toute question, écrivez-nous à contact.leenkey@gmail.com.",
      notInForce: "Cette formule n'est plus en vigueur : la rétractation ne s'applique plus.",
      unavailable:
        "La rétractation n'a pas pu être enregistrée. Réessayez, ou écrivez-nous à contact.leenkey@gmail.com.",
    },
  },
  confirmation: {
    pendingTitle: "Paiement en cours de confirmation",
    pendingText: "Stripe nous confirme votre paiement : cela prend quelques secondes.",
    slowText:
      "La confirmation prend plus de temps que prévu. Ne relancez pas le paiement : vous recevrez un email dès qu'elle arrive. Vous pouvez aussi recharger la page.",
    heldTitle: "Paiement reçu",
    heldText:
      "Nous vérifions votre commande avant d'activer la formule : l'équipe Leenkey vous écrit sous 24\u00A0h.",
    reload: "Recharger la page",
    doneTitle: "C'est activé.",
    doneNow: (plan: string) =>
      `Votre formule ${plan} est active. Votre conseiller Leenkey vous contacte sous 24\u00A0h.`,
    doneLater: (plan: string, date: string) =>
      `Votre formule ${plan} est active. Votre conseiller Leenkey vous contacte à partir du ${date}, après le délai de rétractation.`,
    back: "Retour à ma vente",
  },
} as const;
