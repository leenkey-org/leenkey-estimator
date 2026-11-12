// Texts of the interface, part « listing » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-17: listing page /annonce/[slug] (SPEC-V2 8.5, docs/DESIGN.md 10.2, 10.3, 12.7, 12.8).

import { of } from "./helpers";

export const frListing = {
  photoAlt: (index: number, total: number, subject: string) =>
    `Photo ${index} sur ${total}, ${subject}`,
  metaTitle: (summary: string, place: string, price: string) =>
    `${summary} ${place} · ${price} · Leenkey`,
  breadcrumb: "Fil d'Ariane",
  breadcrumbRoot: "Acheter",
  // The back link of a listing, the button over the mobile gallery included.
  backToListings: "Retour aux annonces",
  // L1-60, in the way of Airbnb: the actions beside the title, over the
  // mobile photo; the type and the place, the facts in one line; the seller;
  // the strong points, from the data of the listing only.
  share: {
    label: "Partager",
    copied: "Lien de l'annonce copié.",
    error: "Le lien n'a pas pu être copié. Copiez l'adresse de la page.",
  },
  overview: (kind: string, place: string) => `${kind} ${place}`,
  host: {
    title: (firstName: string) => `Proposé par ${firstName}`,
    unknown: "Proposé par le propriétaire",
    owner: "Propriétaire",
  },
  highlights: {
    label: "Points forts",
    commission: {
      title: "Sans commission d'agence",
      text: "Vous achetez directement au propriétaire.",
    },
    garden: "Jardin",
    terrace: "Terrasse",
    balcony: "Balcon",
    outdoorText: "Un espace extérieur avec le bien.",
    parking: { title: "Parking", text: "Stationnement avec le bien." },
    elevator: {
      title: "Ascenseur",
      text: (floor: string) => `${floor} étage, immeuble avec ascenseur.`,
    },
    energy: {
      title: (dpe: string) => `Classe énergie ${dpe}`,
      text: "Diagnostic de performance énergétique (DPE).",
    },
    newBuild: {
      title: "Logement neuf",
      text: (year: number | null) => (year ? `Construit en ${year}.` : "Un bien neuf."),
    },
  },
  summary: {
    rooms: (rooms: number) => (rooms === 1 ? "1 pièce" : `${rooms} pièces`),
  },
  // L1-16: the area of the listing, never its address (docs/DESIGN.md 8).
  map: {
    title: "Où se situe le bien",
    region: "Carte du secteur du bien",
    sector: (place: string) => `Secteur approximatif, ${place}`,
    streetView: "Voir la rue",
    backToMap: "Revenir à la carte",
    noStreetView: "Pas de vue de la rue dans ce secteur.",
    streetViewError: "La vue de la rue n'a pas pu s'ouvrir. Réessayez dans un instant.",
  },
  gallery: {
    none: "Pas encore de photo pour ce bien.",
    counter: (index: number, total: number) => `${index} / ${total}`,
    open: (index: number, total: number) => `Agrandir la photo ${index} sur ${total}`,
    // The button over the desktop mosaic (L1-60).
    all: "Afficher toutes les photos",
    viewer: "Photos du bien",
    close: "Fermer",
    previous: "Photo précédente",
    next: "Photo suivante",
  },
  priceBlock: {
    perSquareMetre: (value: string) => `${value}, sans commission`,
  },
  keyFigures: {
    surface: "surface",
    land: "terrain",
    rooms: (rooms: number) => (rooms === 1 ? "pièce" : "pièces"),
    bedrooms: (bedrooms: number) => (bedrooms === 1 ? "chambre" : "chambres"),
    floor: "étage",
    levels: (levels: number) => (levels === 1 ? "niveau" : "niveaux"),
    orientation: "exposition",
    buildYear: "construction",
    groundFloor: "RDC",
    basement: "sous-sol",
  },
  ordinal: (value: number) => (value === 1 ? "1er" : `${value}e`),
  contact: {
    owner: (firstName: string) => `${firstName}, propriétaire`,
    ownerUnknown: "Le propriétaire",
    accompanied: "Vente accompagnée par Leenkey",
  },
  description: {
    title: "Le bien",
    more: "Lire la suite",
    less: "Réduire",
  },
  facts: {
    title: "Ce que vous savez avant de visiter",
    // The first ones, then all of them in a dialog (L1-60).
    all: (count: number) => `Afficher les ${count} caractéristiques`,
    close: "Fermer",
    // Groups of the grid of the listing page (L1-55).
    sections: {
      property: "Caractéristiques",
      energy: "Énergie",
      costs: "Coûts et copropriété",
      /** Without a co-ownership: the property tax alone. */
      costsOnly: "Coûts",
    },
    notProvided: "Non renseigné",
    yes: "Oui",
    no: "Non",
    none: "Aucun",
    charges: "Charges de copropriété",
    chargesValue: (amount: string) => `${amount} / mois`,
    propertyTax: "Taxe foncière",
    propertyTaxValue: (amount: string) => `${amount} / an`,
    dpe: "Classe énergie (DPE)",
    ges: "Émissions (GES)",
    notSubject: "Non soumis au DPE",
    // L1-66: the figures of the label, beside its classes.
    classWithFigure: (letter: string, figure: string) => `${letter} · ${figure}`,
    energyUseValue: (value: string) => `${value} kWh/m²/an`,
    gesEmissionsValue: (value: string) => `${value} kg CO₂/m²/an`,
    heating: "Chauffage",
    type: "Type de bien",
    surface: "Surface habitable",
    landSurface: "Surface du terrain",
    carrez: "Surface Carrez",
    rooms: "Pièces",
    bedrooms: "Chambres",
    floor: "Étage",
    floorOf: (floor: string, total: number) => `${floor} sur ${total}`,
    groundFloor: "Rez-de-chaussée",
    basement: "Sous-sol",
    levels: "Niveaux",
    elevator: "Ascenseur",
    orientation: "Exposition",
    construction: "Construction",
    newBuild: "Neuf",
    buildYearNew: (year: number) => `${year}, neuf`,
    outdoor: "Extérieur",
    parking: "Stationnement",
    cellar: "Cave",
    coproLots: "Lots de copropriété",
    votedWorks: "Travaux votés",
    procedures: "Procédures en cours",
  },
  // L1-65: the mentions a listing for sale carries (code de la construction
  // L126-33 ; Géorisques: Cédric, 2026-11-09). Wordings: DECISIONS Q77.
  energy: {
    label: "Informations réglementaires",
    exempt: "Non soumis au DPE.",
    exemptFor: (reason: string) => `Non soumis au DPE (motif : ${reason}).`,
    excessive: "Logement à consommation énergétique excessive.",
    costs: (min: string, max: string, year: number) =>
      `Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre ${min} et ${max} par an. Prix moyens des énergies indexés au 1er janvier ${year} (abonnements compris).`,
    risks:
      "Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques\u00A0:",
    risksLink: "www.georisques.gouv.fr",
  },
  actions: {
    contact: "Contacter le vendeur",
    // The mobile bar, beside the price (L1-60).
    contactShort: "Contacter",
    visit: "Demander une visite",
    accountRequired:
      "Un compte acquéreur est nécessaire pour contacter le vendeur ou demander une visite.",
    // The preview of the seller before sending (L1-13).
    inactive: "Dans l'aperçu, ces boutons sont inactifs.",
  },
  // The title and the action of errors.notFound.
  notFound: {
    metaTitle: "Annonce introuvable · Leenkey",
    text: "L'annonce a peut-être été vendue ou retirée par son propriétaire.",
  },
} as const;
