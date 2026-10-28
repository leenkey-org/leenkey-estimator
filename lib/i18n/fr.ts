// User-facing texts (CLAUDE.md section 9): no string literal in components.
import { legalNotice, terms } from "./legal-texts";
import { site } from "./site";

/** « de David », « d'Alice », « d'Hélène »: the elision before a vowel or an h (« de Yann »). */
function of(name: string): string {
  return /^[aeiouhàâäéèêëîïôöùûüæœ]/i.test(name) ? `d'${name}` : `de ${name}`;
}

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
      title: "Mettez votre bien en vente",
      // The two ways to start (DECISIONS 2026-10-26).
      text: "Créez votre annonce, ou commencez par une analyse de valeur gratuite : tout est enregistré au fur et à mesure, vous reprenez quand vous voulez.",
    },
    buyer: {
      metaTitle: "Cockpit · Leenkey",
      title: "Votre espace acquéreur arrive",
      text: "Bientôt ici : vos favoris, vos messages et votre projet. En attendant, parcourez les biens à vendre.",
      action: "Voir les biens",
    },
    admin: {
      metaTitle: "Back office · Leenkey",
      // The dashboard of the back office comes with L1-30; the listings are already there (L1-19).
      title: "Le tableau de bord arrive",
      text: "Nous préparons le tableau de bord du back office. Les annonces à valider sont déjà dans « Annonces ».",
      action: "Voir les annonces à valider",
    },
  },
  // « Vendre » (Younes, DECISIONS 2026-10-26): the two ways to start a sale,
  // the analysis of value first or the listing straight away.
  sellStart: {
    metaTitle: "Vendre votre bien · Leenkey",
    description:
      "Commencez par une analyse de valeur gratuite, ou publiez directement votre annonce sur Leenkey.",
    title: "Comment voulez-vous commencer ?",
    lead: "Les deux chemins mènent à votre annonce sur Leenkey.",
    valuation: {
      title: "Connaître la valeur de mon bien",
      text: "Une analyse de valeur gratuite en quelques minutes. Votre annonce reprend ensuite vos réponses.",
      action: "Valoriser mon bien gratuitement",
    },
    // A seller who has a property already: the way back to their sale.
    resume: {
      text: "Vous avez déjà un bien en vente sur Leenkey.",
      action: "Reprendre ma vente",
    },
    direct: {
      title: "Publier directement mon annonce",
      text: "Vous connaissez votre prix : créez votre annonce, nous la relisons sous 24\u00A0h avant sa mise en ligne.",
      action: "Publier mon annonce",
    },
  },
  // A page that does not exist, or that could not be shown (app/not-found.tsx,
  // app/error.tsx, app/global-error.tsx; docs/DESIGN.md 13.1).
  errors: {
    notFound: {
      metaTitle: "Page introuvable · Leenkey",
      title: "Cette page n'existe pas.",
      text: "Elle a peut-être été déplacée, ou son adresse contient une erreur.",
      action: "Retour à l'accueil",
    },
    failed: {
      title: "Ça n'a pas fonctionné.",
      text: "Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      retry: "Réessayer",
      home: "Retour à l'accueil",
      contact: "Nous écrire",
    },
  },
  // L1-10: navigation shells (docs/DESIGN.md 10.6 to 10.8).
  nav: {
    label: "Navigation principale",
    adminLabel: "Navigation du back office",
    brand: "Leenkey",
    // The space of the admins (Younes, 2026-10-28: « Back office » for the
    // admins, « Cockpit » for the clients).
    backOffice: "Back office",
    // From the back office, back to the site (DECISIONS 2026-10-26).
    site: "Voir le site",
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
      // The way to the other side, for every account (DECISIONS 2026-10-19).
      buy: "Acheter",
      sell: "Vendre",
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
      // The space of a client, seller or buyer (Younes, 2026-10-28).
      home: "Cockpit",
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
      completeListing: "Compléter mon annonce",
      emptyBuyer:
        "Nous vous prévenons ici des réponses des vendeurs et des nouveaux biens de vos recherches.",
      emptyAdmin: "Nous vous prévenons ici des annonces envoyées en relecture.",
      reviewListings: "Voir les annonces à valider",
    },
  },
  // L1-22 (SPEC-V2 section 10, docs/DESIGN.md 10.7): the list of the panel,
  // the wording of each type of notification and the email preferences.
  notifications: {
    filtersLabel: "Filtrer les notifications",
    filters: {
      all: "Toutes",
      searches: "Mes recherches",
      visitsOffers: "Visites et offres",
      messages: "Messages",
      offersVisits: "Offres et visites",
    },
    groups: { today: "Aujourd'hui", week: "Cette semaine", older: "Plus ancien" },
    unread: "non lue",
    markAllRead: "Tout marquer comme lu",
    filterEmpty: "Aucune notification de ce type pour l'instant.",
    loadError: "Les notifications n'ont pas pu être chargées.",
    retry: "Réessayer",
    types: {
      messageNew: {
        title: (name: string | null) => (name ? `Nouveau message ${of(name)}` : "Nouveau message"),
        detail: (excerpt: string, truncated: boolean) =>
          `«\u00A0${excerpt}${truncated ? "…" : ""}\u00A0»`,
      },
      listingPending: {
        title: "Une annonce attend votre relecture",
        detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · "),
      },
      listingPublished: {
        title: "Votre annonce est en ligne",
        detail: (title: string) => `«\u00A0${title}\u00A0» est visible des acquéreurs.`,
      },
      listingRejected: {
        title: "Votre annonce est à corriger",
        detail: (title: string) =>
          `Nous avons relu «\u00A0${title}\u00A0» : voyez ce qu'il faut corriger.`,
      },
      // L1-23: the sale reaches a step (SPEC-V2 section 9).
      stepAdvanced: {
        title: (step: string | null) =>
          step ? `Nouvelle étape : ${step}` : "Votre vente passe à l'étape suivante",
        position: (position: number, total: number) => `Étape ${position} sur ${total}`,
        detail: (parts: readonly (string | null)[]) => parts.filter(Boolean).join(" · "),
      },
      fallback: "Nouvelle notification",
    },
    preferences: {
      metaTitle: "Notifications · Mon compte",
      title: "Notifications",
      lead: "Choisissez les emails que vous recevez. Dans l'application, la cloche vous prévient de tout.",
      legend: "Emails",
      // The offers (L2) and the alerts (L3) add theirs with their emails.
      messages: {
        label: "Nouveaux messages",
        hint: "Quand un acquéreur ou un vendeur vous écrit : au plus un email toutes les 15\u00A0minutes par conversation, aucun si vous l'avez déjà lue.",
      },
      always:
        "Les emails sur votre annonce (relecture, mise en ligne, corrections) partent toujours.",
      save: "Enregistrer",
      saved: "Vos préférences sont enregistrées.",
      error: "Vos préférences n'ont pas pu être enregistrées. Réessayez.",
      loadError: "Vos préférences n'ont pas pu être chargées. Rechargez la page.",
      back: "Mon compte",
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
  // L1-11: creation of a property in steps (SPEC-V2 section 8.3, DESIGN.md 12.2).
  properties: {
    creation: {
      metaTitle: (step: string) => `${step} · Mon bien · Leenkey`,
      title: "Mon bien",
      leave: "Retour à Ma vente",
      previousStep: "Étape précédente",
      save: "Enregistrer",
      previous: "Précédent",
      next: "Continuer",
      step: (step: number, label: string) => `Étape ${step} sur 4 · ${label}`,
      steps: {
        address: "Adresse",
        characteristics: "Caractéristiques",
        price: "Prix et description",
        preview: "Aperçu",
      },
      error: "L'enregistrement n'a pas pu se faire. Réessayez.",
      signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
      notFound: "Ce bien n'existe plus ou ne peut plus être modifié.",
      loadError: "Votre bien n'a pas pu être chargé.",
      retry: "Réessayer",
    },
    address: {
      title: "Où se trouve votre bien ?",
      lead: "Son adresse exacte n'est jamais publiée : l'annonce montre la commune et une zone approximative.",
      label: "Adresse du bien",
      placeholder: "12 rue de la Gare, Épinay-sur-Orge",
      help: "Tapez le numéro et la rue, puis choisissez l'adresse dans la liste.",
      suggestions: "Adresses proposées",
      searching: "Recherche des adresses…",
      count: (count: number) =>
        count === 1 ? "1\u00A0adresse proposée." : `${count}\u00A0adresses proposées.`,
      noResult: "Aucune adresse trouvée. Vérifiez le numéro et la rue.",
      unavailable: "La recherche d'adresse ne répond pas. Réessayez dans un instant.",
      required: "Choisissez l'adresse dans la liste.",
      chosen: "Adresse choisie",
      chosenStatus: (label: string) => `Adresse choisie : ${label}.`,
      change: "Changer d'adresse",
      notFound: "Cette adresse n'a pas été retrouvée. Choisissez-la de nouveau dans la liste.",
    },
    characteristics: {
      title: "Décrivez votre bien",
      required: "Le type, la surface et le nombre de pièces sont nécessaires pour continuer.",
      requiredLand: "Le type et la surface sont nécessaires pour continuer.",
      photosBusy: "Vos photos sont en cours d'envoi : patientez un instant, puis réessayez.",
      type: "Type de bien",
      typePlaceholder: "Choisir le type",
      surface: "Surface habitable",
      landSurface: "Surface du terrain",
      carrez: "Surface Carrez",
      rooms: "Pièces",
      bedrooms: "Chambres",
      floor: "Étage",
      floorHelp: "0 pour un rez-de-chaussée.",
      floorsTotal: "Étages de l'immeuble",
      levels: "Niveaux",
      buildYear: "Année de construction",
      dpe: "DPE",
      ges: "GES",
      energyClass: (label: string, letter: string) => `${label} classe ${letter}`,
      heating: "Chauffage",
      heatingPlaceholder: "Choisir",
      features: "Atouts",
      featureLabels: {
        balcony: "Balcon",
        terrace: "Terrasse",
        garden: "Jardin",
        parking: "Parking",
        cellar: "Cave",
        elevator: "Ascenseur",
      },
      details: "Charges et copropriété",
      charges: "Charges",
      perMonth: "€ / mois",
      tax: "Taxe foncière",
      perYear: "€ / an",
      lots: "Lots de copropriété",
    },
    errors: {
      required: "À renseigner pour continuer.",
      number: "Saisissez un nombre.",
      outOfRange: "Cette valeur n'est pas possible.",
      carrezAboveSurface: "La surface Carrez ne peut pas dépasser la surface habitable.",
      bedroomsAboveRooms: "Il ne peut pas y avoir plus de chambres que de pièces.",
      floorAboveTotal: "L'étage ne peut pas dépasser le nombre d'étages.",
      roomsAtLeastOne: "Un logement compte au moins une pièce.",
      cents: "Deux chiffres après la virgule au plus.",
    } as Record<string, string>,
    photos: {
      title: "Photos",
      count: (count: number, max: number) => `${count} / ${max}`,
      countLabel: (count: number, max: number) =>
        `${count} ${count > 1 ? "photos" : "photo"} sur ${max}`,
      add: "Ajouter des photos",
      full: (max: number) => `${max} photos au maximum`,
      help: "JPEG, PNG ou WebP, 10 Mo au plus. La première photo est la photo principale de l'annonce.",
      hint: "Entrée pour les options de la photo, flèches gauche et droite pour la déplacer.",
      main: "Principale",
      sending: "Envoi…",
      tile: (index: number, total: number, caption: string | null, main: boolean) =>
        [`Photo ${index} sur ${total}`, caption, main ? "photo principale" : null]
          .filter(Boolean)
          .join(", "),
      added: (count: number, max: number) => `Photo ajoutée : ${count} sur ${max}.`,
      moved: (index: number, total: number) =>
        index === 1
          ? `Photo déplacée en position 1 sur ${total} : c'est la photo principale.`
          : `Photo déplacée en position ${index} sur ${total}.`,
      deleted: "Photo supprimée.",
      captionSaved: "Légende enregistrée.",
      errors: {
        format: (name: string) =>
          `« ${name} » : ce format n'est pas accepté. Choisissez une photo JPEG, PNG ou WebP.`,
        tooLarge: (name: string) => `« ${name} » dépasse 10 Mo.`,
        tooSmall: (name: string, long: number, short: number) =>
          `« ${name} » est trop petite : ${long} × ${short} pixels au minimum.`,
        tooHeavy: (name: string) =>
          `« ${name} » est trop lourde, même réduite. Essayez une autre photo.`,
        unreadable: (name: string) => `« ${name} » n'a pas pu être lue. Essayez une autre photo.`,
        full: (name: string, max: number) =>
          `${max} photos au maximum : « ${name} » n'a pas été ajoutée.`,
        unavailable: (name: string) => `« ${name} » n'a pas pu être envoyée. Réessayez.`,
        order: "L'ordre des photos n'a pas pu être enregistré. Réessayez.",
        change: "La photo n'a pas pu être modifiée. Réessayez.",
      },
      sheet: {
        title: (index: number, total: number) => `Photo ${index} sur ${total}`,
        back: "Retour aux caractéristiques",
        close: "Fermer",
        caption: "Légende",
        captionPlaceholder: "Séjour, cuisine, jardin…",
        captionHelp: "Elle décrit la photo pour les personnes qui ne la voient pas.",
        saveCaption: "Enregistrer la légende",
        makeMain: "En faire la photo principale",
        isMain: "C'est la photo principale",
        before: "Déplacer avant",
        after: "Déplacer après",
        delete: "Supprimer la photo",
        confirmDelete: "Supprimer définitivement",
        deleteWarning: "La photo sera supprimée de votre annonce.",
        cancel: "Annuler",
      },
    },
    // L1-13b: a property created from an analysis of value (SPEC-V2 8.3).
    fromEstimation: (date: string) =>
      `Repris de votre analyse de valeur du ${date}. Vérifiez et complétez.`,
    claimingEstimation: "Nous reprenons votre analyse de valeur…",
    // L1-13: step 3 (SPEC-V2 8.3). « Rédiger avec l'assistant » comes with L1-29.
    price: {
      title: "Votre prix et votre annonce",
      price: "Prix de vente",
      priceHelp: "Le prix affiché sur votre annonce.",
      valuation: (date: string | null) =>
        date ? `Votre analyse de valeur du ${date}` : "Votre analyse de valeur",
      valuationValue: (value: string, low: string | null, high: string | null) =>
        low && high ? `${value}, dans une fourchette de ${low} à ${high}.` : `${value}.`,
      gap: (percent: number) =>
        percent === 0
          ? "Votre prix correspond à cette valeur."
          : `Votre prix est ${Math.abs(percent)}\u00A0% ${percent > 0 ? "au-dessus" : "en dessous"} de cette valeur.`,
      listingTitle: "Titre de l'annonce",
      titleHelp: "Proposé d'après votre bien : modifiez-le si vous le souhaitez.",
      description: "Description",
      descriptionPlaceholder:
        "La lumière, l'agencement, les travaux récents, le quartier, les écoles, les transports…",
      count: (count: string, max: string) => `${count} / ${max} caractères`,
      required: "Le prix et la description sont nécessaires pour continuer.",
      priceToSave: "Indiquez le prix pour enregistrer votre annonce.",
      errors: {
        required: "À renseigner pour continuer.",
        price: "Saisissez un prix en euros, sans centimes.",
        priceTooHigh: "Ce prix semble trop élevé : vérifiez le nombre de zéros.",
        titleLength: "Le titre compte de 3 à 120 caractères.",
        descriptionLength: "La description compte 1\u00A0200 caractères au plus.",
      } as Record<string, string>,
    },
    // Step 4: the listing as buyers will see it, then « Envoyer en validation ».
    preview: {
      title: "Aperçu de votre annonce",
      lead: "Voici votre annonce telle que les acquéreurs la verront. Vérifiez-la, puis envoyez-la : nous la relisons sous 24\u00A0h.",
      submit: "Envoyer en validation",
      errors: {
        characteristics:
          "Il manque le type, la surface ou les pièces de votre bien : complétez l'étape 2.",
        listing: "Il manque le prix ou la description : complétez l'étape 3.",
        notFound: "Cette annonce a déjà été envoyée, ou ne peut plus être modifiée.",
        unavailable: "L'envoi n'a pas pu se faire. Réessayez.",
      },
      fix: "Compléter",
      // A listing refused by Leenkey, corrected through the steps (L1-19).
      rejected: "Votre annonce est à corriger",
      rejectedNext: "Corrigez-la à l'étape qui convient, puis envoyez-la de nouveau.",
    },
    // End of the flow (SPEC-V2 8.3, docs/DESIGN.md 10.8, G8).
    sent: {
      metaTitle: "Annonce envoyée · Leenkey",
      title: "C'est envoyé.",
      text: "Nous relisons votre annonce sous 24\u00A0h et vous prévenons par email.",
      action: "Retour à Ma vente",
      recap: "Votre annonce",
    },
    list: {
      title: "Vos biens",
      create: "Créer mon annonce",
      untitled: "Bien à compléter",
      error: "Vos biens n'ont pas pu être chargés.",
    },
    // L1-14: the page of a property (SPEC-V2 8.3), its tabs and the actions
    // of its status.
    sheet: {
      metaTitle: (name: string) => `${name} · Ma vente · Leenkey`,
      back: "Ma vente",
      reference: (reference: string) => `Réf.\u00A0${reference}`,
      tabs: {
        label: "Rubriques de votre bien",
        infos: "Infos",
        photos: "Photos",
        listing: "Annonce",
      },
      pricePerM2: "prix au m²",
      status: {
        draft: {
          title: "Votre annonce n'est pas encore envoyée",
          text: "Reprenez-la là où vous l'avez laissée, puis envoyez-la en validation.",
        },
        pending: {
          title: "Nous relisons votre annonce",
          text: "Nous la relisons sous 24\u00A0h et vous prévenons par email.",
        },
        rejected: {
          title: "Votre annonce est à corriger",
          text: (reason: string) => `Notre remarque : ${reason}`,
        },
        published: {
          title: "Votre annonce est en ligne",
          text: (date: string | null) =>
            date
              ? `Elle est visible de tous les acquéreurs depuis le ${date}.`
              : "Elle est visible de tous les acquéreurs.",
        },
        paused: {
          title: "Votre annonce est en pause",
          text: "Elle n'apparaît plus dans les recherches et sa page n'est plus visible. Remettez-la en ligne quand vous le souhaitez.",
        },
        suspended: {
          title: "Leenkey a suspendu votre annonce",
          text: (reason: string) => `Motif : ${reason}`,
          readOnly:
            "Elle n'est plus visible et reste en lecture seule : vous ne pouvez ni la modifier ni la remettre en ligne vous-même. Pour en parler, écrivez-nous à",
        },
        sold: {
          title: "Votre bien est vendu",
          text: (date: string | null, price: string | null) =>
            `${date ? `Vendu le ${date}` : "Vendu"}${price ? `, au prix de ${price}` : ""}.`,
        },
      },
      actions: {
        label: "Actions sur votre annonce",
        resume: "Reprendre la création",
        fix: "Corriger mon annonce",
        view: "Voir l'annonce en ligne",
        pause: "Mettre en pause",
        publish: "Remettre en ligne",
        sold: "Marquer comme vendu",
        delete: "Supprimer le brouillon",
      },
      soldDialog: {
        title: "Marquer votre bien comme vendu ?",
        text: "L'annonce quitte les recherches et n'est plus visible. Vous ne pourrez pas la remettre en ligne.",
        price: "Prix de vente final",
        priceHelp: "Facultatif. Il reste privé : il n'apparaît sur aucune annonce.",
        confirm: "Marquer comme vendu",
      },
      deleteDialog: {
        title: "Supprimer ce brouillon ?",
        text: "Le bien, ses photos et son annonce en préparation disparaîtront de votre espace. Vous ne pourrez pas les récupérer.",
        confirm: "Supprimer le brouillon",
      },
      dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
      done: {
        paused: "Votre annonce est en pause.",
        published: "Votre annonce est de nouveau en ligne.",
        sold: "Votre bien est marqué comme vendu.",
      },
      errors: {
        conflict:
          "Votre annonce a changé entre-temps. La page est à jour : vérifiez-la avant de recommencer.",
        suspended: "Leenkey a suspendu cette annonce : elle est en lecture seule.",
        notFound: "Ce bien n'existe plus.",
        unavailable: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.",
        signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
        price: "Indiquez un prix en euros, sans centimes, ou laissez le champ vide.",
      },
      infos: {
        address: "Adresse",
        addressNote:
          "Votre adresse exacte n'est jamais publiée : l'annonce montre la commune et une zone approximative.",
        characteristics: "Caractéristiques",
        edit: "Modifier",
        editAddress: "Modifier l'adresse",
        editCharacteristics: "Modifier les caractéristiques",
      },
      photos: {
        title: "Photos",
        count: (count: number) =>
          count === 0 ? "Aucune photo" : count === 1 ? "1 photo" : `${count} photos`,
        cover: "Photo principale",
        empty: "Votre bien n'a pas encore de photo.",
      },
      listing: {
        title: "Titre",
        price: "Prix",
        pricePerM2: (amount: string) => `soit ${amount} le m²`,
        description: "Description",
        reference: "Référence",
        empty: "Votre annonce n'est pas encore rédigée.",
        write: "Rédiger mon annonce",
        edit: "Modifier l'annonce",
      },
      loadError: "Votre bien n'a pas pu être chargé.",
      retry: "Réessayer",
    },
    // L1-14b: a listing sent for review, online or paused, changed from the
    // page of its property; it stays as it is.
    edit: {
      metaTitle: (part: string) => `${part} · Modifier votre bien · Leenkey`,
      title: "Modifier votre bien",
      back: "Retour à votre bien",
      cancel: "Annuler",
      save: "Enregistrer",
      parts: { characteristics: "Caractéristiques", listing: "Prix et description" },
      note: {
        pending: "Nous relisons votre annonce : nous tiendrons compte de vos modifications.",
        published:
          "Votre annonce reste en ligne : vos modifications sont visibles dès leur enregistrement.",
        paused:
          "Votre annonce est en pause : vos modifications seront visibles quand vous la remettrez en ligne.",
      },
      saved: {
        pending: "Vos modifications sont enregistrées. Nous en tenons compte dans notre relecture.",
        published: "Vos modifications sont enregistrées et visibles sur votre annonce.",
        paused:
          "Vos modifications sont enregistrées. Elles seront visibles quand vous remettrez votre annonce en ligne.",
      },
      addressLocked:
        "Elle ne change plus une fois l'annonce envoyée. Pour la corriger, écrivez-nous à",
      required: {
        characteristics:
          "Le type, la surface et le nombre de pièces restent nécessaires à votre annonce.",
        land: "Le type et la surface restent nécessaires à votre annonce.",
        listing: "Le prix et la description restent nécessaires à votre annonce.",
        field: "À renseigner.",
      },
    },
  },
  // L1-13b: from the result of the wizard to the creation of the listing.
  estimator: {
    listing: {
      title: "Mettre votre bien en vente",
      text: "Créez votre annonce : nous reprenons l'adresse, les caractéristiques et la valeur de cette analyse.",
      action: "Créer mon annonce",
    },
    // Names without visible text (L1-44): the buttons of the dialog
    // « Prendre contact », the surface slider, the state of a next step.
    contactDialog: { back: "Retour", close: "Fermer" },
    surfaceSlider: "Surface habitable",
    nextStep: { done: "Fait :", todo: "À faire :" },
  },
  // L1-21: messaging (SPEC-V2 8.6, DESIGN.md 10.5 and 12.9).
  messaging: {
    metaTitle: "Messages · Leenkey",
    title: "Messages",
    conversationMetaTitle: (title: string) => `${title} · Messages · Leenkey`,
    newMetaTitle: "Contacter le vendeur · Leenkey",
    // The other party without a first name.
    someone: { buyer: "l'acquéreur", seller: "le vendeur" },
    list: {
      label: "Vos conversations",
      unread: "Non lu",
      you: "Vous :",
      // Group of the conversations of an account that also sells.
      buying: "Annonces contactées",
      error: "Vos conversations n'ont pas pu être chargées. Réessayez dans un instant.",
      empty: {
        title: "Aucune conversation pour l'instant",
        buyer: "Écrivez à un vendeur depuis son annonce : votre échange apparaîtra ici.",
        seller: "Les acquéreurs qui vous écrivent depuis votre annonce apparaîtront ici.",
        action: "Voir les annonces",
      },
      choose: {
        title: "Choisissez une conversation",
        text: "Ses messages s'affichent ici, à côté de la liste.",
      },
    },
    thread: {
      back: "Toutes les conversations",
      label: "Messages de la conversation",
      with: (name: string) => `Avec ${name}`,
      withFinancing: (name: string, financing: string) => `Avec ${name}\u00A0· ${financing}`,
      you: "Vous",
      menu: "Plus d'actions",
      report: "Signaler la conversation",
      reported: "Votre signalement est transmis à l'équipe Leenkey.",
      closed: "Cette conversation est close : vous ne pouvez plus y écrire.",
      // Back to what the conversation is about (DECISIONS 2026-10-26).
      listing: "Voir l'annonce",
      property: "Voir mon bien",
    },
    composer: {
      label: "Votre message",
      send: "Envoyer",
    },
    start: {
      back: "Retour à l'annonce",
      intro: (name: string) => `Présentez-vous et posez vos questions : ${name} vous répond ici.`,
      visit: "Bonjour, je souhaiterais visiter votre bien. Quelles sont vos disponibilités ?",
    },
    report: {
      title: "Signaler la conversation",
      text: "Dites-nous ce qui ne va pas : l'équipe Leenkey examine chaque signalement.",
      reason: "Motif du signalement",
      confirm: "Envoyer le signalement",
      tooShort: "Indiquez le motif du signalement, en 3 caractères au moins.",
      tooLong: "Le motif dépasse 2\u00A0000 caractères.",
      unavailable: "Le signalement n'est pas parti. Réessayez dans un instant.",
    },
    errors: {
      empty: "Écrivez votre message.",
      tooLong: "Votre message dépasse 4\u00A0000 caractères.",
      auth: "Votre session a expiré : reconnectez-vous pour envoyer votre message.",
      messagesPerHour:
        "Vous avez envoyé 20 messages en une heure : c'est la limite. Réessayez un peu plus tard.",
      conversationsPerDay:
        "Vous avez contacté 5 nouveaux vendeurs en 24\u00A0h : c'est la limite. Réessayez demain.",
      closed: "Cette conversation est close : vous ne pouvez plus y écrire.",
      inactive:
        "Votre compte ne permet plus d'envoyer de messages : écrivez-nous depuis le formulaire de contact.",
      subjectUnavailable:
        "Cette annonce n'est plus en ligne : son vendeur ne peut plus être contacté.",
      unavailable: "Votre message n'est pas parti. Vérifiez votre connexion et réessayez.",
    },
    dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
    // A conversation that could not be read (SPEC-V2 section 6, « Erreur »).
    error: {
      title: "Ça n'a pas fonctionné.",
      text: "Vos messages n'ont pas pu être chargés. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      retry: "Réessayer",
      back: "Toutes les conversations",
    },
  },
  // L1-10: pages whose screen comes with a later task (ComingSoon).
  placeholders: {
    account: {
      metaTitle: "Mon compte · Leenkey",
      title: "Mon compte",
      comingTitle: "Vos réglages arrivent",
      comingText:
        "Nous préparons l'écran de vos informations personnelles et de votre mot de passe.",
    },
    // « Dossier » tab (L1-14): the page of the property, or the list of them.
    sellerFile: {
      metaTitle: "Dossier de vente · Leenkey",
      title: "Dossier de vente",
    },
    admin: {
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
    notice: legalNotice,
    terms,
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
  // L1-19: back office v0 of the listings (SPEC-V2 section 17, DESIGN.md 12.12, 12.13).
  adminListings: {
    metaTitle: "Annonces · Back office · Leenkey",
    detailMetaTitle: (reference: string) => `${reference} · Annonces · Back office · Leenkey`,
    title: "Annonces",
    summary: {
      pending: (count: number) => `${count}\u00A0en attente de validation`,
      published: (count: number) => `${count}\u00A0en ligne`,
      suspended: (count: number) =>
        count <= 1 ? `${count}\u00A0suspendue` : `${count}\u00A0suspendues`,
    },
    filters: {
      label: "Statut des annonces",
      all: "Toutes",
    },
    limited: (count: number) =>
      `Les ${count}\u00A0premières annonces sont affichées : précisez la recherche ou le filtre.`,
    outOfZone: "Hors zone",
    search: {
      label: "Rechercher une annonce",
      placeholder: "Référence, ville ou vendeur",
      submit: "Rechercher",
    },
    table: {
      label: "Annonces",
      property: "Bien",
      seller: "Vendeur",
      price: "Prix",
      plan: "Formule",
      received: "Reçue",
      status: "Statut",
    },
    notReceived: "Pas envoyée",
    empty: {
      title: "Aucune annonce",
      text: "Aucune annonce ne correspond à ce filtre.",
      search: (query: string) => `Aucune annonce ne correspond à « ${query} ».`,
      action: "Voir toutes les annonces",
    },
    error: "Les annonces n'ont pas pu être chargées.",
    retry: "Réessayer",
    open: "Aperçu",
    openLabel: (reference: string) => `Aperçu de l'annonce ${reference}`,
    sellerUnknown: "Vendeur",
    back: "Toutes les annonces",
    detail: {
      seller: "Vendeur",
      plan: "Formule",
      received: "Reçue",
      published: "Publiée le",
      rejection: "Motif du refus",
      suspension: "Motif de la suspension",
      preview: "Aperçu de l'annonce",
      history: "Historique",
      historyEmpty: "Aucune décision pour l'instant.",
      publicPage: "Voir la page publique",
    },
    history: {
      actions: {
        "listing.publish": "Validée et publiée",
        "listing.reject": "Refusée",
        "listing.suspend": "Suspendue",
        "listing.unsuspend": "Remise en ligne",
      } as Record<string, string>,
      other: "Modifiée",
      by: (name: string) => `par ${name}`,
      reason: (reason: string) => `Motif : ${reason}`,
    },
    actions: {
      label: (reference: string) => `Décisions sur l'annonce ${reference}`,
      publish: "Valider et publier",
      reject: "Refuser avec motif",
      suspend: "Suspendre",
      unsuspend: "Remettre en ligne",
      // Mobile cards (AdminAnnonces): the motive is asked in the dialog anyway.
      publishShort: "Valider",
      rejectShort: "Refuser",
    },
    reasonDialog: {
      rejectTitle: "Refuser l'annonce",
      rejectText: "Le vendeur reçoit ce motif par email, corrige son annonce et nous la renvoie.",
      suspendTitle: "Suspendre l'annonce",
      suspendText:
        "L'annonce n'est plus visible des acquéreurs. Le vendeur reçoit ce motif par email ; il ne peut pas la remettre en ligne lui-même.",
      templates: "Motifs fréquents",
      reason: "Motif envoyé au vendeur",
      reasonHint: "Au moins 3 caractères, envoyé tel quel.",
      cancel: "Annuler",
      back: "Retour",
      close: "Fermer",
      confirmReject: "Refuser l'annonce",
      confirmSuspend: "Suspendre l'annonce",
    },
    // Provisional wording, to be validated by Cédric (DECISIONS 2026-10-17).
    rejectTemplates: [
      "La description est incomplète : précisez l'état du bien, ses pièces et ses points forts.",
      "Le prix ne correspond pas au bien décrit : vérifiez-le ou expliquez-le dans la description.",
      "Une information obligatoire manque : classe énergie (DPE), surface ou nombre de pièces.",
      "L'annonce contient des coordonnées personnelles : retirez-les, les échanges passent par la messagerie Leenkey.",
    ],
    suspendTemplates: [
      "Un signalement d'acquéreur est en cours de vérification.",
      "Des informations de l'annonce semblent inexactes.",
      "Le bien semble déjà vendu ou n'est plus disponible.",
      "Le contenu de l'annonce ne respecte pas nos conditions d'utilisation.",
    ],
    result: {
      published: "Annonce publiée.",
      rejected: "Annonce refusée.",
      suspended: "Annonce suspendue.",
      unsuspended: "Annonce remise en ligne.",
      emailSent: "Le vendeur est prévenu par email.",
      emailTest: "Email envoyé à la boîte de test (hors production).",
      emailLogged: "Email non envoyé : environnement local.",
      emailFailed: "L'email au vendeur n'a pas pu partir : prévenez-le autrement.",
    },
    errors: {
      invalid: "Le motif doit faire au moins 3 caractères.",
      conflict:
        "Cette annonce a changé de statut entre-temps : la page montre maintenant son statut.",
      notFound: "Cette annonce n'existe plus.",
      forbidden: "Cette action est réservée à l'équipe Leenkey.",
      unavailable: "La décision n'a pas pu être enregistrée. Réessayez.",
      network:
        "Pas de réponse du serveur : la décision a peut-être été enregistrée. Rechargez la page pour vérifier le statut de l'annonce avant de recommencer.",
      reload: "Recharger la page",
    },
  },
  // Transactional emails (SPEC-V2 section 18, DESIGN.md 14), texts of emails/.
  emails: {
    brand: "Leenkey",
    greeting: (firstName: string | null) => (firstName ? `Bonjour ${firstName},` : "Bonjour,"),
    signature: "L'équipe Leenkey",
    footer: {
      why: "Vous recevez cet email parce que vous vendez un bien sur Leenkey.",
      whyBuyer: "Vous recevez cet email parce que vous avez contacté un vendeur sur Leenkey.",
      preferences: "Gérer mes notifications",
      internal: "Notification interne du back office de Leenkey.",
    },
    // The reference in the subjects: one thread per listing in the inbox.
    // L1-13: a listing sent for review (SPEC-V2 section 18).
    listingReceived: {
      subject: (reference: string) => `Votre annonce est bien reçue (${reference})`,
      title: "Votre annonce est bien reçue",
      text: (title: string) => `Nous avons bien reçu « ${title} ».`,
      next: "Nous la relisons sous 24\u00A0h et vous prévenons par email dès qu'elle est en ligne, ou s'il faut la corriger.",
      action: "Voir ma vente",
    },
    // L1-22: the new messages of a conversation, in one email (SPEC-V2 10).
    newMessages: {
      subject: (name: string | null, count: number) =>
        count > 1
          ? `${count} nouveaux messages${name ? ` ${of(name)}` : ""}`
          : `Nouveau message${name ? ` ${of(name)}` : ""}`,
      about: (listing: string) => `À propos de «\u00A0${listing}\u00A0» :`,
      more: (count: number) =>
        count === 1 ? "Et un autre message." : `Et ${count} autres messages.`,
      // Its words may hold a link: never in an email (core/notifications/user-text.ts).
      hidden: "Ce message contient un lien ou une adresse : lisez-le sur Leenkey.",
      replyHint:
        "Pour répondre, écrivez sur Leenkey : une réponse à cet email ne lui parvient pas.",
      action: "Lire la conversation",
    },
    // L1-22: several listings sent for review at once, in one email (SPEC-V2 10).
    listingsToReview: {
      subject: (count: number) => `${count} annonces à valider`,
      title: (count: number) => `${count} annonces attendent votre relecture`,
      text: "Elles sont arrivées presque en même temps : les voici ensemble.",
      action: "Ouvrir les annonces à valider",
    },
    listingToReview: {
      subject: (reference: string) => `Annonce à valider (${reference})`,
      title: "Une annonce attend votre relecture",
      text: (title: string) => `« ${title} » vient d'être envoyée en validation.`,
      details: (reference: string, place: string, price: string, seller: string | null) =>
        [reference, place, price, seller].filter(Boolean).join(" · "),
      deadline: "Objectif : une réponse au vendeur sous 24\u00A0h.",
      action: "Relire l'annonce",
    },
    listingPublished: {
      subject: (reference: string) => `Votre annonce est en ligne (${reference})`,
      title: "Votre annonce est en ligne",
      text: (title: string) =>
        `Nous avons relu « ${title} » : elle est maintenant visible des acquéreurs sur Leenkey.`,
      tips: "Les premiers jours comptent : répondez vite aux messages et proposez des visites.",
      action: "Voir mon annonce",
    },
    listingRejected: {
      subject: (reference: string) => `Votre annonce est à corriger (${reference})`,
      title: "Votre annonce est à corriger",
      text: (title: string) =>
        `Nous avons relu « ${title} » : elle ne peut pas encore être publiée.`,
      reason: "Ce qu'il faut corriger",
      next: "Corrigez-la depuis votre espace vendeur et renvoyez-la : nous la relisons sous 24\u00A0h.",
      action: "Corriger mon annonce",
    },
    listingSuspended: {
      subject: (reference: string) => `Votre annonce est suspendue (${reference})`,
      title: "Votre annonce est suspendue",
      text: (title: string) => `« ${title} » n'est plus visible des acquéreurs pour le moment.`,
      reason: "Motif",
      // Around the address, a mailto link. Delay of the contact form (CLAUDE.md 16), Q44.
      contest: {
        before: "Si vous n'êtes pas d'accord ou si vous avez corrigé le problème, écrivez-nous à ",
        after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
      },
      action: "Voir mon Cockpit",
    },
  },
  // Labels of SPEC-V2 section 7 (StatusBadge mapping), colours in DESIGN.md 10.2.
  // Exact labels of FinancingBadge (DESIGN.md 10.2, SPEC-V2 13): never « validé ».
  financingStatus: {
    not_provided: "Financement non renseigné",
    declared: "Informations déclarées",
    document_provided: "Justificatif fourni",
    document_checked: "Justificatif vérifié",
  },
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
  // The card of a property of direction C (components/shared/showcase-card.tsx).
  showcaseCard: {
    previousPhoto: "Photo précédente",
    nextPhoto: "Photo suivante",
    photoPosition: (position: number, total: number) => `Photo ${position} sur ${total}`,
  },
  propertyCard: {
    badgeNew: "Nouveau",
    badgePriceDrop: "Prix en baisse",
    photoCount: (total: number) => `1 / ${total}`,
  },
  // L1-15: search /acheter (SPEC-V2 8.4, docs/DESIGN.md 10.3, 12.5, 12.6).
  // L1-16: maps of Google Maps, shown after the choice of the visitor
  // (core/maps/use-maps-consent.ts, DECISIONS 2026-10-26).
  maps: {
    gateNote:
      "La carte est fournie par Google Maps : l'afficher transmet votre adresse IP à Google.",
    gateAction: "Afficher la carte",
    loading: "Chargement de la carte…",
    unavailable: "La carte n'est pas disponible pour le moment.",
  },
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
    // L1-61, in the way of Airbnb: the row of categories under the bar, each
    // a filter pressed or not (the type, a garden, a parking).
    categories: {
      label: "Catégories de biens",
      all: "Tous les biens",
      maison: "Maisons",
      appartement: "Appartements",
      jardin: "Avec jardin",
      parking: "Avec parking",
      terrain: "Terrains",
    },
    chips: {
      priceMax: (price: string) => `≤ ${price}`,
      priceMin: (price: string) => `≥ ${price}`,
      priceRange: (min: string, max: string) => `${min} – ${max}`,
    },
    bar: {
      label: "Filtres de la recherche",
      type: "Type de bien",
      rooms: "Pièces",
      surface: "Surface",
      dpe: "DPE",
      priceUpTo: (price: string) => `Jusqu'à ${price}`,
      roomsAtLeast: (rooms: number) => (rooms === 1 ? "1 pièce et +" : `${rooms} pièces et +`),
      surfaceAtLeast: (surface: string) => `${surface} et +`,
      // The rounded bar of direction C (DECISIONS 2026-10-26): a name above its value.
      where: "Où\u00A0?",
      budgetTitle: "Budget",
      // The panels of the bar (L1-61): the budget is applied with « Appliquer ».
      apply: "Appliquer",
      clear: "Effacer",
      presets: "Budgets courants",
      typeAll: "Tous les biens",
      any: "Indifférent",
      dpeAll: "Toutes les classes",
      dpeClass: (letter: string) => (letter === "A" ? "A" : `A à ${letter}`),
    },
    dialog: {
      title: "Filtres",
      close: "Fermer les filtres",
      radius: (place: string) => `Rayon autour de ${place}`,
      radiusTown: "Ville seule",
      type: "Type de bien",
      typeAll: "Tous les biens",
      budget: "Budget",
      budgetMin: "Budget minimum",
      budgetMax: "Budget maximum",
      surface: "Surface",
      surfaceMin: "Surface minimum",
      surfaceMax: "Surface maximum",
      rooms: "Pièces",
      bedrooms: "Chambres",
      /** Short « all » of a row of buttons (pieces, bedrooms, DPE). */
      anyShort: "Tous",
      roomsShort: (rooms: number) => `${rooms}+`,
      dpeMax: "Classe énergie (DPE), au plus",
      // The sections of the panel (L1-61, in the way of Airbnb).
      sections: {
        type: "Type de bien",
        budget: "Fourchette de budget",
        budgetText: "Le prix de vente, sans frais d'agence.",
        surface: "Surface habitable",
        rooms: "Pièces et chambres",
        outdoor: "Extérieur",
        equipment: "Équipements",
        dpe: "Performance énergétique",
      },
      budgetRange: "Fourchette de budget",
      outdoor: "Extérieur",
      outdoorHelp: "Les biens qui ont au moins l'un des extérieurs choisis.",
      equipment: "Équipements",
      parking: "Stationnement",
      elevator: "Ascenseur",
      minAboveMax: "Le maximum doit être supérieur ou égal au minimum.",
      clear: "Tout effacer",
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
    // L1-16: the map of the results (docs/DESIGN.md 8, 12.5, 12.6).
    map: {
      region: "Carte des biens",
      gateTitle: "Voir les biens sur la carte",
      open: "Carte",
      close: "Liste",
      /** Name of a price pill: its text first (WCAG 2.5.3), then what the card says. */
      pill: (label: string, summary: string, place: string) => `${label}, ${summary}, ${place}`,
      preview: "Bien choisi sur la carte",
      closePreview: "Fermer l'aperçu",
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
    photoAlt: (index: number, total: number, subject: string) =>
      `Photo ${index} sur ${total}, ${subject}`,
    metaTitle: (summary: string, place: string, price: string) =>
      `${summary} ${place} · ${price} · Leenkey`,
    breadcrumb: "Fil d'Ariane",
    breadcrumbRoot: "Acheter",
    // The back link of a listing, the button over the mobile gallery included.
    backToListings: "Retour aux annonces",
    summary: {
      rooms: (rooms: number) => (rooms === 1 ? "1 pièce" : `${rooms} pièces`),
    },
    // L1-16: the area of the listing, never its address (docs/DESIGN.md 8).
    map: {
      title: "Localisation",
      region: "Carte du secteur du bien",
      gateTitle: "Voir le secteur sur la carte",
      sector: (place: string) => `Secteur approximatif, ${place}`,
      streetView: "Voir la rue",
      backToMap: "Revenir à la carte",
      noStreetView: "Pas de vue de la rue dans ce secteur.",
      streetViewError: "La vue de la rue n'a pas pu s'ouvrir. Réessayez dans un instant.",
    },
    gallery: {
      none: "Pas encore de photo pour ce bien.",
      counter: (index: number, total: number) => `${index} / ${total}`,
      open: (index: number, total: number) => `Agrandir la photo ${index} sur ${total}`,
      more: (count: number) => `+ ${count}\u00A0${count === 1 ? "photo" : "photos"}`,
      /** The tile that shows « + 2 photos »: its name starts with what it shows. */
      openMore: (count: number, index: number, total: number) =>
        `+ ${count}\u00A0${count === 1 ? "photo" : "photos"}, agrandir la photo ${index} sur ${total}`,
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
      // Groups of the grid of the listing page (L1-55).
      sections: {
        property: "Caractéristiques",
        energy: "Énergie",
        costs: "Coûts et copropriété",
        /** Without a co-ownership: the property tax alone. */
        costsOnly: "Coûts",
      },
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
      // The preview of the seller before sending (L1-13).
      inactive: "Dans l'aperçu, ces boutons sont inactifs.",
    },
    // The title and the action of errors.notFound.
    notFound: {
      metaTitle: "Annonce introuvable · Leenkey",
      text: "L'annonce a peut-être été vendue ou retirée par son propriétaire.",
    },
  },
  // Public site in V2 (lib/i18n/site.ts).
  site,
} as const;
