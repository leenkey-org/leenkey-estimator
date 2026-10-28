import type { FilterMenuOption } from "@/components/shared/filter-menu";
import type { GalleryPhoto } from "@/components/shared/gallery";
import type { KeyFact } from "@/components/shared/key-facts-table";
import type { PropertyCardData } from "@/components/shared/property-card";
import type { KeyFigure } from "@/components/shared/key-figures";
import { bySection, listingKeyFacts, type FactsInput } from "@/leenkey/listings/key-facts";
import { formatPrice, formatPriceShort, formatSurface } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";

// Texts and example data of the internal /design catalogue (docs/DESIGN.md
// 12.14). Example data lives here only, never in the components.

export const page = {
  metaTitle: "Design system · Leenkey",
  title: "Design system",
  subtitle:
    "Charte D : la nuit, le dégradé bleu → violet des actions, des neutres ardoise, Sora, des pilules et des angles de 12 à 28 px.",
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
  checkboxes: "Cases à cocher",
  filters: "Barre de filtres",
  badges: "Pastilles de statut",
  sectionTitle: "Titre de section",
  keyFigures: "Chiffres clés",
  gallery: "Galerie",
  price: "Prix",
  contact: "Vendeur",
  keyFacts: "Tableau des caractéristiques",
  cards: "Cartes de bien",
  logo: "Logo",
  brandPanel: "Aplat de marque",
  endOfFlow: "Fin de parcours",
  drawing: "Dessin de marque",
  emptyState: "État vide",
  comingSoon: "Écran à venir",
  stepForm: "Formulaire à étapes",
  navigation: "Navigation",
  notifications: "Notifications et menu du compte",
  alerts: "Alertes",
  infoNote: "Note d'information",
  backOffice: "Back office : filtres, tableau, motif",
  skeleton: "Chargement",
  consent: "Consentement aux cookies",
  footer: "Pied de page",
  publicPages: "Pages publiques",
  propertySheet: "Fiche du bien : onglets et confirmation",
  messaging: "Messagerie",
  formats: "Formats des nombres et des dates",
  shapes: "Rayons, ombres et bordures",
  spacing: "Espacements, points de rupture et conteneurs",
  motion: "Mouvement",
};

export type Swatch = { token: string; name: string; hex: string; usage: string };

/** The 12 swatches of the board, with the values of the charte D (DESIGN.md 2.1, L1-58). */
export const boardSwatches: Swatch[] = [
  { token: "lk-blue", name: "Bleu des actions", hex: "#2563EB", usage: "Liens, début du dégradé" },
  { token: "lk-blue-hover", name: "Bleu foncé", hex: "#1D4ED8", usage: "Survol" },
  { token: "lk-night", name: "Nuit", hex: "#020D21", usage: "Bandeaux, en-têtes sombres" },
  { token: "lk-ink", name: "Encre", hex: "#0F172A", usage: "Texte principal" },
  { token: "lk-blue-tint", name: "Teinte", hex: "#EEF2FF", usage: "Sélection, étiquettes" },
  { token: "lk-blue-dark", name: "Indigo", hex: "#4338CA", usage: "Petits textes colorés" },
  {
    token: "lk-action-violet",
    name: "Violet des actions",
    hex: "#7C3AED",
    usage: "Fin du dégradé",
  },
  { token: "lk-line", name: "Bordure", hex: "#E2E8F0", usage: "Cartes, séparateurs" },
  { token: "lk-ink-2", name: "Texte secondaire", hex: "#475569", usage: "Corps secondaire" },
  { token: "lk-ink-3", name: "Texte tertiaire", hex: "#5B6880", usage: "Dates, aides" },
  { token: "lk-success", name: "Succès", hex: "#047857", usage: "« En ligne », valider" },
  { token: "lk-warning", name: "Attention", hex: "#B45309", usage: "Alertes" },
];

/** Every colour token of DESIGN.md 2.1. */
export const paletteSwatches: Swatch[] = [
  ...boardSwatches,
  {
    token: "lk-brand-blue",
    name: "Bleu charte",
    hex: "#3B82F6",
    usage: "Halos, titres en dégradé",
  },
  { token: "lk-brand-violet", name: "Violet charte", hex: "#8B5CF6", usage: "Halos, orbes" },
  { token: "lk-blue-line", name: "Indigo clair", hex: "#E0E7FF", usage: "Anneau de focus, jauges" },
  {
    token: "lk-stone-2",
    name: "Ardoise claire",
    hex: "#F1F5F9",
    usage: "Tuiles, pastilles neutres",
  },
  { token: "lk-bg", name: "Fond de page", hex: "#F8FAFC", usage: "Pages et espaces" },
  { token: "lk-surface", name: "Surface", hex: "#FFFFFF", usage: "Cartes, champs" },
  { token: "lk-blue-border", name: "Bordure indigo", hex: "#C7D2FE", usage: "Carte survolée" },
  { token: "lk-field", name: "Bordure de champ", hex: "#828FA1", usage: "Champs, cases" },
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
    "outline-inverse": "J'achète",
    cta: "Voir ma valorisation",
  },
  ctaCaption:
    "Variante cta avec trailingIcon ArrowRight · l'appel principal d'un écran, charte D (L1-58) : dégradé #2563EB → #7C3AED (5,2:1 au moins sous le texte blanc), ombre violette, s'élève de 1 px au survol, la flèche avance",
  sizes: { lg: "Grand · 52 px", md: "Moyen · 44 px", sm: "Petit · 40 px" },
  withIcon: "Vendre mon bien",
  disabled: "Désactivé",
  loading: "Envoi en cours",
  link: "Lien avec le style bouton",
  onBlueCaption:
    "Variantes inverse et outline-inverse (contour blanc), sur un aplat coloré ou une photo",
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
  roleCaption: "Choix du rôle (RoleCard), boutons radio natifs",
  roleLegend: "Votre projet",
  roles: [
    { value: "seller", title: "Je vends", hint: "Un bien à publier" },
    { value: "buyer", title: "J'achète", hint: "Je cherche un bien" },
  ],
  checkboxLabel: "J'accepte les conditions d'utilisation et la politique de confidentialité.",
  checkboxCheckedLabel: "Recevoir les nouvelles annonces par email",
  checkboxError: "Acceptez les conditions pour continuer.",
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
  favourite:
    "FavoriteButton (L1-18) : sans session (lien vers l'inscription), non sauvegardé, sauvegardé ; white-float sur une photo, stone dans la colonne prix",
  choice:
    "ChoiceCard : un chemin parmi deux (/vendre), tuile d'icône 44 px sur bleu clair, titre, une phrase, son action en bas ; le chemin recommandé en primary",
  choiceHref: "/design#cartes",
  /** Not a real listing: a tap in the catalogue fails and the heart comes back. */
  favouriteListingId: "00000000-0000-4000-8000-000000000000",
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
  heroCaption:
    "titleSize hero · 36, 44 puis 56 px, pages publiques ; les mots montent un à un au premier affichage, titleAccent souligné de la ligne de cote du dessin, le dessin se trace",
  heroTitle: "Vous gardez les clés.",
  heroAccent: "les clés.",
  heroText: "Vendez votre bien sans agence, accompagné à chaque étape.",
};

export const endOfFlow = {
  caption:
    "EndOfFlow : tout l'écran sur un téléphone, 60 % de sa hauteur à partir de 768 px ; le dessin apparaît en fondu (360 ms), le seul moment orchestré",
};

export const infoNote = {
  title: "Votre analyse de valeur du mardi 6 octobre",
  text: "342 000 €, dans une fourchette de 325 000 € à 360 000 €.",
  gap: "Votre prix est 3 % au-dessus de cette valeur.",
  caption:
    "InfoNote : à côté d'un champ, qui la lit au focus (aria-describedby) ; sans rôle, elle n'annonce rien",
};

export const logo = {
  colorCaption:
    "Le logo de leenkey.fr, recadré sur son dessin (public/brand/logo.svg) : barre de navigation et pages légales 32 px de haut, connexion et inscription 28 px",
  whiteCaption: "En blanc sur fond sombre (public/brand/logo-white.svg) : back office, 28 px",
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

// L1-10: navigation shells, with a forced current item (activeHref).
export const navigation = {
  topSignedInCaption:
    "TopNav connectée, à partir de 768 px : action principale, cloche, favoris et avatar du menu du compte ; lien courant en bleu ; à partir de 1 280 px, « Qui sommes-nous » ouvre ses deux pages (survol, clic ou clavier)",
  topSignedOutCaption:
    "TopNav sans session : « Mon compte » mène à la connexion, qui revient ensuite à la page",
  bottomCaptions: {
    seller: "BottomNav vendeur, sous 768 px",
    buyer: "BottomNav acquéreur, aussi sur la recherche",
    admin: "BottomNav du back office",
  },
  sidebarCaption:
    "AdminShell à partir de 768 px : barre latérale de 240 px ; pastilles de compteurs avec les données du back office ; « Voir le site » au-dessus de la carte du compte",
  headerCaption:
    "AdminMobileHeader sous 768 px : titre de la page, « Voir le site », la cloche et l'avatar du menu du compte",
  labels: {
    topSignedIn: "Exemple de barre haute, connecté",
    topSignedOut: "Exemple de barre haute, sans session",
    seller: "Exemple de barre basse, vendeur",
    buyer: "Exemple de barre basse, acquéreur",
    admin: "Exemple de barre basse, back office",
    sidebar: "Exemple de barre latérale du back office",
  },
  buyer: { firstName: "Thomas", roles: ["buyer"] },
  admin: { firstName: "Cédric", roles: ["admin"] },
  /** Counts of the AdminDesktop mockup, for the pills. */
  counts: { "/admin/annonces": 3, "/admin/dossiers": 5 } as Record<string, number>,
};

export const notifications = {
  bellCaption:
    "NotificationBell : rien de non lu (panneau vide de l'espace), puis 3 non lues (point bleu) avec le panneau de L1-22 : filtres du vendeur, groupes par âge, « Tout marquer comme lu » ; sur en-tête sombre, variante on-dark",
  unread: 3,
  itemsCaption:
    "NotificationItem : message (bleu), annonce en ligne (vert), annonce à corriger (orange), annonce à valider (pierre) ; non lue sur fond bleu pâle, avec son point",
  emailsLink: "Aperçu des emails",
  /** The events of the samples, written as the database writes them. */
  samples: {
    sender: "Chloé",
    excerpt: "Bonjour, la maison est-elle toujours disponible ? Je peux visiter samedi matin.",
    listing: "Maison 5 pièces avec jardin",
    reference: "LK-0042",
    city: "Savigny-sur-Orge",
  },
  times: ["Il y a 12\u00A0min", "Hier", "Mardi", "3 oct."],
  menuCaption:
    "AccountMenu : avatar de la barre haute, puis avatar d'en-tête sombre ; Cockpit, Mon compte, Se déconnecter (qui déconnecte vraiment)",
};

export const stepForm = {
  caption:
    "AppHeader (retour, titre, « Enregistrer ») et ProgressBar, puis FormActionBar : collée en bas de l'écran en mobile, à la fin du formulaire à partir de 768 px (G5, création du bien).",
  title: "Mon bien",
  back: "Retour",
  save: "Enregistrer",
  progress: "Étape 2 sur 4 · Caractéristiques",
  previous: "Précédent",
  next: "Continuer",
};

export const comingSoon = {
  caption:
    "ComingSoon : page dont l'écran arrive avec une tâche suivante, sous le titre de la page",
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
  radiusSm: "rounded-lk-sm · 12 px · contrôles, vignettes",
  radiusMd: "rounded-lk-md · 16 px · cartes, panneaux",
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
    { name: "2xl", value: "1536 px · grand écran, une colonne de cartes de plus" },
  ],
  containers: [
    { name: "lk-frame", value: "toute la largeur jusqu'à 1 920 px · cadre de page" },
    { name: "max-w-lk-home", value: "820 px · accueil acquéreur" },
    { name: "max-w-lk-settings", value: "720 px · compte et réglages" },
    { name: "max-w-lk-prose", value: "640 px · texte long" },
    { name: "max-w-lk-form", value: "560 px · formulaires à étapes" },
  ],
};

export const motion = [
  { name: "Survol, pression", value: "140 ms · duration-140 ease-out-lk" },
  { name: "Panneau, feuille, menu", value: "220 ms · duration-220 ease-out-lk" },
  { name: "Fondu d'image", value: "160 ms · linéaire, composant Photo (L1-12)" },
  { name: "Mouvement réduit", value: "animations et transitions coupées dans .facade" },
];

const bar = fr.search.bar;

export const filterBar = {
  selectCaption:
    "FilterMenu · parties de la barre arrondie de la recherche desktop : le nom au-dessus de la valeur, en bleu quand une valeur est choisie ; un menu arrondi aux choix cochés (flèches, Entrée, Échap)",
  type: {
    label: bar.type,
    defaultValue: "appartement",
    options: [
      { value: "", label: bar.typeAll },
      ...(["appartement", "maison", "terrain"] as const).map((type) => ({
        value: type,
        label: fr.search.types[type],
      })),
    ] satisfies FilterMenuOption[],
  },
  budget: {
    label: bar.budgetTitle,
    defaultValue: "",
    options: [
      { value: "", label: bar.any },
      ...[300_000, 400_000, 500_000].map((euros) => ({
        value: String(euros),
        label: bar.priceUpTo(formatPrice(euros * 100)),
      })),
    ] satisfies FilterMenuOption[],
  },
  rooms: {
    label: bar.rooms,
    defaultValue: "3",
    options: [
      { value: "", label: bar.any },
      ...[1, 2, 3, 4, 5].map((rooms) => ({ value: String(rooms), label: bar.roomsAtLeast(rooms) })),
    ] satisfies FilterMenuOption[],
  },
  more: fr.search.filtersButton,
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
  back: "Retour aux annonces",
  backCaption:
    "BackLink : sur la galerie en mobile (white-float, 44 px), en lien texte au-dessus de la galerie à partir de 1024 px ; retour à la recherche d'où l'on vient",
  noPhotoCaption:
    "Sans photo, ou si une photo ne se charge pas : le dessin de marque sur pierre. Une photo apparaît en fondu de 160 ms.",
  thumbsCaption:
    "PropertyThumb : vignette d'un bien, sa photo principale ou le dessin de marque sans photo ; 56 × 56 (Ma vente), 56 × 44 (back office), 44 × 44 (conversation)",
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

/** A flat of the seed, for the grid of facts of the listing page. */
const demoFlat: FactsInput = {
  type: "appartement",
  surfaceM2: 68,
  carrezM2: 66.5,
  rooms: 3,
  bedrooms: 2,
  floor: 2,
  floorsTotal: 4,
  hasElevator: true,
  hasBalcony: true,
  hasTerrace: false,
  hasGarden: false,
  hasParking: true,
  hasCellar: true,
  orientation: "Sud-ouest",
  buildYear: 1972,
  isNewBuild: false,
  dpe: "C",
  ges: "C",
  heating: "Collectif gaz",
  chargesMonthlyCents: 18_000,
  propertyTaxYearlyCents: 115_000,
  coproLots: 48,
};
const GRID_DEMO = new Set<string>([
  fr.listing.facts.surface,
  fr.listing.facts.rooms,
  fr.listing.facts.bedrooms,
  fr.listing.facts.floor,
  fr.listing.facts.dpe,
  fr.listing.facts.heating,
  fr.listing.facts.charges,
  fr.listing.facts.propertyTax,
]);

export const keyFacts: {
  items: KeyFact[];
  linkLabel: string;
  linkValue: string;
  caption: string;
  grid: KeyFact[];
  gridCaption: string;
} = {
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
  grid: bySection(listingKeyFacts(demoFlat)).filter((fact) => GRID_DEMO.has(fact.label)),
  gridCaption:
    "KeyFactsGrid · page de l'annonce (L1-55) : groupes titrés, deux colonnes à partir de 768 px, pictogramme dans un rond bleu clair, le nom au-dessus de la valeur",
};

export const alerts = {
  danger: fr.search.error,
  retry: fr.search.retry,
  warning: "Votre annonce est en pause : elle n'apparaît plus dans les résultats.",
  info: fr.listing.actions.accountRequired,
  success: "C'est renvoyé. Le lien précédent ne fonctionne plus.",
  caption: "danger (role alert) ; warning, info et success (role status)",
};

export const skeleton = {
  caption:
    "Skeleton · bloc pierre au rayon de l'élément remplacé, opacité 0,6 → 1 en 1,2 s, immobile si le mouvement est réduit",
};

export const consent = {
  bannerCaption:
    "Premier passage : Refuser et Accepter côte à côte, de même forme ; en bas sur mobile, en bas à gauche à partir de 768 px",
  panelCaption: "Personnaliser ou « Gérer mes cookies » : mesure d'audience décochée par défaut",
};

export const footer = {
  caption:
    "SiteFooter · pages du site, liens légaux, « Gérer mes cookies », identité et adresse légale (pages V2 ; mêmes liens légaux dans le pied V1)",
};

// L1-41: public pages in V2 (MarketingSection, PlanCard, MoreLink, SiteMenu).
export const publicPages = {
  sectionCaption:
    "MarketingSection · fond blanc ou pierre, titre h2 au rôle H1 (26 puis 40 px, accent en bleu), texte 640 px (16 puis 18 px), lien à droite à partir de 768 px ; titre et contenu montent en place à l'entrée dans l'écran (pages publiques)",
  sectionTitle: "Un forfait fixe. Jamais de commission.",
  sectionAccent: "Jamais de commission.",
  navyCaption:
    "MarketingSection look showcase, tone navy · sections de l'accueil dans la direction de la V1 (L1-47 à L1-49) : surtitre en capitales --lk-blue-light, titre centré 32, 40 puis 48 px, accent en dégradé clair ; PlanCard priceSize large, tone dark · la carte de verre de la V1 (blanc à 4,5 %, filet blanc à 10 %, coins de 16 px), prix en 36 px en bas de la carte, aligné d'une carte à l'autre (#tarifs de l'accueil)",
  eyebrow: "Nos formules",
  // The section Tarifs of the home page (L1-48): its three plans, price in large type.
  largePlans: [
    {
      name: "Autonomie",
      price: "Gratuit",
      free: true,
      tagline: "Pour piloter votre vente en toute autonomie.",
      note: "Sans engagement · sans carte bancaire",
    },
    {
      name: "Accompagné",
      price: formatPrice(99000),
      free: false,
      tagline: "Un conseiller dédié à vos côtés, du prix à la signature.",
      note: "Forfait fixe · payé à la souscription",
    },
    {
      name: "Sérénité",
      price: formatPrice(150000),
      free: false,
      tagline: "Nous nous occupons de presque tout, vous gardez la décision.",
      note: "Forfait fixe · payé à la souscription",
    },
  ],
  sectionLead:
    "Vous choisissez votre niveau d'accompagnement. Le prix ne dépend jamais de la valeur de votre bien.",
  more: "Voir le détail des formules",
  moreCaption: "MoreLink · bleu sur blanc, encre sur pierre (le bleu n'y atteint que 4,4:1)",
  stageCaption:
    "StagePill · étape d'un jalon de /investir, en toutes lettres : « Fait » (succès), « En cours » (bleu clair), « À venir » (pierre)",
  planCaption:
    "PlanCard · nom, prix et « TTC », accroche, liste à coches, action ; formule recommandée bordée de bleu avec sa pastille",
  plans: [
    {
      name: "Autonomie",
      price: "Gratuit",
      tagline: "Pour piloter votre vente en toute autonomie.",
      note: "Sans engagement · sans carte bancaire",
    },
    {
      name: "Accompagné",
      price: formatPrice(99000),
      tagline: "Un conseiller dédié à vos côtés, du prix à la signature.",
      intro: "Tout Autonomie, plus :",
      priceNote: "Forfait fixe TTC · payé à la souscription",
      features: ["Conseiller Leenkey dédié", "Stratégie de prix et de mise en vente"],
      action: "Choisir Accompagné",
    },
    {
      name: "Sérénité",
      price: formatPrice(150000),
      tagline: "Nous nous occupons de presque tout, vous gardez la décision.",
      features: ["Tout Accompagné", "Visites organisées par Leenkey"],
      badge: "Le plus complet",
      action: "Choisir Sérénité",
    },
  ],
  taxes: "TTC",
  menuLabel: "Navigation du site (exemple)",
  faqCaption:
    "FaqList · questions dépliables (<details>) dans les cartes de la V1 (L1-50) : une carte de 12 px par question, « + » bleu qui devient « − », ouverte bordée de bleu pâle avec l'ombre bleue ; réponse de 640 px au plus",
  // L1-50: the pieces of the showcase pages (DESIGN.md 1 and 10.6).
  showcase: {
    heroCaption:
      "ShowcaseHero · hero des pages vitrines (accueil, /concept, /investir, /qui-sommes-nous) : la nuit de la charte D et ses halos, trame de points, surtitre en capitales --lk-blue-light (ou pastille), titre mot à mot 36, 44 puis 56 px 700, mots mis en valeur dans le dégradé de la nuit sur la ligne de cote, actions cta ; une photo à droite à partir de 1 024 px (aside)",
    heroEyebrow: "Qui sommes-nous",
    heroTitle: "Rendre la vente immobilière enfin simple.",
    heroAccent: "enfin simple.",
    heroText:
      "Fondée par Cédric Da Cunha, Leenkey accompagne chaque propriétaire, de la valeur de son bien à la signature.",
    heroAction: "Découvrir notre vision",
    darkCaption:
      "Sur navy (/tarifs, /faq) : SegmentedPicker tone dark (cadre de verre, l'option choisie en blanc à texte bleu, anneau de focus blanc), FaqList tone dark (cartes de verre, question blanche, « + » --lk-blue-light, réponse blanc à 72 %)",
    pickerLabel: "Affichage des formules",
    picker: [
      { value: "price", label: "Gratuit pendant le lancement" },
      { value: "savings", label: "Mon économie vs agence" },
    ],
    badgeCaption:
      "NumberBadge · carré numéroté de la V1 en dégradé bleu, caché des aides techniques (la liste ordonnée dit l'ordre) : md 40 px (étapes de l'accueil), sm 32 px à deux chiffres (outil de /concept)",
    ctaCaption:
      "CtaPanel · dernier appel des pages vitrines : bleu (dégradé, trame de points ronds, action blanche avec sa flèche, la seconde en contour blanc, note au bouclier) ; clair (/qui-sommes-nous : fond blanc, accent en dégradé, action cta, la seconde en secondary)",
    ctaTitle: "Prêt à garder les clés de votre vente ?",
    ctaAccent: "les clés",
    ctaText: "Valorisez votre bien gratuitement, puis décidez de la suite.",
    ctaAction: "Valoriser mon bien",
    ctaSecondary: "Voir les formules",
    ctaNote: "Gratuit · sans engagement · sans carte bancaire",
    ctaLightTitle: "Prêt à échanger avec Cédric ?",
    ctaLightAccent: "Cédric ?",
    ctaLightText: "Un mot suffit pour démarrer la discussion.",
    ctaLightAction: "Nous contacter",
  },
  faq: [
    {
      question: "Combien ça coûte, vraiment ?",
      answer: "Trois formules transparentes à forfait fixe, jamais de commission au pourcentage.",
    },
    {
      question: "Mes données et mes documents sont-ils en sécurité ?",
      answer: "Vous seul décidez de ce qui est partagé, et avec qui.",
    },
  ],
  menuCaption:
    "SiteMenu · en-tête mobile des pages publiques (sous 768 px) : logo et « Menu », panneau plein écran avec les liens du site",
};

// L1-19: FilterPills, DataTable and Textarea (back office).
export const backOffice = {
  pillsLabel: "Statut des annonces (exemple)",
  pills: [
    { label: "Toutes", count: 16, active: false },
    { label: "En attente de validation", count: 3, active: true },
    { label: "En ligne", count: 12, active: false },
    { label: "Suspendue par Leenkey", count: 0, active: false },
  ],
  pillsCaption: "FilterPill : liens de 34 px, actif sur navy, compteur dans le libellé.",
  tableLabel: "Annonces (exemple)",
  columns: ["Bien", "Vendeur", "Prix", "Formule", "Reçue", "Statut"],
  rows: [
    {
      title: "Appartement 2 pièces au calme",
      place: "Villemoisson-sur-Orge · LK-0015",
      seller: "Bruno Lefèvre",
      priceCents: 18_900_000,
      plan: "autonomie",
      received: "Il y a 2 h",
      status: "pending",
    },
    {
      title: "Maison 5 pièces avec jardin",
      place: "Villiers-sur-Orge · LK-0006",
      seller: "Alice Martin",
      priceCents: 36_500_000,
      plan: "serenite",
      received: "Hier",
      status: "pending",
    },
  ],
  open: "Aperçu",
  reject: "Refuser avec motif",
  publish: "Valider et publier",
  tableCaption:
    "DataTable : en-tête pierre, lignes de 56 px, actions de la ligne dessous, alignées à droite.",
  textarea: {
    label: "Motif envoyé au vendeur",
    help: "Au moins 3 caractères, envoyé tel quel.",
    value:
      "La description est incomplète : précisez l'état du bien, ses pièces et ses points forts.",
  },
} as const;

// L1-21: a conversation (DESIGN.md 10.5), with the messages of Messagerie.png.
export const messaging = {
  header: {
    title: "Appartement 3\u00A0p\u00A0· Savigny-sur-Orge",
    subtitle: "Avec Thomas\u00A0· Justificatif vérifié",
  },
  date: "Mardi 22 septembre",
  received: "Bonjour, votre appartement m'intéresse beaucoup. Le balcon est-il bien exposé sud ?",
  receivedMeta: "Thomas\u00A0· 9:12",
  sent: "Bonjour Thomas, oui plein sud, ensoleillé de midi au coucher.",
  sentMeta: "Vous\u00A0· 9:40",
  system: "Visite confirmée le samedi 26 septembre à 10\u00A0h.",
  action: "Voir l'annonce",
  actionCaption:
    "À partir de 768 px, l'en-tête porte le chemin vers ce dont parle la conversation (« Voir l'annonce », « Voir mon bien » pour le vendeur) ; en dessous, c'est la première ligne du menu",
  caption:
    "ConversationHeader (retour, vignette 44 × 44, titre 14 px 600, sous-titre 12 px, menu), séparateur de date, MessageBubble reçue (blanche, coin 2 px en bas à gauche) et envoyée (bleue, coin 2 px en bas à droite), SystemMessage (pierre, pleine largeur), puis le Composer : champ de 44 px qui grandit jusqu'à cinq lignes, Entrée envoie au clavier",
};

// L1-14: the tabs of the page of a property and the confirmation dialog.
export const propertySheet = {
  tabsLabel: "Rubriques de votre bien",
  tabs: [
    { href: "/design#fiche-du-bien", label: "Infos" },
    { href: "/design#fiche-du-bien-photos", label: "Photos" },
    { href: "/design#fiche-du-bien-annonce", label: "Annonce" },
  ],
  tabsCaption:
    "LinkTabs · liens vers les pages d'un même objet, 14 px 500 encre 3, l'onglet courant en encre 600 souligné de 2 px bleu (aria-current), défilement horizontal en mobile",
  open: "Ouvrir la confirmation",
  dialogCaption:
    "ConfirmDialog · écran plein avec retour en mobile, dialogue de 520 px au centre à partir de 768 px, champs facultatifs, erreur lue dans le dialogue",
};

/** /design/emails: every email of the V2 with example data (SPEC-V2 18, L1-22). */
export const emails = {
  metaTitle: "Emails · Design Leenkey",
  title: "Emails",
  lead: "Les emails de la V2 avec des données d'exemple (SPEC 18, DESIGN 14). Hors production, ils partent vers la boîte de test, sujet préfixé « [PREPROD] » ou « [LOCAL] ».",
  back: "Catalogue",
  subject: "Sujet",
  frame: (name: string) => `Aperçu de l'email « ${name} »`,
  names: {
    received: "Annonce reçue (vendeur)",
    toReview: "Annonce à valider (équipe)",
    toReviewMany: "Plusieurs annonces à valider (équipe)",
    published: "Annonce en ligne (vendeur)",
    rejected: "Annonce à corriger (vendeur)",
    suspended: "Annonce suspendue (vendeur)",
    messageSeller: "Nouveau message (vendeur)",
    messagesBuyer: "Nouveaux messages (acquéreur)",
    messageLink: "Nouveau message avec un lien (vendeur)",
  },
  sample: {
    seller: "Alice",
    buyer: "Chloé",
    title: "Maison 5 pièces avec jardin",
    reference: "LK-0042",
    place: "Savigny-sur-Orge (91600)",
    reason:
      "La description est trop courte pour être publiée : précisez l'étage, l'exposition, les pièces et les charges, puis renvoyez l'annonce.",
    excerpt: "Bonjour, la maison est-elle toujours disponible ? Je peux visiter samedi matin.",
    reply: "Oui, elle est toujours disponible. Samedi 10 h vous convient-il ?",
    others: [
      {
        title: "Appartement 3 pièces avec balcon",
        reference: "LK-0043",
        place: "Juvisy-sur-Orge (91260)",
      },
      {
        title: "Terrain constructible de 600 m²",
        reference: "LK-0044",
        place: "Montlhéry (91310)",
      },
    ],
  },
};
