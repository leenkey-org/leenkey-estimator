// Texts of the interface, part « adminMessages » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-34: the shared inbox of the advisor conversations (SPEC-V2 section 17).

export const frAdminMessages = {
  metaTitle: "Messages clients · Back office · Leenkey",
  detailMetaTitle: (name: string) => `${name} · Messages clients · Back office · Leenkey`,
  title: "Messages clients",
  summary: {
    unread: (count: number) => `${count}\u00A0non ${count > 1 ? "lus" : "lu"}`,
    late: (count: number) => `${count}\u00A0en attente depuis plus de 24\u00A0h`,
  },
  filters: {
    label: "Formule des biens",
    all: "Toutes",
  },
  list: "Conversations avec les vendeurs",
  unread: "Non lu",
  // The seller wrote last, more than 24 h ago (in orange, SPEC section 17).
  late: (waiting: string) => `En attente depuis ${waiting}`,
  mine: (body: string) => `Leenkey : ${body}`,
  closed: "Fermée",
  noName: "Vendeur",
  empty: {
    title: "Aucune conversation",
    text: "Les conversations avec les vendeurs d'une formule Accompagné ou Sérénité arrivent ici, dès le paiement.",
    filteredTitle: "Aucune conversation pour cette formule",
    filteredText: "Choisissez « Toutes » pour voir les autres conversations.",
  },
  error: "Les messages n'ont pas pu être chargés.",
  retry: "Réessayer",
  back: "Tous les messages",
} as const;
