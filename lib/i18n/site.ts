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
