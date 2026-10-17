// User-facing texts (CLAUDE.md section 9): no string literal in components.
export const fr = {
  env: {
    stagingBanner: "Environnement de test",
    stagingBannerDetail:
      "Les données de cette version peuvent être modifiées ou supprimées à tout moment.",
  },
  // lib/format.ts (docs/DESIGN.md section 3.3). \u00A0 keeps a number with its unit.
  format: {
    room: "pièce",
    rooms: "pièces",
    roomsShort: "p",
    at: "à",
    justNow: "à l'instant",
    minutesAgo: (minutes: number) => `il y a ${minutes}\u00A0min`,
    hoursAgo: (hours: number) => `il y a ${hours}\u00A0h`,
    yesterday: "hier",
    daysAgo: (days: number) => `il y a ${days}\u00A0j`,
  },
  field: {
    optional: "(facultatif)",
  },
  // L1-09: sign-up, login, password, terms (SPEC 8.2, DESIGN.md 12.1 and 13.1).
  auth: {
    brand: "Leenkey",
    back: "Retour",
    email: "Email",
    emailPlaceholder: "vous@exemple.fr",
    password: "Mot de passe",
    signup: {
      metaTitle: "Créer un compte · Leenkey",
      title: "Créez votre compte",
      lead: "Un seul compte pour vendre votre bien ou pour chercher le vôtre.",
      roleLegend: "Votre projet",
      roleSeller: "Je vends",
      roleSellerHint: "Un bien à publier",
      roleBuyer: "J'achète",
      roleBuyerHint: "Je cherche un bien",
      fullName: "Prénom et nom",
      fullNamePlaceholder: "Camille Martin",
      phone: "Téléphone",
      phonePlaceholder: "06 00 00 00 00",
      passwordPlaceholder: "8 caractères minimum",
      strength: {
        weak: "Robustesse : faible",
        fair: "Robustesse : correcte",
        strong: "Robustesse : bonne",
      },
      termsBefore: "J'accepte les ",
      termsCgu: "conditions d'utilisation",
      termsMiddle: " et la ",
      termsPrivacy: "politique de confidentialité",
      termsAfter: ".",
      submit: "Créer mon compte",
      hasAccount: "Déjà un compte ?",
      login: "Se connecter",
      privacyNote: "Vos données restent confidentielles. Aucune diffusion à des tiers.",
      sentTitle: "Vérifiez votre boîte mail",
      sentText: (email: string) =>
        `Nous avons envoyé un lien de confirmation à ${email}. Cliquez dessus pour activer votre compte.`,
      sentHint: "Rien reçu ? Regardez dans vos courriers indésirables, ou renvoyez l'email.",
      resend: "Renvoyer l'email",
      resent: "C'est renvoyé. Ouvrez le lien du dernier email reçu.",
    },
    login: {
      metaTitle: "Se connecter · Leenkey",
      title: "Connectez-vous",
      lead: "Retrouvez votre vente ou votre recherche.",
      forgot: "Mot de passe oublié ?",
      submit: "Se connecter",
      noAccount: "Pas encore de compte ?",
      signup: "Créer un compte",
      linkExpired: "Ce lien n'est plus valable. Connectez-vous, ou demandez un nouveau lien.",
    },
    forgot: {
      metaTitle: "Mot de passe oublié · Leenkey",
      title: "Mot de passe oublié",
      lead: "Indiquez votre email : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
      submit: "Envoyer le lien",
      sentTitle: "Vérifiez votre boîte mail",
      sentText:
        "Si un compte existe pour cette adresse, nous venons de vous envoyer un lien. Il est valable une heure.",
      backToLogin: "Retour à la connexion",
    },
    reset: {
      metaTitle: "Nouveau mot de passe · Leenkey",
      title: "Choisissez un nouveau mot de passe",
      password: "Nouveau mot de passe",
      confirm: "Confirmez le mot de passe",
      submit: "Enregistrer le mot de passe",
      expired: "Ce lien n'est plus valable. Demandez-en un nouveau.",
      requestNew: "Demander un nouveau lien",
    },
    confirm: {
      metaTitle: "Confirmation · Leenkey",
      emailTitle: "Confirmez votre adresse email",
      emailLead: "Un dernier clic pour activer votre compte.",
      emailSubmit: "Confirmer mon adresse",
      recoveryTitle: "Choisissez un nouveau mot de passe",
      recoveryLead: "Continuez pour définir votre nouveau mot de passe.",
      recoverySubmit: "Continuer",
    },
    terms: {
      metaTitle: "Conditions d'utilisation · Leenkey",
      titleFirst: "Acceptez nos conditions",
      titleUpdate: "Nos conditions ont évolué",
      lead: "Pour continuer, prenez connaissance de ces textes et acceptez-les.",
      submit: "Continuer",
    },
    errors: {
      roleRequired: "Choisissez « Je vends » ou « J'achète ».",
      nameRequired: "Indiquez votre prénom et votre nom.",
      nameTooLong: "Ce nom est trop long.",
      emailRequired: "Indiquez votre email.",
      emailInvalid: "Cet email n'est pas valide.",
      phoneInvalid: "Ce numéro n'est pas valide.",
      passwordRequired: "Indiquez votre mot de passe.",
      passwordTooShort: "8 caractères minimum.",
      passwordTooLong:
        "Ce mot de passe est trop long (72 caractères maximum, moins avec des accents).",
      passwordMismatch: "Les deux mots de passe sont différents.",
      passwordSame: "Choisissez un mot de passe différent de l'ancien.",
      passwordWeak:
        "Ce mot de passe est trop simple. Ajoutez des chiffres, des majuscules ou des symboles.",
      termsRequired:
        "Acceptez les conditions d'utilisation et la politique de confidentialité pour continuer.",
      invalidCredentials: "Email ou mot de passe incorrect.",
      emailNotConfirmed:
        "Votre email n'est pas encore confirmé. Cliquez sur le lien reçu, ou demandez-en un nouveau.",
      tooManyRequests: "Trop de tentatives. Réessayez dans quelques minutes.",
      alreadyRegistered: "Un compte existe déjà avec cet email. Connectez-vous.",
      generic: "Une erreur est survenue. Réessayez dans un instant.",
      summary: (count: number) =>
        count === 1 ? "Un champ est à corriger." : `${count} champs sont à corriger.`,
    },
  },
  // Signed-in areas until their screens exist (L1-10, L1-19, L1-24).
  spaces: {
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName}` : "Bonjour"),
    signOut: "Se déconnecter",
    home: "Accueil Leenkey",
    seller: {
      metaTitle: "Ma vente · Leenkey",
      title: "Votre espace vendeur arrive",
      text: "Nous préparons votre tableau de bord de vente. En attendant, faites l'analyse de valeur de votre bien.",
      action: "Faire l'analyse de valeur",
    },
    buyer: {
      metaTitle: "Mon espace · Leenkey",
      title: "Votre espace acquéreur arrive",
      text: "Bientôt ici : vos favoris, vos messages et votre projet. En attendant, parcourez les biens à vendre.",
      action: "Voir les biens",
    },
    admin: {
      metaTitle: "Back office · Leenkey",
      title: "Le back office arrive",
      text: "La validation des annonces arrive avec la prochaine étape.",
    },
  },
  // L1-10: navigation shells (docs/DESIGN.md 10.6 to 10.8).
  nav: {
    label: "Navigation principale",
    adminLabel: "Navigation du back office",
    brand: "Leenkey",
    backOffice: "Back office",
    links: {
      buy: "Acheter",
      sell: "Vendre",
      // Never « Estimer mon bien » (CLAUDE.md section 16, DESIGN.md 17).
      valuation: "Valoriser mon bien",
    },
    sellCta: "Vendre mon bien",
    signIn: "Mon compte",
    favourites: "Favoris",
    tabs: {
      sale: "Ma vente",
      file: "Dossier",
      messages: "Messages",
      account: "Compte",
      search: "Chercher",
      favourites: "Favoris",
      listings: "Annonces",
      cases: "Dossiers",
      users: "Utilisateurs",
      assistant: "Assistant",
    },
    admin: {
      dashboard: "Tableau de bord",
      listings: "Annonces",
      users: "Utilisateurs",
      cases: "Dossiers",
      offers: "Offres",
      reports: "Signalements",
      assistant: "Assistant",
      role: "Administrateur",
    },
    menu: {
      trigger: "Menu du compte",
      home: "Mon espace",
      account: "Mon compte",
      signOut: "Se déconnecter",
    },
    notifications: {
      bell: "Notifications",
      bellUnread: (count: number) =>
        count === 1 ? "Notifications, 1 nouvelle" : `Notifications, ${count} nouvelles`,
      title: "Notifications",
      close: "Fermer les notifications",
      settings: "Réglages des notifications",
      emptyTitle: "Aucune notification",
      emptySeller:
        "Nous vous prévenons ici des messages, des visites et des offres reçus pour votre bien.",
      emptyBuyer:
        "Nous vous prévenons ici des réponses des vendeurs et des nouveaux biens de vos recherches.",
    },
  },
  // L1-18: favourites.
  favorites: {
    add: "Ajouter aux favoris",
    addProperty: (property: string) => `Ajouter aux favoris : ${property}`,
    added: "Ajouté à vos favoris.",
    removed: "Retiré de vos favoris.",
    error: "Le changement n'a pas pu être enregistré. Réessayez.",
    signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
    page: {
      metaTitle: "Favoris · Leenkey",
      title: "Favoris",
      list: "Biens sauvegardés",
      count: (count: number) =>
        count === 1 ? "1\u00A0bien sauvegardé" : `${count}\u00A0biens sauvegardés`,
      offline: (count: number) =>
        count === 1
          ? "1\u00A0bien de vos favoris n'est plus en ligne : vendu, en pause ou retiré."
          : `${count}\u00A0biens de vos favoris ne sont plus en ligne : vendus, en pause ou retirés.`,
      clearOffline: "Les retirer de mes favoris",
      clearedOffline: "Les biens qui ne sont plus en ligne sont retirés de vos favoris.",
      clearError: "Ces favoris n'ont pas pu être retirés. Réessayez.",
      emptyTitle: "Aucun favori pour l'instant",
      emptyText: "Sauvegardez une annonce avec le cœur pour la retrouver ici.",
      offlineTitle: "Vos favoris ne sont plus en ligne",
      action: "Voir les biens",
      error: "Vos favoris n'ont pas pu être chargés.",
      retry: "Réessayer",
    },
  },
  // L1-10: pages whose screen comes with a later task (ComingSoon).
  placeholders: {
    messages: {
      metaTitle: "Messages · Leenkey",
      title: "Messages",
      comingTitle: "Votre messagerie arrive",
      comingText:
        "Nous préparons l'écran de vos conversations avec les acquéreurs et les vendeurs.",
    },
    account: {
      metaTitle: "Mon compte · Leenkey",
      title: "Mon compte",
      comingTitle: "Vos réglages arrivent",
      comingText:
        "Nous préparons l'écran de vos informations personnelles, de votre mot de passe et de vos notifications.",
    },
    sellerFile: {
      metaTitle: "Dossier de vente · Leenkey",
      title: "Dossier de vente",
      comingTitle: "Votre dossier de vente arrive",
      comingText: "Nous préparons l'écran qui réunira la fiche de votre bien et ses documents.",
    },
    admin: {
      listings: {
        metaTitle: "Annonces · Back office · Leenkey",
        title: "Annonces",
        comingTitle: "La validation des annonces arrive",
        comingText:
          "Nous préparons l'écran où vous validerez, refuserez ou suspendrez les annonces des vendeurs.",
      },
      users: {
        metaTitle: "Utilisateurs · Back office · Leenkey",
        title: "Utilisateurs",
        comingTitle: "La liste des comptes arrive",
        comingText:
          "Nous préparons l'écran des vendeurs et des acquéreurs, avec leurs biens et leur financement.",
      },
      cases: {
        metaTitle: "Dossiers · Back office · Leenkey",
        title: "Dossiers",
        comingTitle: "Le suivi des dossiers arrive",
        comingText:
          "Nous préparons l'écran des dossiers d'accompagnement : formules payantes et demandes de conseiller.",
      },
      offers: {
        metaTitle: "Offres · Back office · Leenkey",
        title: "Offres",
        comingTitle: "Le suivi des offres arrive",
        comingText: "Nous préparons l'écran qui réunira les offres d'achat et leur historique.",
      },
      reports: {
        metaTitle: "Signalements · Back office · Leenkey",
        title: "Signalements",
        comingTitle: "Le traitement des signalements arrive",
        comingText:
          "Nous préparons l'écran des signalements, avec leur motif et les suites données.",
      },
      assistant: {
        metaTitle: "Assistant · Back office · Leenkey",
        title: "Assistant",
        comingTitle: "Le suivi de l'assistant arrive",
        comingText:
          "Nous préparons l'écran de la base de connaissances et du journal des conversations de l'assistant.",
      },
    },
  },
  legal: {
    // Legal pages (L1-36, G10). Final texts from Cédric's lawyer (Q34);
    // identity and address from the V1 legal notice (Q10, Q35).
    draft: "Cette page est en cours de rédaction.",
    contactEmail: "contact.leenkey@gmail.com",
    company: "SAS LEENKEY, RCS Évry 107 616 211",
    address: "36 rue Pierre Brossolette, 91360 Épinay-sur-Orge",
    privacy: {
      metaTitle: "Politique de confidentialité · Leenkey",
      title: "Politique de confidentialité",
      contact: "Pour toute question sur vos données, écrivez-nous à",
    },
    salesTerms: {
      metaTitle: "Conditions générales de vente · Leenkey",
      title: "Conditions générales de vente",
      lead: "Elles s'appliquent aux formules Accompagné et Sérénité, payées à la souscription.",
      contact: "Pour toute question sur une commande, écrivez-nous à",
    },
    cookies: {
      metaTitle: "Politique cookies · Leenkey",
      title: "Politique cookies",
      lead: "Les cookies déposés par leenkey.fr, à quoi ils servent, et comment changer d'avis.",
      listTitle: "Liste provisoire des cookies et du stockage du site",
      labels: {
        provider: "Fournisseur",
        purpose: "À quoi il sert",
        kind: "Catégorie",
        duration: "Durée",
      },
      necessary: "Nécessaire",
      optional: "Avec votre accord",
      rows: [
        {
          name: "sb-…-auth-token",
          provider: "Leenkey (Supabase, notre fournisseur de base de données)",
          purpose: "Garder votre session ouverte quand vous êtes connecté",
          kind: "necessary",
          duration: "400 jours, effacé à la déconnexion",
        },
        {
          name: "sb-…-auth-token-code-verifier",
          provider: "Leenkey (Supabase, notre fournisseur de base de données)",
          purpose:
            "Sécuriser le lien envoyé par email à l'inscription ou pour un nouveau mot de passe",
          kind: "necessary",
          duration: "Jusqu'à l'utilisation du lien",
        },
        {
          name: "lk_lien",
          provider: "Leenkey",
          purpose: "Terminer la confirmation de votre email ou le choix d'un nouveau mot de passe",
          kind: "necessary",
          duration: "1 heure",
        },
        {
          name: "lk_consent",
          provider: "Leenkey",
          purpose: "Mémoriser vos choix sur les cookies",
          kind: "necessary",
          duration: "6 mois",
        },
        {
          name: "lk_vues",
          provider: "Leenkey",
          purpose: "Compter une seule visite par jour et par annonce, sans donnée personnelle",
          kind: "necessary",
          duration: "24 heures",
        },
        {
          name: "leenkey_form_v1, leenkey_dashboard_v1",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose: "Reprendre votre analyse de valeur là où vous l'avez laissée",
          kind: "necessary",
          duration: "Jusqu'à une nouvelle analyse",
        },
        {
          name: "lk_rappel_…",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose: "Ne pas envoyer deux fois votre demande de rappel",
          kind: "necessary",
          duration: "Jusqu'à son effacement dans votre navigateur",
        },
        {
          name: "_ga, _ga_…",
          provider: "Google",
          purpose: "Mesure d'audience avec Google Analytics, par Google Tag Manager",
          kind: "optional",
          duration: "13 mois au plus",
        },
      ],
      noCookie:
        "Vercel Web Analytics, la mesure d'audience de notre hébergeur, ne dépose ni cookie ni stockage dans votre navigateur.",
      manageText: "Vous pouvez changer d'avis à tout moment :",
      contact: "Pour toute question sur les cookies, écrivez-nous à",
    },
    ai: {
      metaTitle: "Intelligence artificielle · Leenkey",
      title: "Intelligence artificielle",
      lead: "Comment l'assistant Leenkey utilise l'intelligence artificielle, et ce qu'il ne fait jamais seul.",
      contact: "Pour toute question sur l'assistant, écrivez-nous à",
    },
    reporting: {
      metaTitle: "Signalement et modération · Leenkey",
      title: "Signalement et modération",
      lead: "Comment signaler une annonce ou un message, et comment nous traitons les signalements.",
      contact: "Pour signaler un contenu dès maintenant, écrivez-nous à",
    },
  },
  // Footer of the V2 pages and of the V1 marketing pages (L1-36).
  footer: {
    label: "Informations légales",
    links: {
      notice: "Mentions légales",
      terms: "Conditions d'utilisation",
      salesTerms: "Conditions générales de vente",
      privacy: "Confidentialité",
      cookies: "Cookies",
      reporting: "Signalement et modération",
      ai: "Intelligence artificielle",
      contact: "Contact",
    },
    manageCookies: "Gérer mes cookies",
    rights: "© 2026 Leenkey",
  },
  // Cookie consent banner (L1-37, Q23).
  consent: {
    title: "Cookies",
    text: "Nous utilisons des cookies de mesure d'audience (Google Analytics) pour comprendre comment le site est utilisé et l'améliorer, uniquement si vous l'acceptez. Les cookies nécessaires au fonctionnement du site restent actifs. Vous pouvez changer d'avis à tout moment avec « Gérer mes cookies », en bas de page.",
    policy: "Politique cookies",
    accept: "Accepter",
    refuse: "Refuser",
    customize: "Personnaliser",
    panelTitle: "Vos préférences",
    necessaryTitle: "Nécessaires",
    necessaryText:
      "Connexion à votre compte, sécurité, mémorisation de vos choix, reprise de votre analyse de valeur, comptage des visites des annonces. Toujours actifs.",
    analyticsLabel: "Mesure d'audience",
    analyticsText: "Statistiques de visite avec Google Analytics, par Google Tag Manager.",
    save: "Enregistrer mes choix",
  },
  // Labels of SPEC-V2 section 7 (StatusBadge mapping), colours in DESIGN.md 10.2.
  listingStatus: {
    draft: "Brouillon",
    pending: "En attente de validation",
    published: "En ligne",
    paused: "En pause",
    suspended: "Suspendue par Leenkey",
    sold: "Vendu",
    rejected: "À corriger",
  },
  plan: {
    autonomie: "Autonomie",
    accompagne: "Accompagné",
    serenite: "Sérénité",
  },
  propertyType: {
    appartement: "Appartement",
    maison: "Maison",
    terrain: "Terrain",
    autre: "Bien",
  },
  dpe: {
    label: "DPE",
  },
  propertyCard: {
    badgeNew: "Nouveau",
    badgePriceDrop: "Prix en baisse",
    photoCount: (total: number) => `1 / ${total}`,
  },
  // L1-15: search /acheter (SPEC-V2 8.4, docs/DESIGN.md 10.3, 12.5, 12.6).
  search: {
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
    quickFilters: "Filtres rapides",
    chips: {
      budget: "Budget",
      rooms: "Pièces",
      outdoor: "Extérieur",
      dpe: "DPE",
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
      budget: "Budget",
      budgetLabel: "Budget maximum",
      rooms: "Pièces",
      roomsLabel: "Nombre de pièces minimum",
      surface: "Surface",
      surfaceLabel: "Surface minimum",
      dpe: "DPE",
      dpeLabel: "Classe énergie maximale",
      priceUpTo: (price: string) => `Jusqu'à ${price}`,
      roomsAtLeast: (rooms: number) => (rooms === 1 ? "1 pièce et +" : `${rooms} pièces et +`),
      surfaceAtLeast: (surface: string) => `${surface} et +`,
      dpeUpTo: (letter: string) => (letter === "A" ? "DPE A" : `DPE A à ${letter}`),
      more: "Plus de filtres",
    },
    dialog: {
      title: "Filtres",
      close: "Fermer les filtres",
      radius: (place: string) => `Rayon autour de ${place}`,
      radiusTown: "Ville seule",
      type: "Type de bien",
      typeAll: "Tous les types",
      budget: "Budget",
      budgetMin: "Budget minimum",
      budgetMax: "Budget maximum",
      surface: "Surface",
      surfaceMin: "Surface minimum",
      surfaceMax: "Surface maximum",
      rooms: "Pièces",
      roomsAtLeast: (rooms: number) => (rooms === 1 ? "1 pièce et +" : `${rooms} pièces et +`),
      bedrooms: "Chambres",
      bedroomsAtLeast: (bedrooms: number) =>
        bedrooms === 1 ? "1 chambre et +" : `${bedrooms} chambres et +`,
      any: "Indifférent",
      outdoor: "Extérieur",
      outdoorHelp: "Les biens qui ont au moins l'un des extérieurs choisis.",
      equipment: "Équipements",
      parking: "Stationnement",
      elevator: "Ascenseur",
      dpe: "Classe énergie (DPE)",
      dpeAll: "Toutes les classes",
      dpeUpTo: (letter: string) => (letter === "A" ? "A" : `A à ${letter}`),
      minAboveMax: "Le maximum doit être supérieur ou égal au minimum.",
      clear: "Effacer",
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
  },
  // L1-17: listing page /annonce/[slug] (SPEC-V2 8.5, docs/DESIGN.md 10.2, 10.3, 12.7, 12.8).
  listing: {
    metaTitle: (summary: string, place: string, price: string) =>
      `${summary} ${place} · ${price} · Leenkey`,
    breadcrumb: "Fil d'Ariane",
    breadcrumbRoot: "Acheter",
    back: "Retour",
    summary: {
      rooms: (rooms: number) => (rooms === 1 ? "1 pièce" : `${rooms} pièces`),
    },
    gallery: {
      none: "Pas encore de photo pour ce bien.",
      counter: (index: number, total: number) => `${index} / ${total}`,
      open: (index: number, total: number) => `Agrandir la photo ${index} sur ${total}`,
      more: (count: number) => `+ ${count}\u00A0photos`,
      viewer: "Photos du bien",
      close: "Fermer",
      previous: "Photo précédente",
      next: "Photo suivante",
    },
    priceBlock: {
      perSquareMetre: (value: string) => `${value}, sans commission`,
    },
    keyFigures: {
      surface: "surface",
      land: "terrain",
      rooms: (rooms: number) => (rooms === 1 ? "pièce" : "pièces"),
      bedrooms: (bedrooms: number) => (bedrooms === 1 ? "chambre" : "chambres"),
      floor: "étage",
      levels: (levels: number) => (levels === 1 ? "niveau" : "niveaux"),
      orientation: "exposition",
      buildYear: "construction",
      groundFloor: "RDC",
      basement: "sous-sol",
    },
    ordinal: (value: number) => (value === 1 ? "1er" : `${value}e`),
    contact: {
      owner: (firstName: string) => `${firstName}, propriétaire`,
      ownerUnknown: "Le propriétaire",
      accompanied: "Vente accompagnée par Leenkey",
    },
    description: {
      title: "Le bien",
      more: "Lire la suite",
      less: "Réduire",
    },
    facts: {
      title: "Ce que vous savez avant de visiter",
      notProvided: "Non renseigné",
      yes: "Oui",
      no: "Non",
      none: "Aucun",
      charges: "Charges de copropriété",
      chargesValue: (amount: string) => `${amount} / mois`,
      propertyTax: "Taxe foncière",
      propertyTaxValue: (amount: string) => `${amount} / an`,
      dpe: "Classe énergie (DPE)",
      ges: "Émissions (GES)",
      heating: "Chauffage",
      type: "Type de bien",
      surface: "Surface habitable",
      landSurface: "Surface du terrain",
      carrez: "Surface Carrez",
      rooms: "Pièces",
      bedrooms: "Chambres",
      floor: "Étage",
      floorOf: (floor: string, total: number) => `${floor} sur ${total}`,
      groundFloor: "Rez-de-chaussée",
      basement: "Sous-sol",
      levels: "Niveaux",
      elevator: "Ascenseur",
      orientation: "Exposition",
      construction: "Construction",
      newBuild: "Neuf",
      buildYearNew: (year: number) => `${year}, neuf`,
      outdoor: "Extérieur",
      parking: "Stationnement",
      cellar: "Cave",
      coproLots: "Lots de copropriété",
      votedWorks: "Travaux votés",
      procedures: "Procédures en cours",
    },
    actions: {
      contact: "Contacter le vendeur",
      visit: "Demander une visite",
      accountRequired:
        "Un compte acquéreur est nécessaire pour contacter le vendeur ou demander une visite.",
    },
    notFound: {
      metaTitle: "Annonce introuvable · Leenkey",
      title: "Cette page n'existe pas.",
      text: "L'annonce a peut-être été vendue ou retirée par son propriétaire.",
      action: "Retour à l'accueil",
    },
    error: {
      title: "Ça n'a pas fonctionné.",
      text: "Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      retry: "Réessayer",
    },
  },
} as const;
