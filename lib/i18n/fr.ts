// User-facing texts (CLAUDE.md section 9): no string literal in components.
import { aiText, privacyText, reportingText, salesTermsText, termsV2 } from "./legal-policies";
import { legalNotice } from "./legal-texts";
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
    waitMinutes: (minutes: number) => `${minutes}\u00A0min`,
    waitHours: (hours: number) => `${hours}\u00A0h`,
    waitDays: (days: number) => `${days}\u00A0${days > 1 ? "jours" : "jour"}`,
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
      tooManyRequests: "Trop de tentatives. Réessayez plus tard.",
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
    },
    admin: {
      metaTitle: "Back office · Leenkey",
    },
  },
  // « Mon compte » (L1-39, SPEC-V2 8.14, DESIGN.md 13.1 G9): the overview in
  // rows, then one page per change.
  account: {
    metaTitle: "Mon compte · Leenkey",
    title: "Mon compte",
    back: "Mon compte",
    sections: {
      identity: "Informations personnelles",
      signIn: "Connexion",
      notifications: "Notifications",
      spaces: "Mes espaces",
      privacy: "Cookies",
      close: "Fermer mon compte",
    },
    rows: {
      name: "Prénom et nom",
      phone: "Téléphone",
      email: "Adresse email",
      password: "Mot de passe",
      passwordValue: "Modifier votre mot de passe",
      notifications: "Emails de Leenkey",
      notificationsValue: "Choisir les emails que vous recevez",
    },
    notSet: "Non renseigné",
    emailPending: (email: string) => `Nouvelle adresse à confirmer : ${email}`,
    roles: {
      seller: {
        label: "Je vends",
        open: "Ma vente",
        hint: "Publier un bien et suivre sa vente.",
      },
      buyer: {
        label: "J'achète",
        open: "Cockpit acquéreur",
        hint: "Chercher un bien, enregistrer vos favoris et votre projet.",
      },
      add: "Ajouter",
      // Name of the button for screen readers: « Ajouter J'achète ».
      addLabel: (role: string) => `Ajouter « ${role} »`,
      added: (role: string) => `« ${role} » est ajouté à votre compte.`,
      error: "Ce changement n'a pas pu être enregistré. Réessayez dans un instant.",
    },
    // Until the deletion from this page (L2-10): the way of the CGU, article 17.
    closeText: {
      before: "Pour fermer votre compte, écrivez-nous à ",
      after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
    },
    saved: {
      identity: "Vos informations sont enregistrées.",
      email: "Votre nouvelle adresse email est enregistrée.",
      password: "Votre mot de passe est modifié. Vos autres appareils sont déconnectés.",
    },
    identity: {
      metaTitle: "Informations personnelles · Leenkey",
      title: "Informations personnelles",
      firstName: "Prénom",
      firstNameHint: "Montré aux personnes avec qui vous échangez sur Leenkey.",
      lastName: "Nom",
      phone: "Téléphone",
      submit: "Enregistrer",
      errors: {
        firstNameRequired: "Indiquez votre prénom.",
        tooLong: "80 caractères maximum.",
      },
    },
    email: {
      metaTitle: "Adresse email · Leenkey",
      title: "Adresse email",
      current: "Adresse actuelle",
      pending: (email: string) =>
        `Le changement vers ${email} attend encore sa confirmation. Ouvrez les deux liens reçus, ou demandez-en de nouveaux ci-dessous.`,
      field: "Nouvelle adresse email",
      note: "Pour protéger votre compte, nous envoyons un lien à votre adresse actuelle et un autre à la nouvelle : le changement est fait une fois les deux liens ouverts. Ils sont valables une heure.",
      submit: "Recevoir les liens de confirmation",
      sent: (current: string, next: string) =>
        `Deux liens sont partis, à ${current} et à ${next}. Ouvrez-les tous les deux pour terminer le changement.`,
      errors: {
        same: "C'est déjà votre adresse.",
        taken: "Cette adresse est déjà celle d'un autre compte.",
      },
    },
    password: {
      metaTitle: "Mot de passe · Leenkey",
      title: "Mot de passe",
      current: "Mot de passe actuel",
      next: "Nouveau mot de passe",
      confirm: "Confirmez le nouveau mot de passe",
      forgot: "Mot de passe oublié ?",
      note: "Une fois le mot de passe modifié, vos autres appareils sont déconnectés.",
      submit: "Enregistrer le mot de passe",
      errors: {
        currentRequired: "Indiquez votre mot de passe actuel.",
        currentWrong: "Ce mot de passe n'est pas le bon.",
      },
    },
    // /confirmation of a change of address (one link of two, or both).
    emailChange: {
      title: "Confirmez le changement d'adresse",
      lead: "Un clic pour confirmer le changement d'adresse email de votre compte Leenkey.",
      submit: "Confirmer",
      halfMetaTitle: "Plus qu'un lien · Leenkey",
      halfTitle: "Plus qu'un lien",
      halfLead:
        "Cette adresse est confirmée. Ouvrez maintenant le lien envoyé à votre autre adresse : le changement est fait une fois les deux liens ouverts.",
      halfAction: "Se connecter",
    },
    errors: {
      session: "Votre session a expiré. Connectez-vous de nouveau.",
    },
  },
  // « Ma vente », the dashboard of a sale (L1-24, SPEC-V2 8.7, DESIGN.md 12.3).
  saleDashboard: {
    title: "Ma vente",
    switch: { trigger: "Changer de bien" },
    figures: (price: string, published: string | null) =>
      published ? `${price} · publié le ${published}` : price,
    step: (position: number, total: number, title: string) =>
      `Étape ${position} sur ${total} · ${title}`,
    next: {
      label: "Prochaine action",
      rejected: {
        title: "Corrigez votre annonce",
        text: "Nous vous indiquons ce qu'il faut modifier avant de la publier.",
        action: "Corriger l'annonce",
        secondary: "Voir le bien",
      },
      waiting: {
        title: (firstName: string | null) =>
          firstName ? `Répondez à ${firstName}` : "Répondez à un acquéreur",
        text: (since: string) =>
          `Message reçu ${since}. Une réponse rapide garde l'acquéreur intéressé.`,
        action: "Répondre",
        secondary: "Toutes les conversations",
      },
      task: {
        // What to do, for the tasks a seller does (their titles say them done).
        titles: {
          property_complete: "Complétez la fiche du bien",
          photos_min6: "Ajoutez au moins 6 photos",
          listing_written: "Rédigez votre annonce",
          listing_submitted: "Envoyez-nous votre annonce",
          deed_signed: "Indiquez que le bien est vendu",
          notary_chosen: "Choisissez votre notaire",
          notary_file_sent: "Transmettez le dossier au notaire",
          precontract_signed: "Signez l'avant-contrat",
          conditions_lifted: "Faites lever les conditions suspensives",
        } as Record<string, string>,
        text: (step: string) => `Étape « ${step} ».`,
        action: "Continuer",
        done: "C'est fait",
        secondary: "Toutes les étapes",
      },
      advice: { listing: "Voir l'annonce en ligne", sheet: "Voir le bien" },
      review: {
        title: "Nous relisons votre annonce",
        text: "Nous la relisons sous 24\u00A0h et vous prévenons par email.",
      },
    },
    stats: {
      label: "Votre annonce en chiffres",
      views: (count: number) => (count > 1 ? "vues · 7 j" : "vue · 7 j"),
      contacts: (count: number) => (count > 1 ? "contacts" : "contact"),
      qualified: (count: number) => (count > 1 ? "qualifiés" : "qualifié"),
    },
    todo: {
      title: "À faire",
      all: "Toutes les étapes",
      states: { done: "Fait", current: "À faire maintenant", todo: "À venir" },
      leenkey: "Par votre conseiller Leenkey",
      automatic: "Se coche automatiquement",
      manual: "À cocher quand c'est fait",
      markDone: "Fait",
      markUndone: "Annuler",
      markDoneLabel: (title: string) => `Marquer « ${title} » comme fait`,
      markUndoneLabel: (title: string) => `Remettre « ${title} » à faire`,
      error: "Ça n'a pas fonctionné. Réessayez dans un instant.",
    },
    conversations: {
      title: "Conversations",
      all: "Toutes les conversations",
      empty: "Pas encore de message. Les acquéreurs vous écrivent depuis votre annonce.",
    },
    draft: {
      title: "Terminez votre annonce",
      text: "Votre bien est enregistré. Il reste quelques étapes avant de nous l'envoyer.",
      action: "Reprendre la création",
    },
    sold: {
      title: "Vente terminée",
      text: "Félicitations. Voici le bilan de votre vente sur Leenkey.",
      price: "prix de vente",
      askedPrice: "dernier prix affiché",
      days: (count: number) => (count > 1 ? "jours en vente" : "jour en vente"),
      contacts: (count: number) => (count > 1 ? "contacts" : "contact"),
    },
    steps: {
      metaTitle: "Toutes les étapes · Leenkey",
      title: "Toutes les étapes",
      back: "Ma vente",
      current: "Étape en cours",
      done: "Terminée",
      count: (done: number, total: number) => `${done} sur ${total}`,
      // The steps side by side, swiped (Younes, DECISIONS 2026-11-07).
      region: "Étapes de la vente",
      previous: "Voir l'étape précédente",
      next: "Voir l'étape suivante",
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
      // L1-26: a plan paid (seller), its case and its refunds (team).
      // L1-40: a plan ending within 30 days, to its owner.
      planEnding: {
        title: (plan: string | null) =>
          plan ? `Votre formule ${plan} se termine bientôt` : "Votre formule se termine bientôt",
        detail: (date: string | null) =>
          date
            ? `Le ${date}. Sans renouvellement, votre bien repasse en Autonomie.`
            : "Sans renouvellement, votre bien repasse en Autonomie.",
      },
      // L1-40: a withdrawal to refund, to the team.
      planWithdrawn: {
        title: "Rétractation à rembourser",
        detail: (plan: string | null, reference: string | null) =>
          [plan ? `Formule ${plan}` : null, reference].filter(Boolean).join(" · ") || null,
      },
      planActivated: {
        title: (plan: string | null) => (plan ? `Formule ${plan} activée` : "Formule activée"),
        detail: (reference: string | null) =>
          reference
            ? `Pour votre bien ${reference}.`
            : "Votre conseiller Leenkey va vous contacter.",
      },
      caseCreated: {
        title: (plan: string | null, upgrade: boolean) =>
          upgrade
            ? `Passage à ${plan ?? "une formule supérieure"}`
            : `Nouvelle formule ${plan ?? "payante"}`,
        // A payment recorded with something to check (stripe_checkout_complete).
        checkTitle: (held: boolean) => (held ? "Paiement à vérifier" : "Formule à vérifier"),
        detail: (reference: string | null) =>
          reference ? `Dossier à suivre pour ${reference}.` : "Un dossier à suivre.",
      },
      // 2026-11-08: an account confirmed, to the team.
      accountCreated: {
        title: "Nouveau compte",
        detail: (name: string | null, roles: string | null) =>
          [name, roles].filter(Boolean).join(" · ") || null,
      },
      // L1-30c: a conversation reported, to the team.
      reportCreated: {
        title: "Conversation signalée",
        detail: (excerpt: string | null, reference: string | null) =>
          [excerpt ? `«\u00A0${excerpt}\u00A0»` : null, reference].filter(Boolean).join(" · ") ||
          null,
      },
      planRefunded: {
        title: (full: boolean) => (full ? "Formule remboursée" : "Remboursement partiel"),
        checkTitle: "Remboursement à vérifier",
        detail: (amount: string | null, reference: string | null) =>
          [amount, reference].filter(Boolean).join(" · ") || null,
      },
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
    // Beside the title of a listing (L1-60, the « Enregistrer » of Airbnb).
    save: "Enregistrer",
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
        steps: "Étapes",
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
      // L1-25: the financing of the buyer, for the seller.
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
    // « Dossier » tab (L1-14): the page of the property, or the list of them.
    sellerFile: {
      metaTitle: "Dossier de vente · Leenkey",
      title: "Dossier de vente",
    },
    admin: {
      offers: {
        metaTitle: "Offres · Back office · Leenkey",
        title: "Offres",
        comingTitle: "Le suivi des offres arrive",
        comingText: "Nous préparons l'écran qui réunira les offres d'achat et leur historique.",
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
      ...privacyText,
    },
    notice: legalNotice,
    terms: termsV2,
    salesTerms: {
      metaTitle: "Conditions générales de vente · Leenkey",
      title: "Conditions générales de vente",
      lead: "Elles s'appliquent aux formules Accompagné et Sérénité, payées à la souscription.",
      contact: "Pour toute question sur une commande, écrivez-nous à",
      ...salesTermsText,
    },
    cookies: {
      metaTitle: "Politique cookies · Leenkey",
      title: "Politique cookies",
      lead: "Les cookies déposés par leenkey.fr, à quoi ils servent, et comment changer d'avis.",
      updated: "En vigueur depuis le 9 novembre 2026",
      listTitle: "Liste des cookies et du stockage du site",
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
          name: "lk_visitor",
          provider: "Leenkey",
          purpose:
            "Compter vos questions à l'assistant du site et retrouver votre conversation, une fois que vous lui avez écrit",
          kind: "necessary",
          duration: "30 jours",
        },
        {
          name: "lk-visitor-assistant",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose: "Garder votre conversation avec l'assistant du site d'une page à l'autre",
          kind: "necessary",
          duration: "Jusqu'à la fermeture de l'onglet",
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
          name: "lk_estimation_claim",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose:
            "Rattacher votre analyse de valeur au compte que vous créez ensuite, pour la reprendre dans votre annonce",
          kind: "necessary",
          duration: "Jusqu'à la création de votre annonce",
        },
        {
          name: "lk:maps:visited",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose: "Marquer sur la carte les annonces que vous avez déjà ouvertes",
          kind: "necessary",
          duration: "Jusqu'à la fermeture de l'onglet",
        },
        {
          name: "lk:search:last",
          provider: "Leenkey (stockage de votre navigateur)",
          purpose:
            "Vous proposer de reprendre votre dernière recherche, avec les biens publiés depuis",
          kind: "necessary",
          duration: "Jusqu'à son effacement dans votre navigateur, remplacé à chaque recherche",
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
        "Vercel Web Analytics, la mesure d'audience de notre hébergeur, ne dépose ni cookie ni stockage dans votre navigateur. Les cartes sont chargées depuis les serveurs de Google, qui reçoivent l'adresse IP de votre appareil et la zone affichée ; aucun cookie n'est déposé par leenkey.fr pour elles.",
      intro:
        "Un cookie ou un stockage du navigateur garde une information sur votre appareil. Ceux qui sont nécessaires au fonctionnement du site, ou à un service que vous demandez, sont déposés sans accord préalable ; les autres ne le sont qu'avec votre accord, que vous pouvez refuser aussi simplement qu'accepter, et retirer à tout moment. Vous pouvez aussi les gérer dans les réglages de votre navigateur : bloquer ceux qui sont nécessaires peut empêcher certaines fonctions de marcher.",
      manageText: "Vous pouvez changer d'avis à tout moment :",
      contact: "Pour toute question sur les cookies, écrivez-nous à",
    },
    ai: {
      metaTitle: "Intelligence artificielle · Leenkey",
      title: "Intelligence artificielle",
      lead: "Comment l'assistant Leenkey utilise l'intelligence artificielle, et ce qu'il ne fait jamais seul.",
      ...aiText,
      contact: "Pour toute question sur l'assistant, écrivez-nous à",
    },
    reporting: {
      metaTitle: "Signalement et modération · Leenkey",
      title: "Signalement et modération",
      lead: "Comment signaler une annonce ou un message, et comment nous traitons les signalements.",
      contact: "Pour signaler un contenu, écrivez-nous à",
      ...reportingText,
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
  // L1-30a: the dashboard of the back office (SPEC-V2 section 17).
  adminDashboard: {
    greeting: (firstName: string | null) =>
      firstName ? `Bonjour ${firstName}, voici ce qui vous attend.` : "Voici ce qui vous attend.",
    tiles: {
      label: "Chiffres du back office",
      listings: "Annonces à valider",
      oldest: (wait: string, late: boolean) =>
        `Plus ancienne : ${wait}${late ? " · au-delà de 24\u00A0h" : " · objectif 24\u00A0h"}`,
      none: "Rien en attente",
      cases: "Dossiers ouverts",
      reports: "Signalements ouverts",
      plans: (days: number) => `Formules vendues · ${days}\u00A0j`,
      plansAmount: (amount: string) => `${amount} TTC`,
      signups: (days: number) => `Inscriptions · ${days}\u00A0j`,
      signupsSplit: (sellers: number, buyers: number) =>
        `${sellers}\u00A0${sellers > 1 ? "vendeurs" : "vendeur"}, ${buyers}\u00A0${buyers > 1 ? "acquéreurs" : "acquéreur"}`,
    },
    // The header of a phone (AdminMobileHeader): three tiles, a navigation
    // named apart from the « À traiter » list of the dashboard.
    header: {
      label: "Compteurs du back office",
      listings: "À valider",
      cases: "Dossiers",
      reports: "Signalements",
    },
    todo: {
      title: "À traiter",
      lead: "Ce qui attend l'équipe, du plus ancien au plus récent.",
      kinds: {
        listing: "Annonce à valider",
        case: "Dossier",
        report: "Signalement",
      },
      since: (wait: string) => `En attente depuis ${wait}`,
      emptyTitle: "Rien à traiter",
      emptyText: "Aucune annonce, aucun dossier ni aucun signalement n'attend l'équipe.",
    },
    later:
      "Messages clients, offres et déclencheurs de montée en gamme s'ajouteront ici avec leurs écrans.",
    error: "Une partie du tableau de bord n'a pas pu être chargée.",
    retry: "Réessayer",
  },
  // L1-30a: the users of the back office (SPEC-V2 section 17).
  adminUsers: {
    metaTitle: "Utilisateurs · Back office · Leenkey",
    detailMetaTitle: (name: string) => `${name} · Utilisateurs · Back office · Leenkey`,
    title: "Utilisateurs",
    summary: {
      total: (count: number) => `${count}\u00A0${count > 1 ? "comptes" : "compte"}`,
      sellers: (count: number) => `${count}\u00A0${count > 1 ? "vendeurs" : "vendeur"}`,
      buyers: (count: number) => `${count}\u00A0${count > 1 ? "acquéreurs" : "acquéreur"}`,
      suspended: (count: number) => `${count}\u00A0${count > 1 ? "suspendus" : "suspendu"}`,
    },
    filters: {
      label: "Type de compte",
      all: "Tous",
      seller: "Vendeurs",
      buyer: "Acquéreurs",
      admin: "Équipe",
      suspended: "Suspendus",
    },
    search: {
      label: "Rechercher un compte",
      placeholder: "Nom, prénom ou email",
      submit: "Rechercher",
    },
    limited: (count: number) =>
      `Les ${count}\u00A0premiers comptes sont affichés : précisez la recherche ou le filtre.`,
    table: {
      label: "Comptes",
      user: "Compte",
      roles: "Rôles",
      signedUp: "Inscription",
      properties: "Biens",
      plan: "Formule",
      financing: "Financement",
      status: "Statut",
    },
    roles: {
      seller: "Vendeur",
      buyer: "Acquéreur",
      admin: "Équipe",
    },
    noName: "Sans nom",
    noPlan: "—",
    noFinancing: "—",
    active: "Actif",
    suspendedBadge: "Suspendu",
    signedUp: (date: string) => `Inscrit le ${date}`,
    propertiesCount: (count: number) => `${count}\u00A0${count > 1 ? "biens" : "bien"}`,
    openLabel: (name: string) => `Voir la fiche de ${name}`,
    empty: {
      title: "Aucun compte",
      text: "Aucun compte ne correspond à ce filtre.",
      search: (query: string) => `Aucun compte ne correspond à « ${query} ».`,
      action: "Voir tous les comptes",
    },
    error: "Les comptes n'ont pas pu être chargés.",
    retry: "Réessayer",
    back: "Tous les utilisateurs",
    detail: {
      info: "Informations",
      email: "Email",
      emailConfirmed: "Email confirmé",
      emailNotConfirmed: "Email non confirmé",
      phone: "Téléphone",
      noPhone: "Non renseigné",
      signedUp: "Inscription",
      lastSignIn: "Dernière connexion",
      never: "Jamais",
      suspensionReason: "Motif de la suspension",
      properties: "Biens",
      propertiesEmpty: "Aucun bien.",
      noListing: "Annonce pas encore rédigée",
      buyer: "Projet d'achat",
      project: "Projet",
      cities: "Villes recherchées",
      financing: "Financement",
      noProject: "Non renseigné",
      conversations: "Conversations",
      conversationsNote:
        "Les métadonnées seulement : le contenu des messages n'est lu qu'en cas de signalement.",
      conversationsEmpty: "Aucune conversation.",
      // The account sells: the other side is a buyer, and the reverse.
      asSeller: (name: string) => `Échange avec ${name}, acquéreur`,
      asBuyer: (name: string) => `Échange avec ${name}, vendeur`,
      deletedAccount: "un compte supprimé",
      closed: "Close",
      lastMessage: (when: string) => `Dernier message : ${when}`,
      cases: "Dossiers",
      casesEmpty: "Aucun dossier.",
      caseStatus: {
        new: "Nouveau",
        in_progress: "En cours",
        closed: "Clos",
      },
      history: "Historique",
      historyEmpty: "Aucune décision pour l'instant.",
      self: "C'est votre compte : vous ne pouvez pas le suspendre.",
      team: "Un compte de l'équipe ne se suspend pas.",
      error: "La fiche de ce compte n'a pas pu être chargée.",
      later:
        "Les offres et le justificatif de financement s'ajouteront à cette fiche avec le lot 2.",
    },
    history: {
      actions: {
        "user.suspend": "Compte suspendu",
        "user.unsuspend": "Compte réactivé",
        "user.set_roles": "Rôles modifiés",
        "user.warn": "Averti après un signalement",
      } as Record<string, string>,
      other: "Modifié",
      by: (name: string) => `par ${name}`,
      reason: (reason: string) => `Motif : ${reason}`,
    },
    actions: {
      label: (name: string) => `Décisions sur le compte de ${name}`,
      suspend: "Suspendre le compte",
      unsuspend: "Réactiver le compte",
    },
    dialog: {
      title: "Suspendre le compte",
      text: "Le compte ne pourra plus publier, écrire ni utiliser l'assistant ; ses annonces restent en ligne. Son titulaire reçoit ce motif par email.",
      reason: "Motif envoyé au titulaire du compte",
      confirm: "Suspendre le compte",
    },
    // Provisional wording, to be validated by Cédric (Q71).
    suspendTemplates: [
      "Comportement abusif envers d'autres utilisateurs.",
      "Tentative de fraude ou d'escroquerie signalée.",
      "Informations du compte inexactes.",
      "Non-respect de nos conditions d'utilisation.",
    ],
    result: {
      suspended: "Compte suspendu.",
      unsuspended: "Compte réactivé.",
      emailSent: "Le titulaire du compte est prévenu par email.",
      emailFailed: "L'email au titulaire n'a pas pu partir : prévenez-le autrement.",
    },
    errors: {
      invalid: "Le motif doit faire au moins 3 caractères.",
      conflict:
        "Le statut de ce compte a déjà changé, ou c'est un compte de l'équipe : rechargez la page.",
      notFound: "Ce compte n'existe plus.",
      forbidden: "Cette action est réservée à l'équipe Leenkey.",
      unavailable: "La décision n'a pas pu être enregistrée. Réessayez.",
      network:
        "Pas de réponse du serveur : la décision a peut-être été enregistrée. Rechargez la page pour vérifier le statut du compte avant de recommencer.",
    },
  },
  // L1-30c: the cases of the back office (SPEC-V2 section 17).
  adminCases: {
    metaTitle: "Dossiers · Back office · Leenkey",
    detailMetaTitle: (subject: string) => `${subject} · Dossiers · Back office · Leenkey`,
    title: "Dossiers",
    summary: {
      open: (count: number) => `${count}\u00A0${count > 1 ? "dossiers ouverts" : "dossier ouvert"}`,
      toCheck: (count: number) =>
        `${count}\u00A0${count > 1 ? "paiements à vérifier" : "paiement à vérifier"}`,
      closed: (count: number) => `${count}\u00A0clos`,
    },
    filters: {
      label: "Statut des dossiers",
      open: "Ouverts",
      new: "Nouveaux",
      in_progress: "En cours",
      closed: "Clos",
    },
    search: {
      label: "Rechercher un dossier",
      placeholder: "Sujet, référence, ville ou vendeur",
      submit: "Rechercher",
    },
    limited: (count: number) =>
      `Les ${count}\u00A0premiers dossiers sont affichés : précisez la recherche ou le filtre.`,
    table: {
      label: "Dossiers",
      subject: "Dossier",
      source: "Origine",
      plan: "Formule",
      property: "Bien",
      status: "Statut",
      age: "Ancienneté",
      followed: "Suivi par",
    },
    sources: {
      plan_purchase: "Achat de formule",
      assistant_handoff: "Assistant",
      manual: "Manuel",
    },
    status: {
      new: "Nouveau",
      in_progress: "En cours",
      closed: "Clos",
    },
    toCheck: "Paiement à vérifier",
    since: (wait: string) => `Depuis ${wait}`,
    nobody: "Personne",
    noProperty: "Sans bien",
    openLabel: (subject: string) => `Ouvrir le dossier « ${subject} »`,
    empty: {
      title: "Aucun dossier",
      text: "Aucun dossier ne correspond à ce filtre.",
      search: (query: string) => `Aucun dossier ne correspond à « ${query} ».`,
      searchOpen: (query: string) =>
        `Aucun dossier ouvert ne correspond à « ${query} ». Il est peut-être clos.`,
      searchClosed: "Chercher dans les dossiers clos",
      action: "Voir les dossiers ouverts",
    },
    error: "Les dossiers n'ont pas pu être chargés.",
    retry: "Réessayer",
    back: "Tous les dossiers",
    detail: {
      info: "Informations",
      account: "Compte",
      property: "Bien",
      plan: "Formule",
      source: "Origine",
      opened: "Ouvert le",
      followed: "Suivi par",
      deletedAccount: "Compte supprimé",
      aiSummary: "Résumé de l'assistant",
      toCheckTitle: "Paiement à vérifier",
      toCheckText:
        "Une note automatique signale un paiement à vérifier : lisez-la avant d'écrire au vendeur.",
      notes: "Notes internes",
      notesNote: "Lues par l'équipe seulement, jamais par le vendeur.",
      notesEmpty: "Aucune note pour l'instant.",
      automatic: "Leenkey, automatique",
      noteField: "Nouvelle note",
      noteSubmit: "Ajouter la note",
      tasks: "Tâches de Leenkey",
      tasksLead: (step: string) => `Étape en cours : ${step}.`,
      tasksEmpty: "Aucune tâche de Leenkey à cette étape.",
      noSale: "Ce dossier n'est rattaché à aucun bien : pas d'étape ni de tâche.",
      steps: "Étapes de la vente",
      stepState: {
        done: "Terminée",
        current: "En cours",
        next: "À venir",
      },
      history: "Historique",
      historyEmpty: "Aucune action pour l'instant.",
      error: "Ce dossier n'a pas pu être chargé.",
    },
    actions: {
      label: "Décisions sur le dossier",
      start: "Prendre en charge",
      close: "Clore le dossier",
      reopen: "Rouvrir le dossier",
      follow: "Suivre ce dossier",
      unfollow: "Ne plus suivre",
    },
    history: {
      status: (from: string, to: string) => `Statut : ${from} → ${to}`,
      followed: (name: string) => `Suivi par ${name}`,
      followedSelf: "Suit le dossier",
      unfollowed: "Plus suivi",
      note: "Note ajoutée",
      taskDone: (title: string) => `Tâche cochée : ${title}`,
      taskUndone: (title: string) => `Tâche décochée : ${title}`,
      other: "Modifié",
      by: (name: string) => `par ${name}`,
    },
    result: {
      started: "Dossier pris en charge.",
      closed: "Dossier clos.",
      reopened: "Dossier rouvert.",
      followed: "Vous suivez ce dossier.",
      unfollowed: "Vous ne suivez plus ce dossier.",
      noted: "Note ajoutée.",
      taskDone: "Tâche cochée.",
      taskUndone: "Tâche décochée.",
    },
    errors: {
      invalid: "La note doit faire de 1 à 4\u00A0000 caractères.",
      invalidChange: "Cette modification n'est pas possible : rechargez la page.",
      conflict: "Ce dossier a déjà changé : rechargez la page.",
      notFound: "Ce dossier n'existe plus.",
      forbidden: "Cette action est réservée à l'équipe Leenkey.",
      unavailable: "La modification n'a pas pu être enregistrée. Réessayez.",
      network:
        "Pas de réponse du serveur : la modification a peut-être été enregistrée. Rechargez la page avant de recommencer.",
    },
  },
  // L1-30c: the reports of the back office (SPEC-V2 section 17). The
  // reported conversation is read in full here, each reading traced.
  adminReports: {
    metaTitle: "Signalements · Back office · Leenkey",
    detailMetaTitle: (label: string) => `${label} · Signalements · Back office · Leenkey`,
    title: "Signalements",
    summary: {
      open: (count: number) =>
        `${count}\u00A0${count > 1 ? "signalements ouverts" : "signalement ouvert"}`,
      closed: (count: number) => `${count}\u00A0clos`,
    },
    filters: {
      label: "Statut des signalements",
      open: "Ouverts",
      closed: "Clos",
    },
    table: {
      label: "Signalements",
      reason: "Motif",
      by: "Signalé par",
      target: "Concerne",
      listing: "Annonce",
      received: "Reçu",
    },
    limited: (count: number) => `Les ${count}\u00A0premiers signalements sont affichés.`,
    by: (name: string) => `Par ${name}`,
    about: (name: string) => `concerne ${name}`,
    someone: "un compte supprimé",
    deleted: "Compte supprimé",
    noListing: "Sans annonce",
    openLabel: (reason: string) => `Ouvrir le signalement « ${reason} »`,
    empty: {
      openTitle: "Aucun signalement ouvert",
      openText: "Les conversations signalées par les utilisateurs arrivent ici.",
      closedTitle: "Aucun signalement clos",
      closedText: "Les signalements traités restent ici, avec leur suite.",
    },
    error: "Les signalements n'ont pas pu être chargés.",
    retry: "Réessayer",
    back: "Tous les signalements",
    detail: {
      title: (reference: string | null) =>
        reference ? `Signalement · ${reference}` : "Signalement",
      reason: "Motif du signalement",
      reporter: "Signalé par",
      target: "Concerne",
      listing: "Annonce",
      received: "Reçu le",
      closed: "Clos le",
      open: "Ouvert",
      suspended: "Compte suspendu",
      deleted: "Compte supprimé",
      team: "Un compte de l'équipe ne s'avertit ni ne se suspend.",
      conversation: "Conversation signalée",
      conversationNote:
        "Vous lisez cette conversation dans le cadre du signalement : votre lecture est enregistrée dans l'historique.",
      conversationEmpty: "Aucun message dans cette conversation.",
      seller: "vendeur",
      buyer: "acquéreur",
      from: (name: string, role: string) => `${name}, ${role}`,
      system: "Message automatique",
      history: "Historique",
      historyEmpty: "Aucune action pour l'instant.",
      error: "Ce signalement n'a pas pu être chargé.",
      warned: "Averti le",
      historyError: "L'historique n'a pas pu être chargé.",
    },
    actions: {
      label: "Décisions sur le signalement",
      warn: (name: string | null) => (name ? `Avertir ${name}` : "Avertir l'autre partie"),
      resolve: "Clore le signalement",
    },
    warnDialog: {
      title: "Avertir l'utilisateur",
      text: "Il reçoit ce message par email, avec le rappel qu'un nouveau manquement peut suspendre son compte. Rien ne change sur son compte.",
      reason: "Message envoyé à l'utilisateur",
      hint: "Au moins 3\u00A0caractères, envoyé tel quel.",
      confirm: "Envoyer l'avertissement",
    },
    // Provisional wording, to be validated by Cédric (Q74).
    warnTemplates: [
      "Merci de rester courtois dans vos échanges.",
      "La messagerie ne sert ni au démarchage ni à la publicité.",
      "Ne demandez ni paiement ni coordonnées bancaires dans la messagerie.",
    ],
    resolveDialog: {
      title: "Clore le signalement",
      text: "Indiquez la suite donnée : elle reste dans l'historique. Personne n'est prévenu.",
      reason: "Suite donnée",
      hint: "Au moins 3\u00A0caractères, gardé dans l'historique.",
      confirm: "Clore le signalement",
    },
    resolveTemplates: [
      "Sans suite : rien d'anormal dans l'échange.",
      "Utilisateur averti.",
      "Compte suspendu.",
    ],
    history: {
      actions: {
        "report.read": "Conversation lue",
        "report.warn": "Utilisateur averti",
        "report.resolve": "Signalement clos",
      } as Record<string, string>,
      other: "Modifié",
      by: (name: string) => `par ${name}`,
      reason: (reason: string) => `« ${reason} »`,
    },
    result: {
      resolved: "Signalement clos.",
      warned: "Avertissement enregistré.",
      emailSent: "L'utilisateur est prévenu par email.",
      emailFailed: "L'email n'a pas pu partir : prévenez l'utilisateur autrement.",
    },
    errors: {
      invalid: "Le texte doit faire au moins 3\u00A0caractères.",
      conflict:
        "Ce signalement est déjà clos, ou personne ne peut être averti : rechargez la page.",
      notFound: "Ce signalement n'existe plus.",
      forbidden: "Cette action est réservée à l'équipe Leenkey.",
      unavailable: "La décision n'a pas pu être enregistrée. Réessayez.",
      network:
        "Pas de réponse du serveur : la décision a peut-être été enregistrée. Rechargez la page avant de recommencer.",
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
      // A decision on the account itself (suspension, warning): seller or buyer.
      whyAccount: "Vous recevez cet email parce que vous avez un compte sur Leenkey.",
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
      // The way to contest a decision of moderation (DSA, article 17; /signalement).
      contest: {
        before: "Si vous n'êtes pas d'accord avec cette décision, écrivez-nous à ",
        after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
      },
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
    // L1-30a: an account suspended by the back office (SPEC-V2 17, « suspension
    // du compte (motif, email) »). Provisional text, as the listing one (Q71).
    // L1-26: a plan paid; the full summary of the order comes with L1-40.
    planActivated: {
      // The summary of the order, on a durable medium (L1-40, SPEC 11).
      subject: (plan: string, property: string) =>
        `Confirmation de votre souscription Leenkey · ${plan} · ${property}`,
      title: (plan: string) => `Votre formule ${plan} est activée`,
      text: (plan: string, property: string) =>
        `Merci : votre formule ${plan} est active pour votre bien ${property}.`,
      ordered: (plan: string, amount: string, property: string, date: string) =>
        `Votre formule ${plan}, au prix de ${amount} TTC pour le bien ${property}, a été souscrite le ${date}.`,
      orderedUpgrade: (plan: string, amount: string, property: string, date: string) =>
        `Votre passage à la formule ${plan}, au prix de ${amount} TTC pour le bien ${property}, a été souscrit le ${date}.`,
      duration: (until: string) =>
        `Durée du contrat : 12 mois, jusqu'au ${until}, sans renouvellement automatique. À l'échéance, votre bien repasse en Autonomie : votre annonce reste en ligne.`,
      includes: "Ce que comprend votre formule",
      terms: (cgu: string, cgv: string) =>
        `Vous avez accepté nos conditions générales d'utilisation (version du ${cgu}) et de vente (version du ${cgv}), à relire à tout moment :`,
      cgv: "conditions générales de vente",
      cgu: "conditions générales d'utilisation",
      withdrawalTitle: "Votre droit de rétractation",
      withdrawal: (date: string, email: string) =>
        `Vous pouvez renoncer à votre formule, sans motif, jusqu'au ${date} inclus : depuis votre espace (« Renoncer au contrat », sur la page de votre formule), par email à ${email}, ou avec le formulaire ci-dessous. Nous vous remboursons au plus tard 14 jours après votre demande, par le moyen de paiement utilisé, sans frais.`,
      withdrawalEarly:
        "Vous avez demandé que les prestations commencent avant la fin de ce délai : en cas de rétractation, un montant proportionnel aux prestations déjà fournies peut rester dû.",
      formTitle: "Formulaire de rétractation",
      form: (address: string, plan: string, reference: string, date: string) => [
        `À l'attention de ${address}.`,
        "Je vous notifie par la présente ma rétractation du contrat de prestation de services ci-dessous :",
        `Formule souscrite : ${plan}`,
        `Référence du bien : ${reference}`,
        `Commandée le : ${date}`,
        "Nom et prénom : ____________________",
        "Adresse : ____________________",
        "Adresse électronique : ____________________",
        "Date : ____________________",
        "Signature (uniquement sur papier) : ____________________",
      ],
      mediator: (name: string) => `Médiateur de la consommation : ${name}.`,
      mediatorPending: "Médiateur de la consommation : en cours de désignation.",
      paid: (amount: string) => `Montant payé : ${amount} TTC, une seule fois, pour ce bien.`,
      contactNow: "Votre conseiller Leenkey vous contacte sous 24\u00A0h.",
      contactLater: (date: string) =>
        `Votre conseiller Leenkey vous contacte à partir du ${date}, après le délai de rétractation de 14\u00A0jours.`,
      receipt: "Le reçu et la facture de votre paiement vous sont envoyés par email.",
      action: "Voir ma formule",
    },
    // L1-40: the acknowledgment of a withdrawal, to the seller.
    withdrawalReceived: {
      subject: (plan: string) => `Accusé de réception de votre rétractation · formule ${plan}`,
      title: "Votre rétractation est bien reçue",
      text: (at: string, plan: string, property: string, ordered: string) =>
        `Nous avons reçu le ${at} votre demande de rétractation pour la formule ${plan} (bien ${property}), souscrite le ${ordered}.`,
      replaced: (plan: string, ordered: string) =>
        `Elle comprend la formule ${plan}, souscrite le ${ordered} puis remplacée, encore dans son délai.`,
      refund: (amount: string) =>
        `Nous vous remboursons ${amount} TTC au plus tard 14 jours après votre demande, par le moyen de paiement utilisé lors de la commande, sans frais.`,
      early:
        "Vous aviez demandé un démarrage immédiat des prestations : un montant proportionnel à ce qui a déjà été fourni peut être retenu. Nous vous l'indiquons avant le remboursement.",
      contact: (email: string) => `Pour toute question : ${email}.`,
      action: "Voir ma formule",
    },
    // L1-40: withdrawals to refund, to the team (grouped).
    withdrawalsToProcess: {
      subject: (count: number, plan: string, property: string) =>
        count > 1
          ? `${count}\u00A0rétractations à rembourser`
          : `Rétractation à rembourser · formule ${plan} · ${property}`,
      title: (count: number) =>
        count > 1 ? `${count}\u00A0rétractations à rembourser` : "Une rétractation à rembourser",
      text: "À rembourser depuis Stripe sous 14 jours : le remboursement met fin à la formule. Une note est dans le dossier du bien.",
      item: (plan: string, property: string, amount: string, at: string) =>
        `Formule ${plan} · ${property} · ${amount} TTC payés · demande du ${at}`,
      early: "démarrage immédiat demandé : un montant proportionnel peut être retenu",
      action: "Voir les dossiers",
    },
    // L1-40: a plan ending within 30 days, to its owner.
    planEnding: {
      subject: (plan: string, date: string) => `Votre formule ${plan} se termine le ${date}`,
      title: (plan: string) => `Votre formule ${plan} se termine bientôt`,
      text: (plan: string, property: string, date: string) =>
        `Votre formule ${plan} pour votre bien ${property} prend fin le ${date}.`,
      after:
        "Sans renouvellement, votre bien repasse en Autonomie : votre annonce reste en ligne et vous gardez tous les outils ; l'accompagnement de votre conseiller s'arrête.",
      renew: (email: string) =>
        `Pour la renouveler 12 mois au tarif en vigueur, ou choisir l'autre formule, répondez à cet email ou écrivez-nous à ${email}.`,
      action: "Voir ma formule",
    },
    planPurchased: {
      subject: (plan: string, property: string, upgrade: boolean) =>
        upgrade ? `Passage à ${plan} · ${property}` : `Formule ${plan} souscrite · ${property}`,
      title: (upgrade: boolean) =>
        upgrade ? "Passage à une formule supérieure" : "Nouvelle formule souscrite",
      text: (plan: string, property: string, upgrade: boolean) =>
        upgrade
          ? `Le vendeur de ${property} passe à ${plan}.`
          : `Le vendeur de ${property} a souscrit la formule ${plan}.`,
      details: (seller: string, amount: string) => `${seller} · ${amount} TTC payés.`,
      earlyStart: "Démarrage immédiat demandé : premier contact sous 24\u00A0h.",
      lateStart:
        "Pas de démarrage immédiat : premier contact à partir du 15e\u00A0jour, après le délai de rétractation.",
      heldSubject: (plan: string, property: string) =>
        `Paiement de la formule ${plan} à vérifier · ${property}`,
      heldTitle: "Paiement à vérifier",
      heldText: (plan: string, property: string) =>
        `Le vendeur de ${property} a payé la formule ${plan} : elle n'est pas activée, la commande est à vérifier. Écrivez-lui sous 24\u00A0h pour l'activer ou la rembourser.`,
      check: "À vérifier :",
      action: "Voir les dossiers",
    },
    // L1-30c: a warning after a report. Provisional wording, to be validated by Cédric (Q74).
    userWarned: {
      subject: "Un message de l'équipe Leenkey",
      title: "Un rappel de l'équipe Leenkey",
      text: "Un de vos échanges sur Leenkey nous a été signalé. Merci de tenir compte de ce message de l'équipe.",
      reason: "Message de l'équipe",
      next: "En cas de nouveau manquement, votre compte pourra être suspendu.",
      contest: {
        before: "Si vous n'êtes pas d'accord, écrivez-nous à ",
        after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
      },
    },
    // L1-30c: reports, to the team (cron of L1-22, grouped).
    reportsToReview: {
      subject: (count: number, reference: string | null) =>
        count > 1
          ? `${count}\u00A0conversations signalées`
          : reference
            ? `Conversation signalée (${reference})`
            : "Conversation signalée",
      title: (count: number) =>
        count > 1 ? "Des conversations ont été signalées" : "Une conversation a été signalée",
      text: (count: number) =>
        count > 1
          ? `${count}\u00A0conversations ont été signalées.`
          : "Un utilisateur a signalé une conversation.",
      reason: "Motif",
      action: (count: number) => (count > 1 ? "Voir les signalements" : "Voir le signalement"),
    },
    // 2026-11-08: the accounts confirmed since the last email, to the team (cron of L1-22, grouped).
    accountsCreated: {
      subject: (count: number) =>
        count > 1 ? `${count}\u00A0nouveaux comptes sur Leenkey` : "Nouveau compte sur Leenkey",
      title: (count: number) => (count > 1 ? "De nouveaux comptes" : "Un nouveau compte"),
      text: (count: number) =>
        count > 1
          ? `${count}\u00A0personnes ont confirmé leur adresse email et créé leur compte.`
          : "Une personne a confirmé son adresse email et créé son compte.",
      action: (count: number) => (count > 1 ? "Voir les comptes" : "Voir le compte"),
    },
    accountSuspended: {
      subject: "Votre compte Leenkey est suspendu",
      title: "Votre compte est suspendu",
      text: "Vous pouvez toujours vous connecter, mais votre compte ne permet plus de publier une annonce, d'envoyer un message ni d'utiliser l'assistant pour le moment.",
      reason: "Motif",
      contest: {
        before: "Si vous n'êtes pas d'accord, écrivez-nous à ",
        after: " : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
      },
    },
  },
  // L1-26: the plan of a property and its payment (SPEC-V2 8.8 and 11,
  // DESIGN.md 12.4). The texts of the plans come from the plans table.
  billing: {
    metaTitle: "Choisir ma formule · Leenkey",
    header: "Choisir ma formule",
    back: "Retour à ma vente",
    // Under the steps of « Ma vente ».
    entry: "Voir les formules",
    title: "Un forfait fixe par bien. Jamais de commission.",
    lead: "Le prix ne dépend pas de la valeur de votre bien. Vous pouvez passer à une formule supérieure à tout moment.",
    property: (name: string) => `Pour ${name}`,
    /** `total`: all the properties of the seller, this one included. */
    otherProperties: (total: number) =>
      total > 2 ? `Choisir un autre de vos ${total}\u00A0biens` : "Choisir votre autre bien",
    otherPropertiesLabel: "Vos autres biens",
    free: "Gratuit",
    taxes: "TTC",
    badge: "Le plus complet",
    current: "Formule actuelle",
    activeSince: (since: string, until: string) => `Active depuis le ${since}, jusqu'au ${until}.`,
    included: "Comprise dans votre formule",
    choose: (plan: string) => `Choisir ${plan}`,
    upgrade: (plan: string, price: string) => `Passer à ${plan} pour ${price}`,
    reassurance:
      "Paiement sécurisé par carte via Stripe. Reçu envoyé par email. Forfait payé une fois, pour ce bien. Sans abonnement.",
    sold: "Ce bien est vendu : il n'y a plus de formule à choisir.",
    noProperty: {
      title: "Aucun bien pour l'instant",
      text: "Une formule se choisit pour un bien : créez d'abord votre annonce.",
      action: "Créer mon annonce",
    },
    closed: {
      title: "Les formules payantes ouvrent bientôt",
      text: "Pour être accompagné dès maintenant, écrivez-nous : nous vous répondons sous 48\u00A0h, 7\u00A0j/7.",
      action: "Nous écrire",
    },
    error: "Les formules n'ont pas pu être chargées.",
    retry: "Réessayer",
    recap: {
      title: "Récapitulatif de votre commande",
      plan: "Formule",
      property: "Bien",
      price: "Prix",
      priceValue: (price: string) => `${price} TTC, payé une fois`,
      upgradeValue: (price: string, from: string) =>
        `${price} TTC : la différence avec ${from}, déjà payée`,
      duration: "Durée",
      durationValue:
        "12 mois à partir du paiement, renouvelables à l'échéance, jamais automatiquement. Sans renouvellement, votre bien repasse en Autonomie.",
      withdrawal: "Rétractation",
      withdrawalValue: "Vous pouvez renoncer au contrat pendant 14 jours après la commande.",
      mediator: "Médiateur de la consommation",
      mediatorPending: "En cours de désignation.",
      includes: "Ce qui est compris",
      terms: {
        before: "J'ai lu et j'accepte les ",
        cgu: "conditions générales d'utilisation",
        and: " et les ",
        cgv: "conditions générales de vente",
        after: (cgu: string, cgv: string) => ` (versions du ${cgu} et du ${cgv}).`,
      },
      earlyStart:
        "Je demande que les prestations commencent avant la fin du délai de rétractation de 14 jours.",
      earlyStartHelp:
        "Sans cette demande, votre conseiller vous contacte à partir du 15e jour. Vous pouvez renoncer au contrat pendant 14 jours dans tous les cas.",
      pay: (price: string) => `Commander et payer ${price} TTC`,
      change: "Changer de formule",
      termsRequired: "Cochez la case pour accepter les conditions générales.",
    },
    errors: {
      session: "Votre session a expiré. Reconnectez-vous pour commander.",
      suspended:
        "Votre compte est suspendu : il ne permet pas de commander une formule pour le moment.",
      invalid: "Cochez la case pour accepter les conditions générales.",
      termsChanged:
        "Les conditions générales viennent d'être mises à jour : rechargez la page pour lire la nouvelle version avant de payer.",
      notFound: "Ce bien n'existe plus.",
      sold: "Ce bien est vendu : il n'y a plus de formule à choisir.",
      current: "Cette formule est déjà la vôtre pour ce bien.",
      withdrawn:
        "Votre rétractation est en cours : il n'est pas possible de commander une autre formule pour ce bien d'ici le remboursement.",
      lower: "Votre formule actuelle comprend déjà celle-ci.",
      closed: "Les formules payantes ne sont pas encore ouvertes à la commande.",
      unavailable:
        "Le paiement n'est pas disponible pour le moment. Réessayez dans quelques minutes.",
      network: "Pas de réponse du serveur : rien n'a été débité. Réessayez.",
    },
    cancelled: "Le paiement a été annulé : rien n'a été débité.",
    // L1-40: « Renoncer au contrat » during the 14 days (SPEC 11).
    withdrawal: {
      title: "Droit de rétractation",
      text: (date: string) =>
        `Vous pouvez renoncer à votre formule, sans motif, jusqu'au ${date} inclus. Nous vous remboursons sous 14 jours.`,
      early:
        "Vous avez demandé que les prestations commencent avant la fin de ce délai : un montant proportionnel à ce qui a déjà été fourni peut rester dû.",
      action: "Renoncer au contrat",
      dialogTitle: "Renoncer à votre formule ?",
      dialogText: (plan: string, property: string, date: string) =>
        `Formule ${plan} pour ${property}, souscrite le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé lors de la commande.`,
      dialogEmail: (email: string) => `Un accusé de réception part à ${email}.`,
      dialogName: (name: string) => `Au nom de ${name}.`,
      dialogReplaced: (plan: string, date: string) =>
        `Votre formule ${plan}, souscrite le ${date} puis remplacée, est encore dans son délai : elle est comprise dans cette rétractation.`,
      confirm: "Confirmer la rétractation",
      labels: { back: "Retour", close: "Fermer", cancel: "Annuler" },
      done: (date: string) =>
        `Rétractation enregistrée le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé ; un accusé de réception vous a été envoyé par email.`,
      doneNoEmail: (date: string, email: string) =>
        `Rétractation enregistrée le ${date}. Nous vous remboursons sous 14 jours, par le moyen de paiement utilisé. L'accusé de réception n'a pas pu partir par email : cette page en tient lieu, et vous pouvez le demander à ${email}.`,
      withdrawnNote:
        "Votre rétractation est en cours : il n'est pas possible de commander une autre formule pour ce bien d'ici le remboursement.",
      errors: {
        session: "Votre session a expiré. Reconnectez-vous pour renoncer au contrat.",
        over: "Le délai de rétractation de 14 jours est passé. Pour toute question, écrivez-nous à contact.leenkey@gmail.com.",
        notInForce: "Cette formule n'est plus en vigueur : la rétractation ne s'applique plus.",
        unavailable:
          "La rétractation n'a pas pu être enregistrée. Réessayez, ou écrivez-nous à contact.leenkey@gmail.com.",
      },
    },
    confirmation: {
      pendingTitle: "Paiement en cours de confirmation",
      pendingText: "Stripe nous confirme votre paiement : cela prend quelques secondes.",
      slowText:
        "La confirmation prend plus de temps que prévu. Ne relancez pas le paiement : vous recevrez un email dès qu'elle arrive. Vous pouvez aussi recharger la page.",
      heldTitle: "Paiement reçu",
      heldText:
        "Nous vérifions votre commande avant d'activer la formule : l'équipe Leenkey vous écrit sous 24\u00A0h.",
      reload: "Recharger la page",
      doneTitle: "C'est activé.",
      doneNow: (plan: string) =>
        `Votre formule ${plan} est active. Votre conseiller Leenkey vous contacte sous 24\u00A0h.`,
      doneLater: (plan: string, date: string) =>
        `Votre formule ${plan} est active. Votre conseiller Leenkey vous contacte à partir du ${date}, après le délai de rétractation.`,
      back: "Retour à ma vente",
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
  // L1-25: the buyer home and their buying project (SPEC-V2 8.9, DESIGN.md 12.10).
  buyerSpace: {
    home: {
      description: "Des biens vendus directement par leurs propriétaires. Sans frais d'agence.",
      error: "Une partie de votre espace n'a pas pu être chargée.",
      lastSearch: {
        title: "Reprendre votre dernière recherche ?",
        reading: "Votre dernière recherche, en cours de lecture",
        any: "Tous les biens",
        resume: "Reprendre",
        fresh: "Nouvelle recherche",
        newCount: (count: number) =>
          count >= 20
            ? "20 nouveaux biens et plus"
            : count > 1
              ? `${count} nouveaux biens`
              : "1 nouveau bien",
      },
      start: {
        title: "Trouvez le bien qui vous ressemble",
        text: "Parcourez les biens à vendre et gardez vos préférés d'un cœur.",
        action: "Voir les biens",
      },
      file: {
        label: "Pour vous",
        title: "Votre dossier fait la différence auprès des vendeurs",
        count: (done: number, total: number) => `${done}/${total}`,
        countLabel: (done: number, total: number) =>
          done > 1 ? `${done} étapes sur ${total} faites` : `${done} étape sur ${total} faite`,
        heading: "Votre dossier acquéreur",
        items: {
          project: "Votre projet et vos villes",
          financing: "Votre financement déclaré",
        },
        states: { done: "Fait", current: "À faire maintenant", todo: "À faire" },
        text: "Un vendeur répond plus volontiers à un acquéreur dont le projet est clair. Il voit le statut de votre dossier ; vos montants n'apparaissent que dans les offres que vous envoyez.",
        complete: "Compléter mon dossier",
        edit: "Modifier mon projet",
      },
      favorites: {
        title: "Vos favoris",
        all: (count: number) => (count > 1 ? `Voir les ${count} favoris` : "Voir mon favori"),
        empty: "Pas encore de favori. Le cœur d'une annonce l'ajoute ici.",
      },
      conversations: {
        title: "Vos conversations",
        all: "Toutes les conversations",
        empty: "Pas encore de conversation. Écrivez au vendeur depuis une annonce.",
      },
      services: {
        title: "Nos services",
        valuation: "Valoriser mon bien",
      },
    },
    profile: {
      metaTitle: "Mon projet d'achat · Leenkey",
      title: "Mon projet d'achat",
      back: "Espace acquéreur",
      formTitle: "Votre recherche et votre financement",
      status: "Votre dossier de financement",
      declaredRule:
        "Projet, budget, apport et besoin de prêt renseignés : votre dossier passe à « Informations déclarées ».",
      note: "Le vendeur voit le statut de votre dossier de financement (déclaré, justificatif fourni, justificatif vérifié). Il ne voit ni votre justificatif ni les montants de votre profil. Les montants figurent uniquement dans les offres que vous choisissez d'envoyer.",
      project: "Votre projet",
      projects: {
        residence_principale: "Résidence principale",
        residence_secondaire: "Résidence secondaire",
        investissement: "Investissement",
      },
      cities: "Villes recherchées",
      citiesHelp: "Séparez les villes par une virgule, 20 au plus.",
      budget: "Budget maximum",
      downPayment: "Apport personnel",
      loan: "Financement",
      loanOptions: { yes: "Avec prêt", no: "Sans prêt" },
      loanAmount: "Montant du prêt",
      situation: "Votre situation",
      situationHelp: (count: string, max: string) =>
        `Facultatif, ${count} sur ${max} caractères. Par exemple : couple, un enfant, CDI tous les deux.`,
      save: "Enregistrer",
      saved: "Votre projet est enregistré.",
      errors: {
        amount: "Indiquez un montant en euros, sans centimes.",
        cities: "20 villes au plus, de 80 caractères chacune.",
        situation: "280 caractères au plus.",
        generic: "Votre projet n'a pas pu être enregistré. Réessayez dans un instant.",
        signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
        loadError: "Votre projet n'a pas pu être chargé.",
      },
    },
  },
  // SPEC-V2 section 4, word for word, wherever a seller sees a status.
  financingMention:
    "Leenkey vérifie la présence et la cohérence apparente des justificatifs transmis. Leenkey ne garantit ni l'obtention du financement ni la solvabilité de l'acquéreur.",
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
  // L1-16: maps of Google Maps, loaded without a click since L1-63
  // (DECISIONS 2026-10-28).
  maps: {
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
    // L1-61, in the way of Airbnb: the row of categories under the bar, each
    // a filter pressed or not (the type, the garden alone, the parking).
    categories: {
      label: "Catégories de biens",
      all: "Tous les biens",
      maison: "Maisons",
      appartement: "Appartements",
      jardin: "Avec jardin",
      parking: "Avec parking",
      terrain: "Terrains",
    },
    // The active filters under the categories on a phone (L1-61): one press removes one.
    chips: {
      label: "Filtres actifs",
      remove: (label: string) => `Retirer le filtre ${label}`,
      outdoor: "Extérieur",
      elevator: "Ascenseur",
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
      rooms: "Pièces",
      priceUpTo: (price: string) => `Jusqu'à ${price}`,
      roomsAtLeast: (rooms: number) => (rooms === 1 ? "1 pièce et +" : `${rooms} pièces et +`),
      // The rounded bar of direction C (DECISIONS 2026-10-26): a name above its value.
      where: "Où\u00A0?",
      budgetTitle: "Budget",
      // The panels of the bar (L1-61): the budget is applied with « Appliquer ».
      apply: "Appliquer",
      clear: "Effacer",
      presets: "Budgets courants",
      typeAll: "Tous les biens",
      any: "Indifférent",
    },
    dialog: {
      title: "Filtres",
      close: "Fermer les filtres",
      radius: (place: string) => `Rayon autour de ${place}`,
      radiusTown: "Ville seule",
      type: "Type de bien",
      budgetMin: "Budget minimum",
      budgetMax: "Budget maximum",
      // The thumbs of the slider: the group « Fourchette de budget » names them.
      thumbMin: "Minimum",
      thumbMax: "Maximum",
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
      outdoor: "Extérieur",
      outdoorHelp: "Les biens qui ont au moins l'un des extérieurs choisis.",
      equipment: "Équipements",
      parking: "Parking",
      elevator: "Ascenseur",
      minAboveMax: "Le maximum doit être supérieur ou égal au minimum.",
      tooHigh: "Montant trop élevé : 1 000 000 000 € au plus.",
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
      open: "Carte",
      close: "Liste",
      /** Name of a price pill: its text first (WCAG 2.5.3), then what the card says. */
      pill: (label: string, summary: string, place: string) => `${label}, ${summary}, ${place}`,
      preview: "Bien choisi sur la carte",
      closePreview: "Fermer l'aperçu",
      zoomIn: "Zoom avant",
      zoomOut: "Zoom arrière",
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
    // L1-60, in the way of Airbnb: the actions beside the title, over the
    // mobile photo; the type and the place, the facts in one line; the seller;
    // the strong points, from the data of the listing only.
    share: {
      label: "Partager",
      copied: "Lien de l'annonce copié.",
      error: "Le lien n'a pas pu être copié. Copiez l'adresse de la page.",
    },
    overview: (kind: string, place: string) => `${kind} ${place}`,
    host: {
      title: (firstName: string) => `Proposé par ${firstName}`,
      unknown: "Proposé par le propriétaire",
      owner: "Propriétaire",
    },
    highlights: {
      label: "Points forts",
      commission: {
        title: "Sans commission d'agence",
        text: "Vous achetez directement au propriétaire.",
      },
      garden: "Jardin",
      terrace: "Terrasse",
      balcony: "Balcon",
      outdoorText: "Un espace extérieur avec le bien.",
      parking: { title: "Parking", text: "Stationnement avec le bien." },
      elevator: {
        title: "Ascenseur",
        text: (floor: string) => `${floor} étage, immeuble avec ascenseur.`,
      },
      energy: {
        title: (dpe: string) => `Classe énergie ${dpe}`,
        text: "Diagnostic de performance énergétique (DPE).",
      },
      newBuild: {
        title: "Logement neuf",
        text: (year: number | null) => (year ? `Construit en ${year}.` : "Un bien neuf."),
      },
    },
    summary: {
      rooms: (rooms: number) => (rooms === 1 ? "1 pièce" : `${rooms} pièces`),
    },
    // L1-16: the area of the listing, never its address (docs/DESIGN.md 8).
    map: {
      title: "Où se situe le bien",
      region: "Carte du secteur du bien",
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
      // The button over the desktop mosaic (L1-60).
      all: "Afficher toutes les photos",
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
      // The first ones, then all of them in a dialog (L1-60).
      all: (count: number) => `Afficher les ${count} caractéristiques`,
      close: "Fermer",
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
      // The mobile bar, beside the price (L1-60).
      contactShort: "Contacter",
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
  // The assistant (L1-28, SPEC-V2 section 12, DESIGN.md 10.5 and 12).
  assistant: {
    name: "Assistant Leenkey",
    metaTitle: "Assistant · Leenkey",
    open: "Ouvrir l'assistant Leenkey",
    close: "Fermer l'assistant",
    newConversation: "Nouvelle conversation",
    thread: "Conversation avec l'assistant",
    you: "Vous",
    intro:
      "Posez vos questions sur votre vente : les étapes, votre annonce, vos contacts. L'assistant peut aussi modifier la description ou le prix de votre annonce, toujours après votre confirmation.",
    suggestionsLabel: "Exemples de questions",
    suggestions: [
      "Que dois-je faire maintenant ?",
      "Améliore la description de mon annonce",
      "Combien de personnes ont vu mon annonce ?",
    ],
    disclaimer: "L'assistant peut se tromper : vérifiez les informations importantes.",
    howItWorks: "Comment fonctionne l'assistant",
    field: "Votre question",
    send: "Envoyer",
    writing: "L'assistant écrit…",
    reading: "L'assistant consulte votre dossier…",
    // The actions to confirm (ConfirmActionCard).
    action: {
      descriptionTitle: "Modifier la description de l'annonce",
      priceTitle: "Modifier le prix de l'annonce",
      property: (name: string) => `Bien : ${name}`,
      before: "Actuellement",
      after: "Proposé",
      valuation: (value: string) => `Analyse de valeur : ${value}`,
      gap: (gap: string) => `Écart avec l'analyse de valeur : ${gap}`,
      unknown: "L'assistant propose une modification de votre annonce.",
      confirm: "Confirmer",
      cancel: "Annuler",
      states: {
        confirmed: "Modification enregistrée.",
        declined: "Modification annulée : rien n'a changé.",
        superseded: "Proposition non confirmée : rien n'a changé.",
        error: "La modification n'a pas pu être faite : rien n'a changé.",
      },
    },
    errors: {
      unavailable: "L'assistant ne répond pas pour le moment. Réessayez dans quelques instants.",
      refused:
        "L'assistant ne peut pas répondre à cette demande. Un conseiller Leenkey peut vous aider.",
      quota:
        "Vous avez atteint la limite de messages de l'assistant pour aujourd'hui. Elle se renouvelle à minuit. Besoin d'aide maintenant ? Écrivez à un conseiller.",
      quotaAction: "Écrire à un conseiller",
      auth: "Votre session a expiré. Reconnectez-vous pour continuer.",
      conditions:
        "Acceptez les conditions d'utilisation mises à jour pour continuer : rechargez la page.",
      cut: "La réponse de l'assistant a été interrompue. Reformulez votre question si besoin.",
      retry: "Réessayer",
    },
    // The suggestions (L1-29, AssistantSuggestion): a reply in the messaging,
    // a description at the price step. Nothing is sent nor saved by them.
    suggestion: {
      replyTitle: "Réponse suggérée par l'assistant",
      descriptionTitle: "Proposition de l'assistant",
      suggestReply: "Suggérer une réponse",
      draftDescription: "Rédiger avec l'assistant",
      writing: "L'assistant rédige…",
      use: "Utiliser",
      edit: "Modifier",
      dismiss: "Ignorer",
      nothing: "Il n'y a pas encore de message de l'acquéreur auquel répondre.",
    },
    comingTitle: "L'assistant de l'espace acquéreur arrive",
    comingSoon: "Il vous aidera dans vos recherches et vos démarches d'achat.",
    back: "Retour à Ma vente",
    unavailable:
      "Votre conversation avec l'assistant n'a pas pu être lue. Réessayez dans quelques instants.",
  },
  // The assistant of the public site (DECISIONS.md 2026-11-07): a visitor
  // without an account, helped to choose a plan and to subscribe.
  visitorAssistant: {
    open: "Une question ?",
    title: "Assistant Leenkey",
    close: "Fermer l'assistant",
    newConversation: "Nouvelle conversation",
    thread: "Conversation avec l'assistant Leenkey",
    you: "Vous",
    name: "Assistant Leenkey",
    intro:
      "Bonjour. Je réponds à vos questions sur Leenkey et je vous aide à choisir la formule adaptée à votre vente, puis à la souscrire.",
    suggestionsLabel: "Questions fréquentes",
    suggestions: [
      "Est-ce vraiment gratuit ?",
      "Quelle formule me convient ?",
      "Comment souscrire à une formule ?",
    ],
    next: {
      label: "Pour avancer",
      valuation: "Valoriser mon bien",
      plans: "Voir les formules",
      signUp: "Créer mon compte",
    },
    disclaimer:
      "Réponses générales, sans avis juridique. N'écrivez pas d'informations personnelles.",
    howItWorks: "Comment fonctionne l'assistant",
    field: "Votre question",
    send: "Envoyer",
    writing: "L'assistant écrit…",
    errors: {
      unavailable: "L'assistant ne répond pas pour le moment. Réessayez dans quelques instants.",
      refused:
        "L'assistant ne peut pas répondre à cette question. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
      quota:
        "Vous avez posé le nombre de questions possible pour aujourd'hui. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
      busy: "L'assistant est très sollicité aujourd'hui. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
      cut: "La réponse de l'assistant a été interrompue. Reformulez votre question si besoin.",
      contact: "Nous écrire",
    },
  },
  // Public site in V2 (lib/i18n/site.ts).
  site,
} as const;
