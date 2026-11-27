// Texts of the interface, part « adminRefunds » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// The refunds of the back office and their credit notes (DECISIONS.md 2026-11-25).

export const frAdminRefunds = {
  metaTitle: "Remboursements · Back office · Leenkey",
  title: "Remboursements",
  lead: "Une rétractation arrête les prestations payantes concernées dès la demande ; elle se rembourse depuis Stripe, sous 14 jours après la demande (code de la consommation, article L221-24). Après un passage à une formule supérieure, le vendeur renonce au passage seul ou aux deux commandes : chaque paiement se rembourse à part. Le statut se met à jour tout seul quand Stripe confirme le remboursement, puis l'avoir est créé et envoyé au vendeur.",
  summary: {
    toRefund: (count: number) => `${count}\u00A0à rembourser`,
    late: (count: number) => `dont ${count}\u00A0en retard`,
    creditNotes: (count: number) =>
      `${count}\u00A0${count > 1 ? "avoirs à créer" : "avoir à créer"}`,
    none: "Aucun remboursement en attente",
  },
  table: {
    label: "Remboursements",
    seller: "Vendeur et bien",
    plan: "Formule",
    amount: "À rembourser",
    requested: "Demande",
    status: "Statut et avoir",
  },
  status: {
    // Cédric's wording (2026-11-26), while something is left to refund of a withdrawal.
    withdrawalPending: "Rétractation – Remboursement en attente",
    to_refund: "À rembourser",
    late: "En retard",
    partial: "Remboursé partiellement",
    refunded: "Remboursé",
    refundedOn: (date: string) => `Remboursé le ${date}`,
  },
  noRequest: "Sans rétractation",
  requestedOn: (date: string) => `Demande du ${date}`,
  deadlineOn: (date: string) => `Au plus tard le ${date}`,
  refundedAmount: (amount: string) => `${amount} remboursés`,
  // A withdrawal: what is due, refunded and left for this payment, then for the request.
  due: (amount: string) => `Dû : ${amount}`,
  refunded: (amount: string) => `Déjà remboursé : ${amount}`,
  left: (amount: string) => `Reste à rembourser : ${amount}`,
  requestTotal: (due: string, left: string, payments: number) =>
    `Rétractation de ${due} en ${payments}\u00A0paiements : reste ${left}`,
  backTo: (plan: string) => `Le vendeur revient à ${plan}`,
  replacedBy: (plan: string) => `Remplacée par ${plan}, renoncée avec elle : paiement à part`,
  noSeller: "Vendeur",
  noProperty: "Bien sans annonce",
  stripe: "Rembourser dans Stripe",
  stripeLabel: (who: string) => `Rembourser dans Stripe : ${who} (nouvel onglet)`,
  stripeSeen: "Voir le paiement dans Stripe",
  stripeSeenLabel: (who: string) => `Voir le paiement dans Stripe : ${who} (nouvel onglet)`,
  noPayment: "Paiement introuvable dans Stripe : voir le dossier du bien.",
  creditNote: {
    open: (number: string) => `Avoir ${number}`,
    openLabel: (number: string) => `Ouvrir l'avoir ${number} (PDF, nouvel onglet)`,
    missing: "Avoir à créer",
    create: "Créer l'avoir",
    creating: "Création…",
    // After « Créer l'avoir » (retryCreditNote): by what its `emails` says.
    created: "Avoir créé.",
    createdEmailed: "Avoir créé et envoyé au vendeur par email.",
    createdNotEmailed:
      "Avoir créé. L'email au vendeur n'est pas parti : utilisez « Renvoyer l'email ».",
    // The confirmation of refund to the seller (pendingRefundEmails, resendRefundEmail).
    email: {
      pending: "Email de remboursement à envoyer",
      resend: "Renvoyer l'email",
      resending: "Envoi…",
      sent: (count: number) =>
        count > 1
          ? `${count}\u00A0emails de remboursement envoyés au vendeur, chacun avec son avoir.`
          : "Email de remboursement envoyé au vendeur, avec son avoir.",
      failed: "L'email n'a pas pu partir. Réessayez dans quelques minutes.",
      nothing: "Aucun email à envoyer : le vendeur l'a déjà reçu, ou un envoi est en cours.",
      errors: {
        forbidden: "Cette action est réservée à l'équipe.",
        invalid: "Ce remboursement est introuvable.",
        not_found: "Ce remboursement est introuvable.",
        unavailable: "L'email n'a pas pu partir. Réessayez dans quelques minutes.",
      },
    },
    nothing:
      "Aucun avoir de plus à créer : le remboursement est peut-être encore en cours chez Stripe. Réessayez dans quelques minutes.",
    errors: {
      forbidden: "Cette action est réservée à l'équipe.",
      invalid: "Ce remboursement est introuvable.",
      not_found: "Ce remboursement est introuvable.",
      no_invoice:
        "Ce paiement n'a pas de facture Stripe : l'avoir est à faire à la main dans Stripe.",
      unavailable: "L'avoir n'a pas pu être créé. Réessayez dans quelques minutes.",
    },
  },
  empty: {
    title: "Aucun remboursement",
    text: "Les rétractations des vendeurs et les remboursements faits dans Stripe s'affichent ici.",
  },
  error: "Les remboursements n'ont pas pu être chargés.",
  retry: "Réessayer",
} as const;
