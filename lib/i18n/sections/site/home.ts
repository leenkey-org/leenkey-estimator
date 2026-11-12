// Texts of the public site, part « home » (lib/i18n/site.ts gathers them; P-06).
// The home page of direction C (docs/design-handoff/SPECS.md 3, DECISIONS
// 2026-10-26): the texts of the site kept where they exist; « Valoriser »
// where the mock-up says « Estimer » (CLAUDE.md section 16).

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";
// No-break space before « : ? ! ; », which never start a line (L1-45).
const NBSP = "\u00a0";

export const frSiteHome = {
  metaDescription:
    "La plateforme qui accompagne les propriétaires dans la vente de leur bien, sans agence : analyse de valeur, dossier, annonce, négociation, jusqu'à la signature. Forfait fixe et transparent.",
  hero: {
    // The slogan of Leenkey (Younes, 2026-11-04).
    badge: "Parce que le lien, c'est la clé",
    // Redesign D (docs/design-handoff-d/SPECS.md 3, item 1): the title of the
    // charte, its second line in the gradient.
    title: "Vendez votre bien autrement.",
    titleAccent: "Moins de frais, plus de contrôle.",
    lead: "Leenkey vous donne les outils et l'accompagnement pour vendre votre bien en toute simplicité, sans agence et à votre rythme.",
    // The shorter lead of the mobile mock-up.
    leadShort:
      "Les outils et l'accompagnement pour vendre en toute simplicité, sans agence et à votre rythme.",
    // The card set on the photo from 1 280 px: an illustration of the
    // analysis of value, always said to be an example (SPECS.md 2).
    example: {
      badge: "Exemple",
      // Its name for assistive technologies: the card says it is an example.
      label: "Exemple de valorisation",
      title: "Maison contemporaine",
      detail: (town: string, surface: number | null, rooms: number | null) =>
        `${town}\u00A0· ${surface}\u00A0m²\u00A0· ${rooms}\u00A0pièces`,
      valueLabel: "Ma valeur immobilière",
      note: "Analyse gratuite en 2\u00A0minutes",
    },
  },
  search: {
    // Not « Que voulez-vous faire ? »: the title of the shortcuts under it.
    label: "Votre projet",
    tabs: { buy: "Acheter", sell: "Vendre", valuation: "Valoriser mon bien" },
    // The labels of the tabs below 768 px, three in the width of a phone.
    tabsShort: { buy: "Acheter", sell: "Vendre", valuation: "Valoriser" },
    addressPlaceholder: "Adresse de votre bien",
    valuation: {
      label: "Adresse du bien à valoriser",
      action: "Valoriser mon bien gratuitement",
      points: ["Gratuit", "2 minutes", "Rapport PDF de 4 pages par email"],
      pointsShort: ["Gratuit", "2 minutes", "Rapport PDF par email"],
      /** Text typed, a suggestion not chosen: the estimator needs its postal code. */
      choose: "Choisissez votre adresse dans la liste.",
    },
    sell: {
      label: "Adresse du bien à vendre",
      action: "Publier mon bien gratuitement",
      note: "Formule Autonomie gratuite, sans engagement. Un conseiller si vous le souhaitez.",
    },
    buy: {
      where: `Où${NBSP}?`,
      wherePlaceholder: "Ville ou code postal",
      type: "Type de bien",
      typeAny: "Maison, appartement…",
      budget: "Budget max",
      budgetAny: "Ajouter un budget",
      budgetNone: "Sans limite",
      action: "Rechercher",
      mobileTitle: `Où cherchez-vous${NBSP}?`,
      mobileText: "Ville · Type de bien · Budget max",
      suggestions: "Communes de la zone de lancement",
    },
    suggestionsLabel: "Adresses proposées",
  },
  services: {
    label: "Accès directs",
    valuation: "Valoriser votre bien",
    listing: "Déposer une annonce",
    pricing: "Nos formules",
  },
  shortcuts: {
    title: `Que voulez-vous faire${NBSP}?`,
    items: {
      valuation: {
        title: "Valoriser mon bien",
        text: "Gratuit, en 2 minutes, sur les ventes réelles du quartier.",
        action: "Valoriser",
      },
      sell: {
        title: "Vendre mon bien",
        text: "Publiez gratuitement, gardez la main sur chaque étape.",
        action: "Publier",
      },
      support: {
        title: "Être accompagné",
        text: "Un conseiller dédié à vos côtés, du prix à la signature.",
        action: "Découvrir",
      },
      buy: {
        title: "Trouver un bien",
        text: "Maisons et appartements vendus par leurs propriétaires.",
        action: "Chercher",
      },
    },
  },
  savings: {
    eyebrow: "Un forfait fixe. Jamais de commission.",
    title: "Combien vous économisez avec Leenkey",
    // In the gradient (redesign D).
    accent: "économisez",
    lead: `Le prix ne dépend jamais de la valeur de votre bien. Choisissez un prix de vente${NBSP}:`,
    leadShort: `Choisissez un prix de vente${NBSP}:`,
    prices: "Prix de vente",
    agency: `Agence (hypothèse${NBSP}: 5${N}% du prix)`,
    agencyShort: `Agence (hyp. 5${N}%)`,
    // Before the fee of the agency, which rolls up as the price changes.
    approximately: `≈${NBSP}`,
    accompanied: "Leenkey Accompagné",
    autonomy: "Leenkey Autonomie",
    saved: "Vous économisez environ",
    note: "Comparaison avec la formule Accompagné. Les frais d'agence varient selon les agences et les biens.",
  },
  listings: {
    title: "Biens à vendre près de chez vous",
    place: `Autour d'Épinay-sur-Orge · 10${N}km`,
    categories: "Catégories de biens",
    category: {
      all: "Tous les biens",
      maison: "Maisons",
      appartement: "Appartements",
      jardin: "Avec jardin",
      parking: "Avec parking",
      terrain: "Terrains",
    },
    list: "Biens à vendre près de chez vous",
    all: (count: number, formatted: string) =>
      count > 1 ? `Voir les ${formatted} biens` : "Voir le bien",
    allShort: (count: number, formatted: string) =>
      count > 1 ? `Voir les ${formatted}` : "Voir le bien",
    browse: "Voir les biens",
    empty: "Aucun bien de cette catégorie pour l'instant.",
    page: (page: number, pages: number) => `${page}${NBSP}/${NBSP}${pages}`,
    previous: "Biens précédents",
    next: "Biens suivants",
    badgeNew: "Nouveau",
  },
  steps: {
    eyebrow: "Comment ça marche",
    title: "Trois étapes. Vous gardez les clés du début à la fin.",
    accent: "du début à la fin.",
    // Above the title of a step on a phone: « Étape 1 · Gratuit · 2 minutes ».
    label: (position: number) => `Étape ${position}`,
    items: [
      {
        title: "Estimez",
        text: "Une analyse de valeur fondée sur les ventes réelles de votre secteur, en quelques minutes. Gratuite et sans engagement.",
        tag: "Gratuit · 2 minutes",
      },
      {
        title: "Préparez",
        text: "Diagnostics, documents, annonce et visites : un dossier complet, prêt pour le notaire, sans oubli.",
        tag: "Dossier vendeur",
      },
      {
        // The plans of 2026-11-06: Accompagné up to the offer accepted,
        // Sérénité up to the signature.
        title: "Signez",
        text: "Analyse des offres et aide à la décision, puis suivi jusqu'à la signature. Un conseiller à vos côtés au moindre doute.",
        tag: "Accompagné ou Sérénité",
      },
    ],
  },
  plans: {
    // The plans as Younes worded them (2026-11-06, DECISIONS.md).
    title: "Les formules Leenkey",
    lead: "Vendez à votre rythme, avec l'accompagnement qui vous convient.",
    free: "Gratuit",
    taxes: "TTC",
    // By plan code: the short texts of the home page (the names and the
    // prices come from the plans table, the reference data). Autonomie is
    // put forward, no plan « recommandé » (Younes, 2026-11-04).
    items: {
      autonomie: {
        tag: "Pour avancer à votre rythme",
        text: "Tous les outils pour gérer votre vente vous-même.",
        note: "Sans carte bancaire et sans obligation de passer à une formule payante",
      },
      accompagne: {
        tag: "Pour être accompagné",
        text: "Vous gérez votre vente, un conseiller vous accompagne à chaque étape.",
        note: "Forfait fixe par bien · 12 mois d'accompagnement · payé à la souscription",
      },
      serenite: {
        tag: "Pour aller jusqu'à la signature",
        text: "Votre vente avance, nous vous accompagnons jusqu'à la signature.",
        note: "Forfait fixe par bien · 12 mois d'accompagnement · payé à la souscription",
      },
    },
    all: "Voir le détail des formules",
  },
  faq: {
    eyebrow: "Questions fréquentes",
    title: "Les trois questions essentielles.",
    accent: "essentielles.",
    items: [
      {
        question: "Est-ce vraiment gratuit pour commencer ?",
        answer: [
          "Oui. La formule ",
          { strong: "Autonomie est gratuite" },
          ", sans carte bancaire et sans obligation de passer à une formule payante. Elle comprend le rapport de valeur de votre bien, la création et la publication de votre annonce avec l'aide de l'IA, la messagerie, les demandes de visite et la réception des offres d'achat.",
        ],
      },
      {
        question: "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
        answer: [
          "Accompagné. Selon votre forfait, un conseiller Leenkey reste joignable à chaque étape : pour valider votre prix, relire une offre, ou répondre à un doute avant la signature. Vous gardez la main, sans jamais rester seul.",
        ],
      },
      {
        question: "Quelle différence avec une agence ?",
        answer: [
          "Vous restez décisionnaire. Leenkey apporte les outils, le parcours guidé et l'accompagnement, avec un ",
          { strong: "forfait fixe" },
          " plutôt qu'une commission au pourcentage sur le prix de vente.",
        ],
      },
    ],
    all: "Toutes les questions",
  },
  contact: {
    eyebrow: `Une question, un projet${NBSP}?`,
    title: "Parlons-en ensemble.",
    accent: "ensemble.",
    lead: "Propriétaire, investisseur, partenaire\u00A0— laissez-nous un message. Nous vous répondons personnellement sous 48 h, 7 j/7.",
  },
  final: {
    title: "Prêt à garder les clés de votre vente ?",
    accent: "les clés de votre vente",
    text: "Deux minutes pour connaître la valeur réelle de votre bien. Gratuit, sans engagement.",
    action: "Valoriser mon bien gratuitement",
    note: "Réponse sous 24 h par un conseiller · Aucune carte requise",
  },
} as const;
