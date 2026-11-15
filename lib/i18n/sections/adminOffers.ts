// Texts of the interface, part « adminOffers » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L2-07: the offers of the back office (SPEC-V2 section 17).

export const frAdminOffers = {
  metaTitle: "Offres · Back office · Leenkey",
  detailMetaTitle: (reference: string) => `${reference} · Offres · Back office · Leenkey`,
  title: "Offres",
  summary: {
    waiting: (count: number) =>
      `${count}\u00A0${count > 1 ? "offres en attente de réponse" : "offre en attente de réponse"}`,
    accepted: (count: number) => `${count}\u00A0${count > 1 ? "acceptées" : "acceptée"}`,
    total: (count: number) => `${count}\u00A0au total`,
  },
  filters: {
    label: "Statut des offres",
    all: "Toutes",
    waiting: "En attente",
    accepted: "Acceptées",
    declined: "Refusées",
    ended: "Terminées",
  },
  search: {
    label: "Rechercher une offre",
    placeholder: "Référence, ville, acquéreur ou vendeur",
    submit: "Rechercher",
  },
  // The list read from the sheet of an account.
  account: {
    note: "Offres envoyées ou reçues par ce compte.",
    clear: "Voir toutes les offres",
  },
  limited: (count: number) =>
    `Les ${count}\u00A0premières offres sont affichées : précisez la recherche ou le filtre.`,
  table: {
    label: "Offres",
    offer: "Offre",
    property: "Bien",
    plan: "Formule",
    price: "Prix proposé",
    gap: "Écart au prix affiché",
    status: "Statut",
    sent: "Envoyée",
  },
  parties: (buyer: string, seller: string) => `${buyer} → ${seller}`,
  noName: "Compte sans nom",
  noProperty: "Annonce retirée",
  noGap: "Au prix affiché",
  openLabel: (reference: string) => `Ouvrir l'offre ${reference}`,
  sentOn: (date: string) => `Envoyée le ${date}`,
  empty: {
    title: "Aucune offre",
    text: "Les offres d'achat envoyées par les acquéreurs apparaissent ici.",
    search: (query: string) => `Aucune offre ne correspond à « ${query} ».`,
    filter: "Aucune offre avec ce statut.",
    action: "Voir toutes les offres",
  },
  retry: "Réessayer",
  error: "Les offres n'ont pas pu être chargées.",
  back: "Toutes les offres",
  detail: {
    error: "Cette offre n'a pas pu être chargée.",
    version: (version: number) => `Version ${version}`,
    facts: "Offre",
    buyer: "Acquéreur",
    seller: "Vendeur",
    property: "Bien",
    plan: "Formule de la vente",
    sent: "Envoyée le",
    answered: "Réponse du vendeur le",
    pdf: "Ouvrir le PDF de l'offre",
    summary: "Synthèse lue par le vendeur",
    summaryTitle: (reference: string) => `Offre ${reference}`,
    document: "Document de l'offre",
    history: "Historique",
    readOnly:
      "Lecture seule : l'offre appartient à son acquéreur et à son vendeur. L'équipe ne l'accepte, ne la refuse et ne la modifie jamais à leur place.",
  },
  // « Marquer comme analysée »: the task of the team of the sale.
  analysis: {
    title: "Analyse avec le conseiller",
    intro:
      "La formule de ce bien comprend l'analyse de ses offres avec un conseiller. Une fois l'offre analysée avec le vendeur, cochez la tâche de sa vente.",
    mark: "Marquer comme analysée",
    doneOn: (date: string) => `Offre analysée avec le conseiller le ${date}.`,
    done: "La tâche « Offre analysée avec le conseiller » est cochée sur la vente.",
    stale: "La tâche était déjà cochée : la fiche est à jour.",
    failed: "La tâche n'a pas pu être cochée. Réessayez dans un instant.",
  },
  precontract: {
    title: "Avant-contrat",
    intro:
      "La formule de ce bien comprend le suivi jusqu'à la signature : vous pouvez enregistrer les dates de l'avant-contrat à la place du vendeur. La saisie est tracée.",
    none: "Aucun avant-contrat enregistré pour cette offre.",
  },
} as const;
