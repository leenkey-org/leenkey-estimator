import type { FilterSelectDemoOption } from "./_filter-select-demo";
import type { GalleryPhoto } from "@/components/shared/gallery";
import type { KeyFact } from "@/components/shared/key-facts-table";
import type { PropertyCardData } from "@/components/shared/property-card";
import type { KeyFigure } from "@/components/shared/key-figures";
import { formatPrice, formatPriceShort, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// Texts and example data of the internal /design catalogue (docs/DESIGN.md
// 12.14). Example data lives here only, never in the components.

export const page = {
  metaTitle: "Design system · Leenkey",
  title: "Design system",
  subtitle:
    "Bleu Leenkey en aplats, neutres pierre, Archivo élargie pour les titres, angles de 4 et 6 px, pas d'ombre.",
  catalogueTitle: "Tous les composants",
  catalogueIntro:
    "Les composants de components/shared, avec leurs variantes, tailles et états (docs/DESIGN.md section 10).",
};

export const sections = {
  colors: "Couleurs",
  typography: "Typographie",
  buttons: "Boutons",
  fields: "Champs",
  statuses: "Statuts",
  card: "Carte de bien",
  palette: "Palette complète",
  dpe: "Classes DPE",
  typeScale: "Échelle typographique",
  buttonVariants: "Boutons : variantes",
  buttonSizes: "Boutons : tailles et états",
  iconButtons: "Boutons icône",
  inputs: "Champs de saisie",
  choices: "Sélections",
  filters: "Barre de filtres",
  badges: "Pastilles de statut",
  sectionTitle: "Titre de section",
  keyFigures: "Chiffres clés",
  gallery: "Galerie",
  price: "Prix",
  contact: "Vendeur",
  keyFacts: "Tableau des caractéristiques",
  cards: "Cartes de bien",
  brandPanel: "Aplat de marque",
  drawing: "Dessin de marque",
  emptyState: "État vide",
  alerts: "Alertes",
  skeleton: "Chargement",
  formats: "Formats des nombres et des dates",
  shapes: "Rayons, ombres et bordures",
  spacing: "Espacements, points de rupture et conteneurs",
  motion: "Mouvement",
};

export type Swatch = { token: string; name: string; hex: string; usage: string };

/** The 12 swatches of the board (Main.png), with the DESIGN.md values. */
export const boardSwatches: Swatch[] = [
  { token: "lk-blue", name: "Bleu Leenkey", hex: "#1156FC", usage: "Aplats, bouton principal" },
  { token: "lk-blue-hover", name: "Bleu survol", hex: "#0D47E0", usage: "Survol et pression" },
  { token: "lk-navy", name: "Navy", hex: "#1A2B4A", usage: "En-têtes sombres" },
  { token: "lk-ink", name: "Encre", hex: "#0F1E35", usage: "Texte principal" },
  { token: "lk-blue-tint", name: "Teinte", hex: "#EEF4FF", usage: "Sélection, aide" },
  { token: "lk-blue-line", name: "Bordure bleue", hex: "#DBEAFE", usage: "Bouton secondaire" },
  { token: "lk-stone-2", name: "Pierre", hex: "#ECEDE8", usage: "Tuiles, en-têtes de tableau" },
  { token: "lk-line", name: "Bordure", hex: "#D9DBD3", usage: "Cartes, séparateurs" },
  { token: "lk-ink-2", name: "Texte secondaire", hex: "#3E4757", usage: "Corps secondaire" },
  { token: "lk-ink-3", name: "Texte tertiaire", hex: "#5B6474", usage: "Dates, aides" },
  { token: "lk-success", name: "Succès", hex: "#047857", usage: "« En ligne », valider" },
  { token: "lk-warning", name: "Attention", hex: "#B45309", usage: "Alertes" },
];

/** Every colour token of DESIGN.md 2.1. */
export const paletteSwatches: Swatch[] = [
  ...boardSwatches,
  { token: "lk-on-blue-2", name: "Secondaire sur bleu", hex: "#F0F4FF", usage: "Texte sur aplat" },
  { token: "lk-bg", name: "Fond d'application", hex: "#F4F4F1", usage: "Espaces connectés" },
  { token: "lk-surface", name: "Surface", hex: "#FFFFFF", usage: "Cartes, champs" },
  { token: "lk-stone", name: "Pierre large", hex: "#E3E4DE", usage: "Bandeaux neutres" },
  { token: "lk-field", name: "Bordure de champ", hex: "#8A909A", usage: "Champs, cases" },
  { token: "lk-success-bg", name: "Fond succès", hex: "#D1FAE5", usage: "Badge succès" },
  { token: "lk-warning-bg", name: "Fond attention", hex: "#FEF3C7", usage: "Badge, encart" },
  { token: "lk-danger", name: "Erreur", hex: "#B91C1C", usage: "Erreurs, suppression" },
  { token: "lk-danger-bg", name: "Fond erreur", hex: "#FEE2E2", usage: "Badge, encart" },
];

export type TypeRole = {
  role: string;
  sample: string;
  spec: string;
  /** Classes documented for the role. */
  classes: string;
  /** Classes applied to the sample, when they differ from the documented ones. */
  sampleClassName?: string;
};

/** DESIGN.md 3.2, one line per role: mobile size, then from 1024 px. */
export const typeScale: TypeRole[] = [
  {
    role: "Display",
    sample: "Bonjour Thomas",
    spec: "36 puis 56 px · 700 large",
    classes: "text-lk-display lg:text-lk-display-lg font-bold text-wide",
  },
  {
    role: "Titre H1",
    sample: "Créez votre compte",
    spec: "26 puis 32 px · 700 large",
    classes: "text-lk-h1 lg:text-lk-h1-lg font-bold text-wide",
  },
  {
    role: "Titre H2",
    sample: "Votre dossier fait la différence",
    spec: "20 puis 24 px · 700 large",
    classes: "text-lk-h2 lg:text-lk-h2-lg font-bold text-wide",
  },
  {
    role: "Titre de section (H3)",
    sample: "À faire",
    spec: "16 puis 17 px · 600",
    classes: "text-lk-h3 lg:text-lk-h3-lg font-semibold",
  },
  {
    role: "Titre de barre",
    sample: "Choisir ma formule",
    spec: "15 px · 600",
    classes: "text-lk-title font-semibold",
  },
  {
    role: "Prix principal",
    sample: formatPrice(35_000_000),
    spec: "26 puis 30 px · 700 large, tabulaire",
    classes: "text-lk-price lg:text-lk-price-lg font-bold text-wide tabular",
  },
  {
    role: "Prix de carte",
    sample: formatPrice(28_900_000),
    spec: "17 px (16 en tuile, 22 en carte large) · 700 large",
    classes: "text-lk-card-price font-bold text-wide tabular",
  },
  {
    role: "Chiffre clé",
    sample: formatSurface(68),
    spec: "15 puis 17 px · 700 large, tabulaire",
    classes: "text-lk-figure lg:text-lk-figure-lg font-bold text-wide tabular",
  },
  {
    role: "Indicateur",
    sample: "248",
    spec: "22 px · 700 large, tabulaire",
    classes: "text-lk-stat font-bold text-wide tabular",
  },
  {
    role: "Corps",
    sample: "Au troisième étage avec ascenseur, appartement traversant de 68 m².",
    spec: "15 puis 16 px · 400",
    classes: "text-lk-body lg:text-lk-body-lg",
  },
  {
    role: "Corps compact",
    sample: "Serait-il possible de visiter samedi matin ?",
    spec: "14 px · 400",
    classes: "text-lk-compact",
  },
  {
    role: "Libellé de champ",
    sample: "Prénom et nom",
    spec: "13 px · 500",
    classes: "text-lk-label font-medium",
  },
  {
    role: "Bouton",
    sample: "Contacter le vendeur",
    spec: "15, 14 ou 13 px · 600",
    classes: "text-lk-button-lg, -md ou -sm, font-semibold",
    sampleClassName: "text-lk-button-lg font-semibold",
  },
  {
    role: "Secondaire",
    sample: "Savigny-sur-Orge · centre",
    spec: "13 px (12 en légende) · 400, encre 3",
    classes: "text-lk-secondary ou text-lk-caption, text-lk-ink-3",
    sampleClassName: "text-lk-secondary text-lk-ink-3",
  },
  {
    role: "Étiquette",
    sample: "Prochaine action",
    spec: "12 px · 600",
    classes: "text-lk-tag font-semibold",
  },
  {
    role: "Micro",
    sample: "Nouveau",
    spec: "11 px · 500 à 600",
    classes: "text-lk-micro font-semibold",
  },
];

export const boardType = {
  h1: "Titre H1 · 32 / 700",
  h2: "Titre H2 · 24 / 700",
  h3: "Titre H3 · 17 / 600",
  body: "Corps · 15 / 400. Vendez votre bien, accompagné à chaque étape. Le texte courant reste à 15 px sur mobile et 16 px sur desktop.",
  secondary: "Secondaire · 13 / 400 · #5B6474",
  tag: "Étiquette · 12 / 600",
};

export const buttons = {
  publish: "Publier mon bien",
  secondary: "Secondaire",
  ghost: "Discret",
  onDark: "Sur fond sombre",
  small: "Petit",
  variants: {
    primary: "Continuer",
    secondary: "Précédent",
    "outline-ink": "Nouvelle recherche",
    ghost: "Enregistrer",
    ghostMuted: "Ignorer",
    "on-dark": "Sur fond clair",
    success: "Valider et publier",
    danger: "Retirer mon offre",
    inverse: "Voir mon annonce",
  },
  sizes: { lg: "Grand · 52 px", md: "Moyen · 44 px", sm: "Petit · 40 px" },
  withIcon: "Vendre mon bien",
  disabled: "Désactivé",
  loading: "Envoi en cours",
  link: "Lien avec le style bouton",
  onBlueCaption: "Variante inverse, sur aplat bleu uniquement",
};

export const iconButtons = {
  stone: "Retour",
  whiteFloat: "Ajouter aux favoris",
  tint: "Notifications",
  onDark: "Assistant",
  outline: "Fermer",
  transparent: "Favoris",
  small: "Réglages",
};

export const fields = {
  address: { label: "Adresse du bien", value: "12 rue des Lilas, Savigny-sur-Orge" },
  price: { label: "Prix affiché", value: "350 000", unit: "€" },
  dpe: { label: "DPE" },
  surface: {
    label: "Surface",
    unit: "m²",
    error: "La surface est obligatoire.",
  },
  phone: {
    label: "Téléphone",
    placeholder: "06 00 00 00 00",
    help: "Le vendeur ne le voit qu'après acceptation de votre offre.",
  },
  password: {
    label: "Mot de passe",
    placeholder: "8 caractères minimum",
    error: "Le mot de passe doit contenir au moins 8 caractères.",
  },
  search: { label: "Ville ou code postal", value: "Épinay-sur-Orge · 10 km" },
  type: {
    label: "Type de bien",
    placeholder: "Choisir",
    options: [
      { value: "appartement", label: "Appartement" },
      { value: "maison", label: "Maison" },
      { value: "terrain", label: "Terrain" },
    ],
  },
  charges: { label: "Charges de copropriété", value: "180", unit: "€ / mois" },
  disabled: { label: "Référence", value: "LK-2026-0042" },
};

export const choices = {
  amenitiesLabel: "Atouts",
  amenities: [
    { label: "Balcon", pressed: true },
    { label: "Terrasse", pressed: false },
    { label: "Ascenseur", pressed: true },
    { label: "Parking", pressed: false },
    { label: "Cave", pressed: false },
    { label: "Jardin", pressed: false },
  ],
  filtersLabel: "Filtres rapides, barre mobile (36 px)",
  filters: [
    { label: "Appartement", pressed: true },
    { label: `≤ ${formatPriceShort(40_000_000)}`, pressed: true },
    { label: "Extérieur", pressed: false },
  ],
  dpeLabel: "DPE",
  dpeAria: (letter: string) => `Classe ${letter}`,
  financingLabel: "Financement",
  financing: [
    { value: "loan", label: "Avec prêt" },
    { value: "no_loan", label: "Sans prêt" },
  ],
};

export const statuses = {
  listingCaption: "Statuts d'annonce",
  planCaption: "Formules",
  dpeCaption: "DPE, en annonce puis en carte compacte",
};

export const sectionTitle = {
  plain: "Le bien",
  withAction: "À faire",
  action: "Toutes les étapes",
};

export const keyFigures: KeyFigure[] = [
  { value: formatSurface(68), label: "surface" },
  { value: "3", label: "pièces" },
  { value: "2", label: "chambres" },
  { value: "3e", label: "étage" },
  { value: "Sud", label: "balcon" },
  { value: "1930", label: "immeuble" },
];

export const keyFiguresCaption = "4 tuiles en mobile, 6 à partir de 1024 px";

export const cardCaptions = {
  compact: "compact · recherche mobile",
  wide: "wide · recherche desktop (à partir de 768 px)",
  tile: "tile · accueil, biens similaires",
  noPhoto: "Sans photo : le dessin de marque sur pierre",
  favourite: "Ajouter aux favoris",
};

/** The compact card keeps the short form of the note (Recherche.png). */
export const compactNote: PropertyCardData["note"] = { text: "Dossier complet", tone: "success" };

export const exampleCards: Record<"savigny" | "epinay" | "juvisy" | "morsang", PropertyCardData> = {
  savigny: {
    href: "/design#cartes",
    priceCents: 35_000_000,
    propertyType: "appartement",
    rooms: 3,
    surfaceM2: 68,
    location: "Savigny-sur-Orge · centre",
    locationDetail: "3e étage avec ascenseur",
    dpe: "C",
    photo: {
      src: "/design/sejour-savigny.jpg",
      alt: "Séjour, appartement 3 pièces à Savigny-sur-Orge",
    },
    highlights: ["2 chambres", "Balcon sud", "Cave"],
    note: { text: "Dossier complet · diagnostics et charges consultables", tone: "success" },
  },
  epinay: {
    href: "/design#cartes",
    priceCents: 28_900_000,
    propertyType: "appartement",
    rooms: 3,
    surfaceM2: 61,
    location: "Épinay-sur-Orge",
    locationDetail: "1er étage",
    dpe: "D",
    photo: {
      src: "/design/salon-epinay.jpg",
      alt: "Salon, appartement 3 pièces à Épinay-sur-Orge",
    },
    highlights: ["2 chambres", "Parking"],
    note: { text: "Publié il y a 2 jours" },
  },
  juvisy: {
    href: "/design#cartes",
    priceCents: 32_900_000,
    propertyType: "appartement",
    rooms: 3,
    surfaceM2: 64,
    location: "Juvisy-sur-Orge",
    dpe: "C",
    photo: {
      src: "/design/salon-juvisy.jpg",
      alt: "Salon, appartement 3 pièces à Juvisy-sur-Orge",
    },
    badge: "new",
    photoCount: 9,
  },
  morsang: {
    href: "/design#cartes",
    priceCents: 29_800_000,
    propertyType: "maison",
    rooms: 4,
    surfaceM2: 82,
    location: "Morsang-sur-Orge",
    dpe: "B",
    photo: null,
    badge: "price-drop",
  },
};

export const brandPanel = {
  pageCaption: "titleSize page · 36 px, accueil acquéreur",
  blueTitle: "Bonjour Thomas",
  blueText: "Des biens vendus directement par leurs propriétaires. Sans frais d'agence.",
  navyTitle: "Ma vente",
  navyText: "Étape 3 sur 6 · Contacts et visites",
  heroCaption: "titleSize hero · 36 puis 56 px, accueil public et fins de parcours",
  heroTitle: "Vous gardez les clés.",
  heroText: "Vendez votre bien sans agence, accompagné à chaque étape.",
};

export const drawing = {
  fileCaption: "Fichier public/brand/facade.svg",
  lightCaption: "Sur fond clair : encre 3, 100 %",
  blueCaption: "Sur aplat bleu : blanc, 55 %",
};

export const emptyStates = {
  light: {
    title: "Pas encore de contact",
    text: "Une annonce complète et bien illustrée reçoit ses premiers messages plus vite : vérifiez vos photos et votre description.",
    action: "Compléter mon annonce",
  },
  blue: {
    title: "C'est envoyé",
    text: "Nous relisons votre annonce sous 24 h et vous prévenons par email.",
    action: "Voir mon annonce",
  },
};

export const formats = {
  /** Fixed reference date, so that the examples never change. */
  now: "2026-10-15T12:00:00Z",
  rows: {
    price: "Prix",
    priceShort: "Prix sur la carte",
    surface: "Surface",
    pricePerSquareMetre: "Prix au m²",
    rooms: "Pièces, en titre",
    roomsShort: "Pièces, en carte compacte",
    date: "Date",
    dateTime: "Date et heure",
    relative: "Il y a",
  },
};

export const shapes = {
  radiusSm: "rounded-lk-sm · 4 px · contrôles, vignettes",
  radiusMd: "rounded-lk-md · 6 px · cartes, panneaux",
  radiusFull: "rounded-full · pastilles, avatars",
  shadowFloat: "shadow-float · éléments flottants",
  shadowSheet: "shadow-sheet · feuille mobile",
  borderLine: "1 px lk-line · conteneurs",
  borderField: "1,5 px lk-field · champs",
};

export const spacing = {
  scaleCaption: "Multiples de 4 px (classes Tailwind p-0.5 à p-18)",
  scale: [2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 72],
  breakpoints: [
    { name: "base", value: "< 768 px · 1 colonne, navigation basse" },
    { name: "md", value: "768 px · 2 colonnes, navigation haute" },
    { name: "lg", value: "1024 px · mises en page desktop" },
    { name: "xl", value: "1280 px · largeur de référence" },
  ],
  containers: [
    { name: "max-w-lk-page", value: "1200 px · pages publiques" },
    { name: "max-w-lk-home", value: "820 px · accueil acquéreur" },
    { name: "max-w-lk-settings", value: "720 px · compte et réglages" },
    { name: "max-w-lk-prose", value: "640 px · texte long" },
    { name: "max-w-lk-form", value: "560 px · formulaires à étapes" },
  ],
};

export const motion = [
  { name: "Survol, pression", value: "140 ms · duration-140 ease-out-lk" },
  { name: "Panneau, feuille, menu", value: "220 ms · duration-220 ease-out-lk" },
  { name: "Fondu d'image", value: "160 ms · linéaire, avec le composant photo (L1-12)" },
  { name: "Mouvement réduit", value: "animations et transitions coupées dans .facade" },
];

const bar = fr.search.bar;

export const filterBar = {
  selectCaption:
    "FilterSelect · barre de filtres desktop, 44 px, aussi large que son texte ; teinte bleue quand une valeur est choisie",
  type: {
    label: bar.type,
    defaultValue: "appartement",
    options: [
      { value: "", label: bar.type },
      ...(["appartement", "maison", "terrain"] as const).map((type) => ({
        value: type,
        label: fr.search.types[type],
      })),
    ] satisfies FilterSelectDemoOption[],
  },
  budget: {
    label: bar.budgetLabel,
    defaultValue: "",
    options: [
      { value: "", label: bar.budget },
      ...[300_000, 400_000, 500_000].map((euros) => ({
        value: String(euros),
        label: bar.priceUpTo(formatPrice(euros * 100)),
      })),
    ] satisfies FilterSelectDemoOption[],
  },
  rooms: {
    label: bar.roomsLabel,
    defaultValue: "3",
    options: [
      { value: "", label: bar.rooms },
      ...[1, 2, 3, 4, 5].map((rooms) => ({ value: String(rooms), label: bar.roomsAtLeast(rooms) })),
    ] satisfies FilterSelectDemoOption[],
  },
  more: bar.more,
  chipCaption:
    "ChipButton · même forme qu'un filtre rapide inactif, ouvre le panneau des filtres sur son champ (barre mobile)",
  chips: [fr.search.chips.budget, fr.search.chips.rooms, fr.search.chips.dpe],
};

export const galleryPhotos: GalleryPhoto[] = [
  exampleCards.savigny.photo,
  exampleCards.epinay.photo,
  exampleCards.juvisy.photo,
].filter((photo): photo is GalleryPhoto => photo !== null);

export const gallery = {
  caption:
    "Mobile : une photo sur la largeur, 280 px, défilement, compteur. À partir de 1024 px : une grande photo et les suivantes. Toucher ou cliquer agrandit en plein écran.",
  back: "Retour",
  noPhotoCaption: "Sans photo : le dessin de marque sur pierre, jusqu'aux photos (L1-12)",
};

export const price = {
  priceCents: 35_000_000,
  surfaceM2: 68,
  mdCaption: "md · annonce mobile, 26 px",
  lgCaption: "lg · colonne prix desktop, 30 px à partir de 1024 px",
};

export const contact = {
  firstName: "Camille",
  otherFirstName: "Thomas",
  cardCaption: "card · annonce mobile ; formule payante : « Vente accompagnée par Leenkey »",
  freeCaption: "Formule Autonomie : le prénom seul",
  tileCaption: "tile · colonne prix desktop",
  unknownCaption: "Prénom absent",
};

export const keyFacts: { items: KeyFact[]; linkLabel: string; linkValue: string; caption: string } =
  {
    items: [
      { label: "Charges de copropriété", value: `${formatPrice(18_000)} / mois` },
      { label: "Taxe foncière", value: `${formatPrice(115_000)} / an` },
      { label: "Classe énergie (DPE)", value: "C" },
      { label: "Diagnostics", value: "Complets", tone: "success" },
      { label: "Travaux votés", value: fr.listing.facts.notProvided, tone: "muted" },
    ],
    linkLabel: "Procès-verbaux d'AG",
    linkValue: "Demander l'accès",
    caption: "Valeur : normale, « Non renseigné » en encre 3, succès, ou lien",
  };

export const alerts = {
  danger: fr.search.error,
  retry: fr.search.retry,
  warning: "Votre annonce est en pause : elle n'apparaît plus dans les résultats.",
  info: fr.listing.actions.accountRequired,
  caption: "danger (role alert), warning et info (role status)",
};

export const skeleton = {
  caption:
    "Skeleton · bloc pierre au rayon de l'élément remplacé, opacité 0,6 → 1 en 1,2 s, immobile si le mouvement est réduit",
};
