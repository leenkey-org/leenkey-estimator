// Texts of the public site, part « about » (lib/i18n/site.ts gathers them; P-06).
// /qui-sommes-nous (L1-43): the V1 page; its labels above the titles and
// the arrows of its buttons are back since L1-50 (DECISIONS 2026-10-23).

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";

export const frSiteAbout = {
  metaTitle: "Qui sommes-nous · Leenkey",
  metaDescription:
    "Fondée par Cédric Da Cunha, Leenkey rend la vente immobilière enfin simple, humaine et transparente.",
  // The labels of the V1 page above its titles (L1-50, DECISIONS 2026-10-23).
  hero: {
    eyebrow: "Qui sommes-nous",
    title: "Rendre la vente immobilière enfin simple, humaine et transparente.",
    accent: "enfin simple, humaine et transparente.",
    lead: "Fondée par Cédric Da Cunha, Leenkey est née d'un constat simple\u00A0: vendre son bien immobilier en France reste trop complexe, trop opaque et souvent trop coûteux. Nous construisons une nouvelle façon de vendre, où l'intelligence artificielle accompagne chaque propriétaire pour lui permettre de vendre en toute autonomie, sans jamais être seul.",
    action: "Découvrir notre vision",
  },
  founder: {
    // The initials of the card on his photo, as in the V1.
    initials: "CD",
    name: "Cédric Da Cunha",
    role: "Fondateur & CEO · Leenkey",
    photoAlt: "Cédric Da Cunha, fondateur de Leenkey",
  },
  // TODO(client): figures to confirm (Q53).
  figures: [
    { value: "15 ans", label: "d'expérience dans l'immobilier" },
    { value: "300+", label: "transactions accompagnées" },
    { value: `100${N}%`, label: "français, données hébergées en France" },
    { value: "24 / 7", label: "un copilote IA à vos côtés" },
  ],
  story: {
    eyebrow: "L'histoire",
    title: "Pourquoi j'ai lancé Leenkey.",
    accent: "Leenkey.",
    paragraphs: [
      [
        "Après ",
        { strong: "plus de quinze années dans l'immobilier" },
        ", j'ai accompagné des centaines de propriétaires dans leur projet de vente. J'ai constaté la même difficulté, encore et encore\u00A0: vendre un bien reste un parcours complexe, stressant et souvent coûteux. Beaucoup renoncent à vendre seuls, non par manque de motivation, mais parce qu'ils manquent d'accompagnement.",
      ],
      ["C'est de ce constat qu'est née Leenkey."],
      [
        "Mon ambition est simple\u00A0: permettre à chaque propriétaire de vendre son bien en toute autonomie, sans jamais être seul. Grâce à une plateforme pilotée par l'",
        { strong: "intelligence artificielle" },
        ", Leenkey accompagne chaque étape de la vente, de l'analyse de la valeur du bien jusqu'à la signature chez le notaire, avec un accompagnement disponible ",
        { strong: "24\u00A0h/24 et 7\u00A0j/7" },
        ".",
      ],
      [
        "Je suis convaincu qu'un propriétaire ne devrait pas avoir à céder plusieurs milliers d'euros de commission pour bénéficier d'un accompagnement de qualité. Il mérite de comprendre chaque étape, de garder le contrôle de sa vente et de profiter des meilleurs outils technologiques dans un cadre simple, transparent et accessible.",
      ],
    ],
    highlight:
      "Leenkey est née de cette conviction\u00A0: redonner aux propriétaires les clés de leur vente.",
  },
  values: {
    eyebrow: "Nos valeurs",
    title: "Ce qui nous anime au quotidien.",
    lead: "Quatre principes qui guident chaque décision produit, chaque conversation client, chaque ligne de code.",
    items: [
      {
        title: "Transparence radicale",
        text: "Aucune commission cachée, aucun tarif surprise. Le prix est annoncé avant de commencer, en euros TTC.",
      },
      {
        title: "Rigueur technique",
        text: "Modèles d'analyse construits sur les données réelles (DVF, marché local). Pas d'approximation, pas de moyenne floue.",
      },
      {
        title: "Accompagnement humain",
        text: "Un conseiller joignable à chaque étape. La technologie sert la relation, elle ne la remplace jamais.",
      },
      {
        title: "Impact mesurable",
        text: "Notre succès se mesure à la valeur que nous redonnons aux propriétaires. Chaque vente réalisée avec Leenkey est synonyme d'économies concrètes, d'une meilleure maîtrise du processus et d'une plus grande sérénité tout au long de la vente.",
      },
    ],
  },
  final: {
    title: "Prêt à échanger avec Cédric\u00A0?",
    accent: "Cédric\u00a0?",
    text: "Que vous soyez propriétaire, investisseur ou partenaire potentiel\u00A0— la porte est ouverte. Un mot suffit pour démarrer la discussion.",
    contact: "Nous contacter",
    valuation: "Valoriser mon bien gratuitement",
  },
} as const;
