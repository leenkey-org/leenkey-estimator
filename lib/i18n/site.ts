// Texts of the public site in V2 (DECISIONS 2026-10-19, « V2 finale »): the
// pages of the V1 (its HTML pages and /qui-sommes-nous) rebuilt with the Façade components.
// Cédric's texts are kept word for word; the only changes are listed in
// DECISIONS (invented figures, decorative numbering, arrows and emoji left
// out, contact answer « sous 48 h, 7 j/7 » as in CLAUDE.md section 16, no
// « portails » since the listings are exclusive to Leenkey). Part of fr.ts.

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";
// No-break space before « : ? ! ; », which never start a line (L1-45).
const NBSP = "\u00a0";

export const site = {
  // Marketing pages, in the footer of the V2 pages and in the mobile menu.
  links: {
    label: "Découvrir Leenkey",
    concept: "Concept",
    pricing: "Tarifs",
    faq: "FAQ",
    invest: "Investir",
    about: "Qui sommes-nous",
    contact: "Contact",
  },
  // G1 mobile header (docs/DESIGN.md 11): logo and menu.
  menu: {
    open: "Menu",
    close: "Fermer le menu",
    signIn: "Mon compte",
    mySpace: "Mon espace",
  },
  home: {
    metaDescription:
      "La plateforme qui accompagne les propriétaires dans la vente de leur bien, sans agence : analyse de valeur, dossier, annonce, négociation, jusqu'à la signature. Forfait fixe et transparent.",
    hero: {
      title: "Leenkey vous donne les clés de votre vente.",
      // The highlighted words of the V1 titles (DECISIONS 2026-10-20).
      accent: "votre vente.",
      lead: "Vendez sans agence, accompagné à chaque étape\u00A0— de l'analyse de valeur jusqu'à la signature.",
      entries: "Vendre ou acheter",
      sell: "Je vends",
      buy: "J'achète",
      points: [
        "Forfait fixe · jamais de commission",
        "Plus de contrôle · vous validez tout",
        "Accompagné à chaque étape",
      ],
    },
    latest: {
      title: "Les derniers biens",
      all: (count: number, formatted: string) =>
        count > 1 ? `Voir les ${formatted} biens` : "Voir le bien",
    },
    stages: {
      title: "Où en êtes-vous dans votre vente ?",
      accent: "votre vente ?",
      lead: "Choisissez votre situation. Leenkey vous indique par où commencer.",
      label: "Votre situation",
      items: [
        {
          key: "reflexion",
          label: "Je réfléchis",
          title: "Commencez par comprendre votre marché.",
          text: "Une première analyse de valeur, et les étapes à anticiper avant toute mise en vente.",
          action: "Commencer gratuitement",
          href: "/estimer",
        },
        {
          key: "prix",
          label: "Je veux connaître mon prix",
          title: "Situez votre bien au bon prix.",
          text: "Renseignez ses caractéristiques : vous verrez le montant, sa fourchette, et ce qui le fait monter ou baisser.",
          action: "Valoriser mon bien",
          href: "/estimer",
        },
        {
          key: "preparation",
          label: "Je prépare ma vente",
          title: "Préparez votre vente sans rien oublier.",
          text: "Diagnostics, documents, annonce : le parcours vous indique ce qui reste à faire avant de publier.",
          action: "Préparer ma vente",
          href: "/estimer",
        },
        {
          key: "en_vente",
          label: "Mon bien est déjà en vente",
          title: "Faites le point sur votre vente en cours.",
          text: "Un conseiller regarde votre positionnement face au marché et vous dit quels leviers actionner si les visites ne suivent pas.",
          action: "Parler à un conseiller",
          href: "#contact",
        },
      ],
    },
    steps: {
      title: "Trois étapes. Vous gardez les clés du début à la fin.",
      accent: "du début à la fin.",
      step: (index: number, total: number) => `Étape ${index} sur ${total}`,
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
          title: "Signez",
          text: "Analyse des offres, négociation et coordination du notaire. Un conseiller à vos côtés au moindre doute.",
          tag: "Accompagné",
        },
      ],
    },
    features: {
      title: "Ce que vous obtenez en quelques minutes.",
      accent: "en quelques minutes.",
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
          text: "État, DPE, extérieurs, prestations, étage : chaque critère est chiffré séparément.",
        },
        {
          title: "Un rapport complet en PDF",
          text: "Quatre pages reçues par email : valorisation, marché local, stratégie de vente et plan d'action.",
        },
      ],
      action: "Valoriser mon bien gratuitement",
    },
    space: {
      title: "Vous savez toujours quoi faire ensuite.",
      accent: "quoi faire ensuite.",
      lead: "Votre vente se pilote depuis un seul endroit : le dossier, l'annonce, les visites et les offres, avec la prochaine action toujours affichée.",
      next: {
        label: "Prochaine étape",
        title: "Programmer les diagnostics",
        text: "À faire avant la mise en ligne de l'annonce.",
      },
      journey: "Votre parcours",
      // The V1 example figures (« 845 000 € », « 12 pièces sur 15 ») and
      // « Publication sur les portails » are left out (DECISIONS 2026-10-19).
      steps: [
        { title: "Valeur validée", text: "Votre prix et sa fourchette", state: "done" },
        {
          title: "Dossier vendeur",
          text: "Pièces fournies, diagnostics à programmer",
          state: "current",
        },
        {
          title: "Annonce & visites",
          text: "Publication sur Leenkey, gestion des créneaux",
          state: "todo",
        },
        {
          title: "Offres & notaire",
          text: "Comparaison des offres, suivi jusqu'à la signature",
          state: "todo",
        },
      ],
      done: "Fait",
      current: "En cours",
      todo: "À venir",
      caption: "Aperçu de l'espace vendeur.",
    },
    comparison: {
      title: "Bénéficiez d'un support total et gardez votre indépendance.",
      accent: "indépendance.",
      lead: "Pourquoi se lancer seul, sans outils, et finir par se tourner vers une agence en payant des honoraires importants\u00A0— alors qu'une solution intermédiaire existe ?",
      example: `Sur une vente à 350${N}000${N}€`,
      rows: ["Frais de vente", "Accompagnement", "Contrôle de la vente", "Sécurité juridique"],
      columns: [
        {
          key: "seul",
          name: "Vente seul",
          detail: "Aucun intermédiaire",
          values: ["Minimes", "Aucun", "Total", "À votre charge"],
        },
        {
          key: "leenkey",
          name: "Leenkey",
          detail: "Forfait fixe, accompagné",
          values: [
            `990 à 1${N}500${N}€`,
            "Outils + conseiller",
            `100${N}% à vous`,
            "Notaire coordonné",
          ],
        },
        {
          key: "agence",
          name: "Agence",
          detail: "Commission au pourcentage",
          values: [`≈ 15${N}000${N}€`, "Complet", "Délégué à l'agent", "Mandat d'agence"],
        },
      ],
    },
    plans: {
      title: "Un forfait fixe. Jamais de commission.",
      accent: "Jamais de commission.",
      lead: "Vous choisissez votre niveau d'accompagnement. Le prix ne dépend jamais de la valeur de votre bien.",
      free: "Gratuit",
      taxes: "TTC",
      // By plan code: the short texts of the home page (the names and the
      // prices come from the plans table, the reference data).
      items: {
        autonomie: {
          text: "Pour piloter votre vente en toute autonomie.",
          note: "Sans engagement · sans carte bancaire",
        },
        accompagne: {
          text: "Un conseiller dédié à vos côtés, du prix à la signature.",
          note: "Forfait fixe · payé à la souscription",
        },
        serenite: {
          text: "Nous nous occupons de presque tout, vous gardez la décision.",
          note: "Forfait fixe · payé à la souscription",
        },
      },
      all: "Voir le détail des formules",
    },
    faq: {
      title: "Les trois questions essentielles.",
      accent: "essentielles.",
      items: [
        {
          question: "Est-ce vraiment gratuit pour commencer ?",
          answer: [
            "Oui. La formule ",
            { strong: "Autonomie est gratuite" },
            " pendant la phase pilote, sans engagement et sans carte bancaire. Elle inclut l'analyse de votre bien, un call stratégique de 30 minutes et la mise en place du dossier de vente.",
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
      title: "Parlons-en ensemble.",
      accent: "ensemble.",
      lead: "Propriétaire, investisseur, partenaire\u00A0— laissez-nous un message. Nous vous répondons personnellement sous 48 h, 7 j/7.",
    },
    final: {
      title: "Prêt à garder les clés de votre vente ?",
      text: "Deux minutes pour connaître la valeur réelle de votre bien. Gratuit, sans engagement.",
      action: "Valoriser mon bien gratuitement",
      note: "Réponse sous 24 h par un conseiller · Aucune carte requise",
    },
  },
  // /concept (L1-42): the V1 page, its portals and « entièrement gratuit »
  // corrected (DECISIONS 2026-10-19).
  concept: {
    metaTitle: "Le concept · Leenkey",
    metaDescription:
      "Combien vaut vraiment votre bien ? Leenkey commence par une valorisation honnête, avant tout engagement commercial.",
    hero: {
      title: "Combien vaut vraiment votre bien ?",
      accent: "vraiment",
      lead: "C'est la première question que se pose tout propriétaire. Et c'est exactement là que Leenkey commence : par une valorisation honnête, avant tout engagement commercial.",
      action: "Valoriser mon bien",
    },
    options: {
      title: "Aujourd'hui, vendre laisse le choix entre deux mauvaises options.",
      lead: "Leenkey est né d'un constat simple. Pour vendre un bien en France, il faut choisir : payer cher, ou avancer seul, sans outil fiable.",
      items: [
        {
          title: "L'agence",
          text: `3 à 5${N}% de commission sur le prix de vente, pour un travail que vous pourriez piloter vous-même.`,
        },
        {
          title: "Seul, sans outil",
          text: "Aucun repère fiable, aucun accompagnement. Vous improvisez chaque étape, sans savoir si vous vendez au bon prix.",
        },
      ],
      or: "ou",
      question: [
        "Avant de parler de vente, une seule question compte : ",
        { strong: "combien vaut votre bien ?" },
      ],
      answer:
        "La réponse qui vous est donnée aujourd'hui est soit trop vague (les analyses de valeur en ligne), soit intéressée (l'agent qui veut le mandat). Leenkey commence là, par un outil de valorisation sérieux qui donne une réponse honnête avant tout engagement.",
    },
    tool: {
      title: "L'outil de valorisation.",
      lead: "Pas un algorithme basé sur le code postal et les m². Une valorisation construite après une vraie analyse de marché.",
      items: [
        {
          label: "Ce que nous avons étudié",
          title: "Une analyse de fond, pas une moyenne",
          list: [
            "Les transactions réelles enregistrées par les notaires, secteur par secteur",
            "Les critères qui font vraiment varier le prix : DPE, étage, orientation, état, travaux, transports, commerces",
            "Les tendances du marché local sur 12 mois glissants",
            "Les écarts constatés entre prix affiché et prix de vente réel",
          ],
        },
        {
          label: "Ce que l'outil prend en compte",
          title: "Tous les facteurs de valeur, pondérés",
          text: "Pas seulement la surface et la localisation. L'état du bien, les prestations, le DPE, la situation juridique, l'environnement immédiat, les risques. Chaque critère est pondéré selon son impact réel sur le marché local.",
        },
        {
          label: "Ce qu'il produit",
          title: "Une fourchette réaliste, analysée",
          text: "Pas un chiffre sorti du chapeau. Une fourchette réaliste avec une analyse détaillée : quels éléments tirent le prix vers le haut, lesquels le pénalisent, et où se situe votre bien face aux ventes récentes comparables.",
        },
        {
          label: "Pourquoi c'est différent",
          title: "Vous comprenez le prix",
          text: "Les outils en ligne donnent une moyenne. Leenkey donne une analyse. La différence : vous comprenez pourquoi votre bien vaut ce prix. Et ça change tout pour la suite de la vente.",
        },
      ],
      quote: [
        "Une moyenne vous donne un chiffre. ",
        { strong: "Une analyse vous donne le contrôle." },
      ],
      after: "C'est la base de tout ce que Leenkey construit ensuite.",
    },
    next: {
      title: "La valorisation est le déclencheur. Voici ce qu'elle ouvre.",
      lead: "L'accès à une plateforme complète pour vendre sans agence, mais avec tout l'accompagnement nécessaire.",
      items: [
        {
          title: "Une annonce professionnelle",
          // V1: « diffusion sur tous les portails majeurs depuis un seul
          // endroit »; the listings are exclusive to Leenkey.
          text: "Rédaction optimisée, photos conseillées, diffusion en exclusivité sur Leenkey.",
        },
        {
          title: "Un espace de gestion",
          text: "Visites planifiées en ligne, offres centralisées, documents organisés. Vous voyez tout, vous décidez tout, depuis chez vous.",
        },
        {
          title: "Un accompagnement humain",
          text: "Un conseiller disponible aux moments qui comptent : la négociation, les questions juridiques, la coordination avec le notaire. Pas un chatbot, une personne.",
        },
        {
          title: "Gratuit pendant le lancement",
          // V1: « Leenkey est entièrement gratuit […] tous les outils »; the
          // V2 sells Accompagné and Sérénité.
          text: `Pendant notre phase pilote, la formule Autonomie est entièrement gratuite. Aucune commission, aucun engagement${NBSP}: vous profitez de ses outils, et vous gardez 100${N}% du fruit de votre vente.`,
        },
      ],
    },
    final: {
      title: "Commencez par la bonne question.",
      text: "5 minutes pour connaître la valeur réelle de votre bien. Gratuit, sans engagement.",
      action: "Valoriser mon bien gratuitement",
      note: "Réponse honnête, avant tout engagement commercial",
    },
  },
  // /tarifs (L1-42): the contents of the plans come from the plans table
  // (SPEC-V2 11 bis), the V1 lists describing another offer.
  pricing: {
    metaTitle: "Tarifs · Leenkey",
    metaDescription:
      "Trois formules à forfait fixe, jamais de commission : Autonomie gratuite pendant la phase pilote, Accompagné et Sérénité payées à la souscription.",
    title: "Une formule pour chaque vendeur.",
    accent: "chaque vendeur.",
    lead: "Pendant notre phase pilote, accédez à la version gratuite de Leenkey. Aucun engagement, aucune carte bancaire demandée. Vendez votre bien et économisez réellement.",
    view: "Affichage des formules",
    views: { price: "Gratuit pendant le lancement", savings: "Mon économie vs agence" },
    free: "Gratuit",
    taxes: "TTC",
    savings: (amount: string) => `\u2212${amount} vs agence`,
    savingsNote: `Économie indicative sur un bien à 350${N}000${N}€`,
    unavailable: "Les formules n'ont pas pu être chargées. Réessayez dans un instant.",
    items: {
      // No V1 note (« Sans engagement · sans CB · TTC »): the text of the
      // plan already starts with « Sans engagement. », the lead says « aucune
      // carte bancaire demandée ».
      autonomie: {
        text: "Pour piloter votre vente en toute autonomie.",
        badge: "Disponible gratuitement",
        action: "Commencer gratuitement",
      },
      accompagne: {
        text: "Un conseiller dédié à vos côtés, du prix à la signature.",
        note: "Forfait fixe TTC · payé à la souscription",
        action: "Choisir Accompagné",
      },
      serenite: {
        text: "Nous nous occupons de presque tout, vous gardez la décision.",
        note: "Forfait fixe TTC · payé à la souscription",
        action: "Choisir Sérénité",
      },
    },
  },
  // /faq (L1-42): the invented « 42 jours » left out (DECISIONS 2026-10-19).
  faqPage: {
    metaTitle: "Questions fréquentes · Leenkey",
    metaDescription:
      "Prix, accompagnement, sécurité des données, différence avec une agence : les réponses aux questions que se posent les vendeurs.",
    title: "Tout ce que vous vous demandez, sans détour.",
    items: [
      {
        question: "Combien ça coûte, vraiment ?",
        answer: [
          "Leenkey propose ",
          { strong: "trois formules transparentes" },
          " à forfait fixe\u00A0— jamais de commission au pourcentage. La formule ",
          { strong: "Autonomie est gratuite" },
          " pendant notre phase de lancement, et inclut l'analyse de votre bien, un call stratégique de 30 minutes et la mise en place du dossier de vente. Pour aller plus loin, la formule ",
          { strong: `Accompagné à 990${N}€ TTC` },
          " et la formule ",
          { strong: `Sérénité à 1${N}500${N}€ TTC` },
          " sont payées ",
          { strong: "à la souscription" },
          ", en une fois, sans engagement de durée.",
        ],
      },
      {
        question: "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
        answer: [
          "Accompagné. Selon votre forfait, un conseiller Leenkey reste joignable à chaque étape : pour valider votre prix, relire une offre, ou répondre à un doute avant la signature. Vous gardez la main, sans jamais rester seul.",
        ],
      },
      {
        question: "Mes données et mes documents sont-ils en sécurité ?",
        answer: [
          "Oui. Vos documents sont chiffrés et hébergés en France, conformément au RGPD. Vous seul décidez de ce qui est partagé, et avec qui. Aucune donnée n'est revendue.",
        ],
      },
      {
        question: "Combien de temps pour vendre ?",
        answer: [
          "Une annonce bien préparée et diffusée en exclusivité fait toute la différence. C'est exactement ce que nous outillons.",
        ],
      },
      {
        question: "Quelle est la différence avec une agence ?",
        answer: [
          "Une agence facture une commission au pourcentage et gère la vente à votre place. Leenkey vous donne les mêmes outils (valorisation, diffusion, suivi) pour un forfait fixe, avec un conseiller à la demande. Vous gardez le contrôle et l'économie.",
        ],
      },
      {
        question: "Et si je bloque en cours de route ?",
        answer: [
          "Vous n'avancez jamais à l'aveugle. À chaque étape, vous pouvez solliciter votre conseiller, qui vous rappelle généralement sous 24 h. Le jargon est expliqué, les démarches détaillées. C'est le principe même de Leenkey.",
        ],
      },
    ],
  },
  // /estimer (L1-43): the V1 wizard in the V2 header and footer.
  valuation: {
    metaTitle: "Valoriser mon bien · Leenkey",
  },
  // /investir (L1-43): the V1 page. Left out (DECISIONS 2026-10-19, Q53): the
  // market figures without a source, the forecasts and the targets, the
  // labels above the titles and « diffusion auto » (listings exclusive to
  // Leenkey); « 10 milliards d'euros » becomes « des milliards d'euros » and
  // the engine is no « modèle entraîné ».
  invest: {
    metaTitle: "Investir dans le projet · Leenkey",
    metaDescription:
      "Leenkey construit la première plateforme française qui permet à chaque propriétaire de vendre son bien sans agence. Nous cherchons des partenaires qui croient, comme nous, que ce marché mérite mieux.",
    hero: {
      title: "L'immobilier français se réinvente. Soyez-en.",
      accent: "Soyez-en.",
      lead: "Leenkey construit la première plateforme française qui permet à chaque propriétaire de vendre son bien sans agence : accompagné, guidé, à frais réduits. Nous cherchons des partenaires qui croient, comme nous, que ce marché mérite mieux.",
      action: "Rejoindre l'aventure",
    },
    hook: {
      title:
        "Chaque année en France, les propriétaires versent des milliards d'euros aux agences immobilières.",
      text: ["Pas parce qu'ils le veulent. ", { strong: "Parce qu'ils n'ont pas d'autre choix." }],
      last: "Jusqu'ici.",
    },
    market: {
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
      title: "Un modèle simple, rentable dès le premier client.",
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
      title: "Une construction méthodique, étape par étape.",
      items: [
        {
          when: "Maintenant",
          title: "Valider le modèle",
          list: [
            "Accompagner les 100 premiers vendeurs",
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
      title: "Pourquoi les bons rejoignent Leenkey maintenant.",
      items: [
        {
          title: "Un marché énorme, encore vierge",
          text: "Des milliards d'euros de commissions. Zéro acteur dominant côté vendeur. La place est à prendre\u00A0— et Leenkey est déjà en train de la prendre.",
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
  },
  // /contact (L1-45, DECISIONS 2026-10-20): the contact form of the home page
  // on a page of its own, where « Contact » of the menu leads.
  contactPage: {
    metaTitle: "Contact · Leenkey",
  },
  // /qui-sommes-nous (L1-43): the V1 page, its labels above the titles and
  // the arrows of its buttons left out (DECISIONS 2026-10-19).
  about: {
    metaTitle: "Qui sommes-nous · Leenkey",
    metaDescription:
      "Fondée par Cédric Da Cunha, Leenkey rend la vente immobilière enfin simple, humaine et transparente.",
    hero: {
      title: "Rendre la vente immobilière enfin simple, humaine et transparente.",
      accent: "enfin simple, humaine et transparente.",
      lead: "Fondée par Cédric Da Cunha, Leenkey est née d'un constat simple\u00A0: vendre son bien immobilier en France reste trop complexe, trop opaque et souvent trop coûteux. Nous construisons une nouvelle façon de vendre, où l'intelligence artificielle accompagne chaque propriétaire pour lui permettre de vendre en toute autonomie, sans jamais être seul.",
      action: "Découvrir notre vision",
    },
    founder: {
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
  },
  // Contact form of the site (V1 form, /api/contact unchanged).
  contact: {
    motif: "Motif de votre demande",
    motifPlaceholder: "Choisissez",
    // Values read by /api/contact (lib/legacy-api/contact.ts).
    motifs: [
      { value: "Vendeur", label: "Je veux vendre mon bien (question)" },
      { value: "Investisseur", label: "Je souhaite investir dans Leenkey" },
      { value: "Partenaire", label: "Je suis un partenaire (notaire, conseiller…)" },
      { value: "Presse", label: "Contact presse / médias" },
      { value: "Autre", label: "Autre demande" },
    ],
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    phone: "Téléphone",
    message: "Votre message",
    submit: "Envoyer ma demande",
    note: "Vos données restent confidentielles · Réponse sous 48 h, 7 j/7 par un conseiller",
    privacy: "Politique de confidentialité",
    sent: {
      title: "Votre demande de contact a bien été envoyée",
      text: "Merci ! Nous revenons vers vous sous 48 h, 7 j/7. Un email de confirmation vient d'être envoyé à l'adresse indiquée.",
    },
    failed: "Erreur d'envoi. Réessayez ou contactez-nous par email.",
    errors: {
      motif: "Choisissez le motif de votre demande.",
      required: "À renseigner pour envoyer votre demande.",
      email: "Cet email n'est pas valide.",
      tooLong: "Ce texte est trop long.",
    },
  },
} as const;
