// Texts of the public site in V2 (DECISIONS 2026-10-19, « V2 finale »): the
// pages of the V1 (public/pages/*.html) rebuilt with the Façade components.
// Cédric's texts are kept word for word; the only changes are listed in
// DECISIONS (invented figures, decorative numbering, arrows and emoji left
// out, contact answer « sous 48 h, 7 j/7 » as in CLAUDE.md section 16, no
// « portails » since the listings are exclusive to Leenkey). Part of fr.ts.

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";

export const site = {
  // Marketing pages, in the footer of the V2 pages and in the mobile menu.
  links: {
    label: "Découvrir Leenkey",
    concept: "Concept",
    pricing: "Tarifs",
    faq: "FAQ",
    invest: "Investir",
    about: "Qui sommes-nous",
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
      "La plateforme qui accompagne les propriétaires dans la vente de leur bien, sans agence : analyse de valeur, dossier, annonce, négociation, jusqu'à la signature. Forfait fixe et transparent.",
    hero: {
      title: "Leenkey vous donne les clés de votre vente.",
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
      title: "Où en êtes-vous dans votre vente ?",
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
          text: "Renseignez ses caractéristiques : vous verrez le montant, sa fourchette, et ce qui le fait monter ou baisser.",
          action: "Valoriser mon bien",
          href: "/estimer",
        },
        {
          key: "preparation",
          label: "Je prépare ma vente",
          title: "Préparez votre vente sans rien oublier.",
          text: "Diagnostics, documents, annonce : le parcours vous indique ce qui reste à faire avant de publier.",
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
      step: (index: number, total: number) => `Étape ${index} sur ${total}`,
      items: [
        {
          title: "Estimez",
          text: "Une analyse de valeur fondée sur les ventes réelles de votre secteur, en quelques minutes. Gratuite et sans engagement.",
          tag: "Gratuit · 2 minutes",
        },
        {
          title: "Préparez",
          text: "Diagnostics, documents, annonce et visites : un dossier complet, prêt pour le notaire, sans oubli.",
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
          text: "État, DPE, extérieurs, prestations, étage : chaque critère est chiffré séparément.",
        },
        {
          title: "Un rapport complet en PDF",
          text: "Quatre pages reçues par email : valorisation, marché local, stratégie de vente et plan d'action.",
        },
      ],
      action: "Valoriser mon bien gratuitement",
    },
    space: {
      title: "Vous savez toujours quoi faire ensuite.",
      lead: "Votre vente se pilote depuis un seul endroit : le dossier, l'annonce, les visites et les offres, avec la prochaine action toujours affichée.",
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
      lead: "Pourquoi se lancer seul, sans outils, et finir par se tourner vers une agence en payant des honoraires importants\u00A0— alors qu'une solution intermédiaire existe ?",
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
      items: [
        {
          question: "Est-ce vraiment gratuit pour commencer ?",
          answer: [
            "Oui. La formule ",
            { strong: "Autonomie est gratuite" },
            " pendant la phase pilote, sans engagement et sans carte bancaire. Elle inclut l'analyse de votre bien, un call stratégique de 30 minutes et la mise en place du dossier de vente.",
          ],
        },
        {
          question: "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
          answer: [
            "Accompagné. Selon votre forfait, un conseiller Leenkey reste joignable à chaque étape : pour valider votre prix, relire une offre, ou répondre à un doute avant la signature. Vous gardez la main, sans jamais rester seul.",
          ],
        },
        {
          question: "Quelle différence avec une agence ?",
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
      lead: "Propriétaire, investisseur, partenaire\u00A0— laissez-nous un message. Nous vous répondons personnellement sous 48 h, 7 j/7.",
    },
    final: {
      title: "Prêt à garder les clés de votre vente ?",
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
      "Combien vaut vraiment votre bien ? Leenkey commence par une valorisation honnête, avant tout engagement commercial.",
    hero: {
      title: "Combien vaut vraiment votre bien ?",
      lead: "C'est la première question que se pose tout propriétaire. Et c'est exactement là que Leenkey commence : par une valorisation honnête, avant tout engagement commercial.",
      action: "Valoriser mon bien",
    },
    options: {
      title: "Aujourd'hui, vendre laisse le choix entre deux mauvaises options.",
      lead: "Leenkey est né d'un constat simple. Pour vendre un bien en France, il faut choisir : payer cher, ou avancer seul, sans outil fiable.",
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
        "Avant de parler de vente, une seule question compte : ",
        { strong: "combien vaut votre bien ?" },
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
            "Les critères qui font vraiment varier le prix : DPE, étage, orientation, état, travaux, transports, commerces",
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
          text: "Pas un chiffre sorti du chapeau. Une fourchette réaliste avec une analyse détaillée : quels éléments tirent le prix vers le haut, lesquels le pénalisent, et où se situe votre bien face aux ventes récentes comparables.",
        },
        {
          label: "Pourquoi c'est différent",
          title: "Vous comprenez le prix",
          text: "Les outils en ligne donnent une moyenne. Leenkey donne une analyse. La différence : vous comprenez pourquoi votre bien vaut ce prix. Et ça change tout pour la suite de la vente.",
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
          text: "Un conseiller disponible aux moments qui comptent : la négociation, les questions juridiques, la coordination avec le notaire. Pas un chatbot, une personne.",
        },
        {
          title: "Gratuit pendant le lancement",
          // V1: « Leenkey est entièrement gratuit […] tous les outils »; the
          // V2 sells Accompagné and Sérénité.
          text: `Pendant notre phase pilote, la formule Autonomie est entièrement gratuite. Aucune commission, aucun engagement : vous profitez de ses outils, et vous gardez 100${N}% du fruit de votre vente.`,
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
      "Trois formules à forfait fixe, jamais de commission : Autonomie gratuite pendant la phase pilote, Accompagné et Sérénité payées à la souscription.",
    title: "Une formule pour chaque vendeur.",
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
      "Prix, accompagnement, sécurité des données, différence avec une agence : les réponses aux questions que se posent les vendeurs.",
    title: "Tout ce que vous vous demandez, sans détour.",
    items: [
      {
        question: "Combien ça coûte, vraiment ?",
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
        question: "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
        answer: [
          "Accompagné. Selon votre forfait, un conseiller Leenkey reste joignable à chaque étape : pour valider votre prix, relire une offre, ou répondre à un doute avant la signature. Vous gardez la main, sans jamais rester seul.",
        ],
      },
      {
        question: "Mes données et mes documents sont-ils en sécurité ?",
        answer: [
          "Oui. Vos documents sont chiffrés et hébergés en France, conformément au RGPD. Vous seul décidez de ce qui est partagé, et avec qui. Aucune donnée n'est revendue.",
        ],
      },
      {
        question: "Combien de temps pour vendre ?",
        answer: [
          "Une annonce bien préparée et diffusée en exclusivité fait toute la différence. C'est exactement ce que nous outillons.",
        ],
      },
      {
        question: "Quelle est la différence avec une agence ?",
        answer: [
          "Une agence facture une commission au pourcentage et gère la vente à votre place. Leenkey vous donne les mêmes outils (valorisation, diffusion, suivi) pour un forfait fixe, avec un conseiller à la demande. Vous gardez le contrôle et l'économie.",
        ],
      },
      {
        question: "Et si je bloque en cours de route ?",
        answer: [
          "Vous n'avancez jamais à l'aveugle. À chaque étape, vous pouvez solliciter votre conseiller, qui vous rappelle généralement sous 24 h. Le jargon est expliqué, les démarches détaillées. C'est le principe même de Leenkey.",
        ],
      },
    ],
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
      text: "Merci ! Nous revenons vers vous sous 48 h, 7 j/7. Un email de confirmation vient d'être envoyé à l'adresse indiquée.",
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
