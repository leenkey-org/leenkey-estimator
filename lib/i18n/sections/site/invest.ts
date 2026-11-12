// Texts of the public site, part « invest » (lib/i18n/site.ts gathers them; P-06).
// /investir (L1-43): the V1 page. Left out (DECISIONS 2026-10-19, Q53): the
// market figures without a source, the forecasts and the targets, and
// « diffusion auto » (listings exclusive to Leenkey); « 10 milliards
// d'euros » becomes « des milliards d'euros » and the engine is no « modèle
// entraîné ». Since L1-50 (DECISIONS 2026-10-23): its labels above the
// titles are back, « Zéro acteur dominant » and the « 100 » of its first
// sellers are out too.

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";

export const frSiteInvest = {
  metaTitle: "Investir dans le projet · Leenkey",
  metaDescription:
    "Leenkey construit la première plateforme française qui permet à chaque propriétaire de vendre son bien sans agence. Nous cherchons des partenaires qui croient, comme nous, que ce marché mérite mieux.",
  // The labels of the V1 page above its titles (L1-50, DECISIONS 2026-10-23).
  hero: {
    eyebrow: "Opportunité d'investissement · Proptech France 2026",
    title: "L'immobilier français se réinvente. Soyez-en.",
    accent: "Soyez-en.",
    // Its two paragraphs, as in the V1.
    lead: [
      "Leenkey construit la première plateforme française qui permet à chaque propriétaire de vendre son bien sans agence : accompagné, guidé, à frais réduits.",
      "Nous cherchons des partenaires qui croient, comme nous, que ce marché mérite mieux.",
    ],
    action: "Rejoindre l'aventure",
  },
  hook: {
    title:
      "Chaque année en France, les propriétaires versent des milliards d'euros aux agences immobilières.",
    // The words in blue of the V1 (« 10 milliards d'euros » there).
    accent: "des milliards d'euros",
    text: ["Pas parce qu'ils le veulent. ", { strong: "Parce qu'ils n'ont pas d'autre choix." }],
    last: "Jusqu'ici.",
  },
  market: {
    eyebrow: "Ce que personne n'a encore vraiment résolu",
    title: "Un marché gigantesque, figé depuis 30 ans.",
    lead: [
      "Vendre un bien immobilier en France, c'est encore aujourd'hui choisir entre ",
      { strong: "deux alternatives" },
      ".",
    ],
    alone: [
      "D'un côté, ",
      { strong: "vendre seul" },
      ", sans véritable plan d'action, avec des informations souvent contradictoires et sans accompagnement pour sécuriser chaque étape de la vente.",
    ],
    or: "ou",
    // The figure beside the text in the V1: 5 % of a sale at 300 000 €.
    example: {
      value: `15${N}000${N}€`,
      label: `prélevés sur une seule vente à 300${N}000${N}€`,
    },
    agency: [
      { strong: "«\u00A0Passer par une agence\u00A0»" },
      " et accepter de céder en moyenne ",
      { strong: `5${N}% du prix de vente` },
      " en honoraires, soit environ ",
      { strong: `15${N}000${N}€` },
      ".",
    ],
    need: [
      "Des milliers de propriétaires ",
      { strong: "veulent vendre seuls, mais pas sans aide" },
      ".",
    ],
    answer:
      "Leenkey leur donne les outils, la méthode et l'accompagnement pour réussir leur vente en toute sérénité.",
  },
  vision: {
    eyebrow: "La vision",
    title: "Un écosystème IA qui copilote la vente immobilière, de bout en bout.",
    accent: "écosystème IA",
    lead: "Leenkey n'est pas une simple plateforme de mise en relation.",
    statement:
      "Leenkey se construit comme un écosystème complet, dans lequel le propriétaire particulier est accompagné par un ensemble d'outils automatisés par des IA spécifiquement développées pour copiloter la vente de A à Z.",
    steps: [
      "Analyse de valeur, préparation du dossier, création et diffusion d'annonce, filtrage des acheteurs, aide à la négociation, coordination notariale\u00A0— chaque étape est augmentée par une couche d'intelligence, disponible ",
      { strong: "24\u00A0h\u00A0/\u00A024 et 7\u00A0j\u00A0/\u00A07" },
      ".",
    ],
    goal: "Objectif : rendre autonome, rapide et rentable une opération qui, aujourd'hui encore, coûte des milliers d'euros et des semaines de stress. Une plateforme scalable, à faible coût d'exploitation et à fort effet de réseau.",
    items: [
      {
        title: "IA d'analyse et de pricing",
        text: "Analyse fondée sur les données DVF + marché local. Une valeur juste, en 2 minutes, sans conflit d'intérêt.",
      },
      {
        title: "Copilote conversationnel 24/7",
        text: "Une IA disponible à tout moment pour répondre au propriétaire, préparer son dossier, filtrer les acheteurs et guider la négociation.",
      },
      {
        title: "Automatisation bout-en-bout",
        text: "Diagnostics, documents, agendas, offres, coordination notariale\u00A0— chaque tâche répétitive prise en charge par la plateforme.",
      },
      {
        title: "Un écosystème ouvert",
        text: "Notaires, courtiers, diagnostiqueurs, home stagers digitaux\u00A0— connectés à la plateforme via une marketplace de services activables en un clic.",
      },
    ],
  },
  // Labels of the stage of a milestone, a source of income or a phase.
  status: { done: "Fait", ongoing: "En cours", next: "À venir" },
  progress: {
    eyebrow: "État d'avancement",
    title: "Ce n'est pas une idée. C'est un projet construit.",
    items: [
      {
        title: "Concept validé",
        status: "done",
        text: "Études de marché approfondies. Le besoin est réel, documenté, chiffré.",
      },
      {
        title: "Marque construite",
        status: "done",
        text: "Identité visuelle, positionnement, ton de marque. Leenkey existe.",
      },
      {
        title: "Outil de valorisation développé",
        status: "done",
        text: "Testé sur des données réelles. Résultats précis et exploitables.",
      },
      {
        title: "Première version en ligne",
        status: "done",
        text: "Le site et l'outil de valorisation sont actifs. Les fondations sont posées. Tout le reste est à construire.",
      },
      {
        title: "Premiers vendeurs accompagnés",
        status: "ongoing",
        text: "Acquisition en cours. Premiers retours terrain.",
      },
      {
        title: "V2\u00A0— Automatisation et scale",
        status: "ongoing",
        text: "Dashboard vendeur, IA avancée, marketplace partenaires.",
      },
    ],
    closing: [
      "Leenkey n'est pas un projet qui cherche à se financer pour exister. Les fondations sont posées, et c'est maintenant que tout se joue. ",
      {
        strong:
          "Nous cherchons des partenaires pour développer le projet et faire, ensemble, une vraie révolution.",
      },
    ],
  },
  model: {
    eyebrow: "Comment Leenkey crée de la valeur",
    title: "Un modèle simple, rentable dès le premier client.",
    // « Source 3 · V2 » of the V1: « Source 3 », its stage « À venir » beside it.
    source: (index: number) => `Source ${index}`,
    items: [
      {
        title: "Forfait vendeur",
        text: "Le propriétaire accède à la plateforme complète via un forfait fixe. Revenus dès la souscription d'une formule.",
        tag: "Scalable à l'infini",
      },
      {
        title: "Services additionnels",
        text: "Photos professionnelles, diagnostics, home staging digital, accompagnement juridique.",
        tag: "Marge élevée · optionnel",
      },
      {
        title: "Modèle SaaS B2B",
        text: "Licencier la technologie à des promoteurs, gestionnaires de patrimoine, family offices.",
        tag: "Abonnement récurrent",
        status: "next",
      },
    ],
  },
  timing: {
    eyebrow: "Le timing",
    title: "La fenêtre est ouverte. Elle ne le sera pas toujours.",
    items: [
      {
        title: "Le consommateur est prêt",
        text: "Les Français ont appris à se passer des intermédiaires dans la banque, l'assurance, la santé, les voyages. L'immobilier est le dernier grand secteur à ne pas avoir basculé.",
        point: "La demande est là. Elle attend l'offre.",
      },
      {
        title: "La confiance aux agences s'érode",
        text: "Les avis en ligne, la transparence imposée par internet, les comparaisons de prix\u00A0— tout cela fragilise un modèle qui vivait de l'opacité.",
        point: "Le vendeur d'aujourd'hui est informé. Il compare. Il remet en question.",
      },
      {
        title: "La technologie rend tout possible",
        text: "L'IA permet une valorisation sérieuse sans expert humain. Les données notariales sont accessibles. Les outils de diffusion existent.",
        point: "Il manquait quelqu'un pour tout assembler intelligemment.",
      },
    ],
    closing: "C'est Leenkey.",
  },
  roadmap: {
    eyebrow: "La vision 24 mois",
    title: "Une construction méthodique, étape par étape.",
    items: [
      {
        when: "Maintenant",
        title: "Valider le modèle",
        list: [
          "Accompagner les premiers vendeurs",
          "Collecter les feedbacks terrain",
          "Affiner le produit",
          "Prouver que ça marche",
        ],
      },
      {
        when: "Demain",
        title: "Automatiser et scaler",
        list: [
          "Dashboard vendeur complet",
          "Diffusion exclusive portail Leenkey",
          "Analyse des offres par IA",
          "Matching acheteur-vendeur",
          "Marketplace partenaires",
        ],
      },
      {
        when: "Après-demain",
        title: "Dominer et s'étendre",
        list: [
          "Déploiement national, toutes régions",
          "Offre B2B promoteurs & gestionnaires de patrimoine",
          "Ouverture Belgique et Espagne",
          "Levée de fonds Série A",
        ],
      },
    ],
  },
  reasons: {
    eyebrow: "Ce que vous obtenez",
    title: "Pourquoi les bons rejoignent Leenkey maintenant.",
    items: [
      {
        title: "Un marché énorme, encore vierge",
        text: "Des milliards d'euros de commissions. La place est à prendre\u00A0— et Leenkey est déjà en train de la prendre.",
      },
      {
        title: "Des bases solides, une révolution à construire",
        text: "Marque, outil de valorisation, première plateforme : les fondations sont là. Le plus grand reste à bâtir, et c'est là que vous entrez en jeu.",
      },
      {
        title: "Rentable dès le début",
        text: "Le forfait vendeur génère du revenu dès la souscription d'une formule. Pas 3 ans de R&D avant de monétiser.",
      },
      {
        title: "Une équipe qui connaît le terrain",
        text: "Expertise produit, développement digital, stratégie commerciale et connaissance réelle du marché immobilier français.",
      },
    ],
  },
  message: {
    quote: [
      "Le marché immobilier représente la plus grande opportunité de disruption encore intacte en France. ",
      { strong: "Leenkey est positionné pour la saisir." },
    ],
    paragraphs: [
      "Nous ne cherchons pas des investisseurs passifs.",
      "Nous cherchons des personnes qui comprennent ce marché, qui croient au modèle, et qui veulent contribuer à construire quelque chose qui change vraiment la façon dont les Français vendent leur bien.",
      "Si c'est votre cas, la prochaine étape est simple.",
    ],
    action: "Parlons-en",
  },
  faq: {
    eyebrow: "Questions fréquentes",
    title: "Vos questions méritent des réponses claires.",
    items: [
      {
        question: "Quel est le montant de la levée recherchée ?",
        answer: [
          "Nous sommes en phase d'amorçage. Les montants et modalités sont discutés directement selon le profil et les objectifs de chaque partenaire. Remplissez le formulaire\u00A0— c'est là que tout commence.",
        ],
      },
      {
        question: "Puis-je voir le pitch deck complet ?",
        answer: [
          "Oui. Il est disponible sur demande après un premier échange. Remplissez le formulaire et nous vous le transmettrons rapidement.",
        ],
      },
      {
        question: "Est-ce que je peux tester le produit avant ?",
        answer: [
          "Absolument. L'outil de valorisation est accessible gratuitement depuis la page d'accueil. C'est la meilleure façon de voir concrètement ce que Leenkey construit.",
        ],
      },
      {
        question: "Quelle vision de sortie pour les partenaires ?",
        answer: [
          "Plusieurs scénarios à 5 ans : acquisition stratégique, introduction en bourse, ou buyout. Ces scénarios sont détaillés dans le pitch deck transmis lors du premier échange qualifié.",
        ],
      },
      {
        question: "Le projet est-il limité à la France ?",
        answer: [
          `Le focus initial est 100${N}% France. L'expansion en Belgique et en Espagne est prévue une fois le modèle solidement validé sur le marché français.`,
        ],
      },
      {
        question: "Qui est derrière Leenkey ?",
        answer: [
          "Une équipe combinant expertise produit, développement digital et connaissance du marché immobilier. Les détails sont partagés lors du premier échange.",
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Échangeons",
    title: "Parlons directement de votre intérêt pour Leenkey.",
    lead: "Contactez Cédric en un clic par WhatsApp ou par email, ou remplissez le formulaire ci-dessous. Nous revenons vers vous sous 48 h.",
    whatsapp: {
      hint: "Le plus rapide",
      label: "Contacter par WhatsApp",
      message: "Bonjour Cédric, je souhaiterais échanger avec vous au sujet de Leenkey.",
    },
    email: {
      hint: "Par email",
      label: "Écrire à l'équipe Leenkey",
      subject: "Investir dans Leenkey",
      body: "Bonjour Cédric,\n\nJe souhaite échanger au sujet du projet Leenkey.",
    },
    note: "Réponse sous 48 h, 7 j/7 · Sans engagement",
  },
  final: {
    title:
      "L'immobilier français se réinvente. La question, c'est : vous en faites partie ou pas ?",
    accent: "vous en faites partie ou pas\u00a0?",
    text: "Rejoignez les partenaires qui construisent avec nous la prochaine référence de la vente immobilière en France.",
    action: "Rejoindre le projet",
  },
} as const;
