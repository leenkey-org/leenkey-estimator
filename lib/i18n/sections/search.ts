// Texts of the interface, part « search » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).

export const frSearch = {
  metaTitle: "Biens à vendre · Leenkey",
  metaTitleIn: (place: string) => `Biens à vendre ${place} · Leenkey`,
  metaDescription:
    "Des biens vendus directement par leurs propriétaires. Sans frais d'agence. Recherche par ville, budget, surface et nombre de pièces.",
  pageTitle: "Biens à vendre",
  location: {
    label: "Ville ou code postal",
    placeholder: "Ville ou code postal",
    clear: "Effacer la ville",
    suggestions: "Communes",
    noSuggestion: "Aucune commune de la zone ne correspond. Validez pour chercher ce nom.",
    radius: (km: number) => `${km}\u00A0km`,
  },
  filtersButton: "Filtres",
  activeFilters: (count: number) =>
    count === 1 ? "1 filtre actif" : `${count}\u00A0filtres actifs`,
  // L1-61, in the way of Airbnb: the row of categories under the bar, each
  // a filter pressed or not (the type, the garden alone, the parking).
  categories: {
    label: "Catégories de biens",
    all: "Tous les biens",
    maison: "Maisons",
    appartement: "Appartements",
    jardin: "Avec jardin",
    parking: "Avec parking",
    terrain: "Terrains",
  },
  // The active filters under the categories on a phone (L1-61): one press removes one.
  chips: {
    label: "Filtres actifs",
    remove: (label: string) => `Retirer le filtre ${label}`,
    outdoor: "Extérieur",
    elevator: "Ascenseur",
    priceMax: (price: string) => `≤ ${price}`,
    priceMin: (price: string) => `≥ ${price}`,
    priceRange: (min: string, max: string) => `${min} – ${max}`,
    surfaceMax: (surface: string) => `≤ ${surface}`,
    surfaceMin: (surface: string) => `≥ ${surface}`,
    surfaceRange: (min: string, max: string) => `${min} – ${max}`,
    roomsMin: (rooms: number) => (rooms === 1 ? "1 pièce +" : `${rooms}\u00A0pièces +`),
    bedroomsMin: (bedrooms: number) =>
      bedrooms === 1 ? "1 chambre +" : `${bedrooms}\u00A0chambres +`,
    dpeMax: (letter: string) => (letter === "A" ? "DPE A" : `DPE A à ${letter}`),
  },
  bar: {
    label: "Filtres de la recherche",
    type: "Type de bien",
    rooms: "Pièces",
    priceUpTo: (price: string) => `Jusqu'à ${price}`,
    roomsAtLeast: (rooms: number) => (rooms === 1 ? "1 pièce et +" : `${rooms} pièces et +`),
    // The rounded bar of direction C (DECISIONS 2026-10-26): a name above its value.
    where: "Où\u00A0?",
    budgetTitle: "Budget",
    // The panels of the bar (L1-61): the budget is applied with « Appliquer ».
    apply: "Appliquer",
    clear: "Effacer",
    presets: "Budgets courants",
    typeAll: "Tous les biens",
    any: "Indifférent",
  },
  dialog: {
    title: "Filtres",
    close: "Fermer les filtres",
    radius: (place: string) => `Rayon autour de ${place}`,
    radiusTown: "Ville seule",
    type: "Type de bien",
    budgetMin: "Budget minimum",
    budgetMax: "Budget maximum",
    // The thumbs of the slider: the group « Fourchette de budget » names them.
    thumbMin: "Minimum",
    thumbMax: "Maximum",
    surfaceMin: "Surface minimum",
    surfaceMax: "Surface maximum",
    rooms: "Pièces",
    bedrooms: "Chambres",
    /** Short « all » of a row of buttons (pieces, bedrooms, DPE). */
    anyShort: "Tous",
    roomsShort: (rooms: number) => `${rooms}+`,
    dpeMax: "Classe énergie (DPE), au plus",
    // The sections of the panel (L1-61, in the way of Airbnb).
    sections: {
      type: "Type de bien",
      budget: "Fourchette de budget",
      budgetText: "Le prix de vente, sans frais d'agence.",
      surface: "Surface habitable",
      rooms: "Pièces et chambres",
      outdoor: "Extérieur",
      equipment: "Équipements",
      dpe: "Performance énergétique",
    },
    outdoor: "Extérieur",
    outdoorHelp: "Les biens qui ont au moins l'un des extérieurs choisis.",
    equipment: "Équipements",
    parking: "Parking",
    elevator: "Ascenseur",
    minAboveMax: "Le maximum doit être supérieur ou égal au minimum.",
    tooHigh: "Montant trop élevé : 1 000 000 000 € au plus.",
    clear: "Tout effacer",
    show: (count: number) =>
      count === 0 ? "Aucun bien" : count === 1 ? "Voir 1 bien" : `Voir ${count}\u00A0biens`,
    showUnknown: "Voir les biens",
  },
  outdoor: { balcon: "Balcon", terrasse: "Terrasse", jardin: "Jardin" },
  types: {
    appartement: "Appartement",
    maison: "Maison",
    terrain: "Terrain",
    autre: "Autre bien",
  },
  // « à Savigny-sur-Orge », « au Plessis-Pâté », « autour d'Épinay-sur-Orge »,
  // « dans le 91600 ».
  place: {
    at: (name: string) =>
      /^Les /.test(name)
        ? `aux ${name.slice(4)}`
        : /^Le /.test(name)
          ? `au ${name.slice(3)}`
          : `à ${name}`,
    around: (name: string) =>
      /^Les /.test(name)
        ? `autour des ${name.slice(4)}`
        : /^Le /.test(name)
          ? `autour du ${name.slice(3)}`
          : /^[AEIOUYÀÂÉÈÊËÎÏÔÙÛÜŸ]/i.test(name)
            ? `autour d'${name}`
            : `autour de ${name}`,
    postalCode: (code: string) => `dans le ${code}`,
  },
  results: {
    count: (total: number, formatted: string) =>
      total === 0 ? "Aucun bien" : total === 1 ? "1 bien" : `${formatted}\u00A0biens`,
    withPlace: (count: string, place: string) => `${count} ${place}`,
    sort: "Trier par",
    sorts: {
      recent: "Plus récents",
      prix_asc: "Prix croissant",
      prix_desc: "Prix décroissant",
      surface: "Surface décroissante",
      prix_m2: "Prix au m² croissant",
    },
    loadMore: "Voir plus",
    list: "Résultats",
  },
  // L1-16: the map of the results (docs/DESIGN.md 8, 12.5, 12.6).
  map: {
    region: "Carte des biens",
    open: "Carte",
    close: "Liste",
    /** Name of a price pill: its text first (WCAG 2.5.3), then what the card says. */
    pill: (label: string, summary: string, place: string) => `${label}, ${summary}, ${place}`,
    preview: "Bien choisi sur la carte",
    closePreview: "Fermer l'aperçu",
    zoomIn: "Zoom avant",
    zoomOut: "Zoom arrière",
  },
  empty: {
    title: "Aucun bien ne correspond.",
    // SPEC 8.4 ends with « ou créez une alerte pour être prévenu » : alerts
    // come with L3-06, the sentence is completed then.
    text: "Élargissez le rayon ou le budget.",
    action: "Effacer les filtres",
    noListingTitle: "Aucun bien en vente pour le moment.",
  },
  error:
    "Ça n'a pas fonctionné. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
  retry: "Réessayer",
  card: {
    publishedToday: "Publié aujourd'hui",
    publishedYesterday: "Publié hier",
    publishedDaysAgo: (days: number) => `Publié il y a ${days}\u00A0jours`,
    publishedOn: (date: string) => `Publié le ${date}`,
    bedrooms: (bedrooms: number) => (bedrooms === 1 ? "1 chambre" : `${bedrooms}\u00A0chambres`),
    parking: "Stationnement",
    cellar: "Cave",
    groundFloor: "Rez-de-chaussée",
    floor: (floor: string) => `${floor} étage`,
    withElevator: (floor: string) => `${floor} avec ascenseur`,
  },
} as const;
