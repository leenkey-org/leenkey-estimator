// Texts of the public site, part « concept » (lib/i18n/site.ts gathers them; P-06).
// /concept (L1-42): the V1 page, its portals and « entièrement gratuit »
// corrected (DECISIONS 2026-10-19).

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";
// No-break space before « : ? ! ; », which never start a line (L1-45).
const NBSP = "\u00a0";

export const frSiteConcept = {
  metaTitle: "Le concept · Leenkey",
  metaDescription:
    "Combien vaut vraiment votre bien ? Leenkey commence par une valorisation honnête, avant tout engagement commercial.",
  // The labels of the V1 page above its titles (L1-50, DECISIONS 2026-10-23).
  hero: {
    badge: "Le concept",
    title: "Combien vaut vraiment votre bien ?",
    accent: "vraiment",
    lead: "C'est la première question que se pose tout propriétaire. Et c'est exactement là que Leenkey commence : par une valorisation honnête, avant tout engagement commercial.",
    action: "Valoriser mon bien",
  },
  // The two alternatives of the V1 (/investir, « Le problème »), word for
  // word in the cards of the page: neither said to be a bad choice
  // (Younes, 2026-11-04).
  options: {
    eyebrow: "L'idée de départ",
    title:
      "Vendre un bien immobilier en France, c'est encore aujourd'hui choisir entre deux alternatives.",
    items: [
      {
        title: "Vendre seul",
        text: "Sans véritable plan d'action, avec des informations souvent contradictoires et sans accompagnement pour sécuriser chaque étape de la vente.",
      },
      {
        title: "Passer par une agence",
        // The V1 card: « prélevés sur une seule vente à 300 000 € ».
        text: `Et accepter de céder en moyenne 5${N}% du prix de vente en honoraires, soit environ 15${N}000${N}€ sur une vente à 300${N}000${N}€.`,
      },
    ],
    or: "ou",
    // Above each alternative.
    option: (index: number) => `Option ${index}`,
    question: [
      "Des milliers de propriétaires ",
      { strong: "veulent vendre seuls, mais pas sans aide." },
    ],
    answer:
      "Leenkey leur donne les outils, la méthode et l'accompagnement pour réussir leur vente en toute sérénité.",
  },
  // The words of the V1 landing (« Ce que vous obtenez en quelques
  // minutes. »), in the four cards of the page, numbered as in the V1
  // (Younes, 2026-11-04).
  tool: {
    eyebrow: "Le cœur du concept",
    title: "Ce que vous obtenez en quelques minutes.",
    lead: "Tout commence par une analyse sérieuse de votre bien. Gratuite et sans engagement.",
    items: [
      {
        title: "Une fourchette de valeur, pas un prix figé",
        text: "Une valeur indicative accompagnée d'une fourchette, dont la précision s'affine selon les informations renseignées sur votre bien.",
      },
      {
        title: "Les ventes réelles de votre quartier",
        text: "Les transactions immobilières publiées par l'administration fiscale, localisées à l'adresse et analysées pour retenir les références les plus pertinentes.",
      },
      {
        title: "Ce qui fait monter ou baisser le prix",
        text: `État, DPE, extérieurs, prestations, étage${NBSP}: chaque critère est chiffré séparément.`,
      },
      {
        title: "Un rapport complet en PDF",
        text: `Quatre pages reçues par email${NBSP}: valorisation, marché local, stratégie de vente et plan d'action.`,
      },
    ],
    quote: [
      "Une moyenne vous donne un chiffre. ",
      { strong: "Une analyse vous donne le contrôle." },
    ],
    after: "C'est la base de tout ce que Leenkey construit ensuite.",
  },
  next: {
    eyebrow: "Ce que Leenkey ouvre ensuite",
    title: "La valorisation est le déclencheur. Voici ce qu'elle ouvre.",
    lead: "L'accès à une plateforme complète pour vendre sans agence, mais avec tout l'accompagnement nécessaire.",
    items: [
      {
        // Not « professionnelle »: the seller writes it, guided (Younes,
        // 2026-11-04). V1: « diffusion sur tous les portails majeurs depuis
        // un seul endroit »; the listings are exclusive to Leenkey.
        title: "Une annonce optimisée",
        text: "Rédaction guidée, photos conseillées, diffusion en exclusivité sur Leenkey.",
      },
      {
        title: "Un espace de gestion",
        text: "Visites planifiées en ligne, offres centralisées, documents organisés. Vous voyez tout, vous décidez tout, depuis chez vous.",
      },
      {
        title: "Un accompagnement humain",
        text: "Un conseiller disponible aux moments qui comptent : votre prix, les offres reçues, la préparation des échanges avec le notaire. Pas un chatbot, une personne.",
      },
      {
        // V1: « Leenkey est entièrement gratuit […] tous les outils »; the
        // V2 sells Accompagné and Sérénité; Autonomie is free with no end of
        // a launch phase (Younes, 2026-11-04).
        title: "Une formule gratuite",
        text: `La formule Autonomie est entièrement gratuite. Aucune commission, aucun engagement${NBSP}: vous profitez de ses outils, et vous gardez 100${N}% du fruit de votre vente.`,
      },
    ],
  },
  final: {
    title: "Commencez par la bonne question.",
    text: "5 minutes pour connaître la valeur réelle de votre bien. Gratuit, sans engagement.",
    action: "Valoriser mon bien gratuitement",
    note: "Réponse honnête, avant tout engagement commercial",
  },
} as const;
