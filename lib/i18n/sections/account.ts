// Texts of the interface, part « account » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// « Mon compte » (L1-39, SPEC-V2 8.14, DESIGN.md 13.1 G9): the overview in
// rows, then one page per change.

export const frAccount = {
  metaTitle: "Mon compte · Leenkey",
  title: "Mon compte",
  back: "Mon compte",
  sections: {
    identity: "Informations personnelles",
    signIn: "Connexion",
    notifications: "Notifications",
    spaces: "Mes espaces",
    plan: "Formule",
    privacy: "Cookies",
    data: "Mes données",
  },
  rows: {
    name: "Prénom et nom",
    phone: "Téléphone",
    email: "Adresse email",
    password: "Mot de passe",
    passwordValue: "Modifier votre mot de passe",
    notifications: "Emails de Leenkey",
    notificationsValue: "Choisir les emails que vous recevez",
    plan: "Ma formule",
    planValue: "Voir ou changer la formule de vos biens",
    export: "Télécharger mes données",
    exportValue: "Un fichier JSON de ce que contient votre compte",
    delete: "Supprimer mon compte",
    deleteValue: "Fermer le compte, puis effacer vos données",
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
    suspended: "Votre compte est suspendu : aucun espace ne peut y être ajouté.",
  },
  // The deletion of the account (L2-10, SPEC-V2 sections 19 and 21).
  deletion: {
    metaTitle: "Supprimer mon compte · Leenkey",
    title: "Supprimer mon compte",
    lead: "Avant de confirmer, voici ce qui se passe.",
    now: {
      title: "Tout de suite",
      items: [
        "Votre compte est fermé et tous vos appareils sont déconnectés.",
        "Vos annonces sont retirées du site.",
        "Les offres que vous avez envoyées et qui attendent une réponse sont retirées. Celles que vous avez reçues sont refusées, et leurs auteurs sont prévenus.",
        "Vos conversations sont fermées.",
      ],
    },
    later: {
      title: "Au bout de 30 jours",
      items: [
        "Nous effaçons votre nom, votre téléphone, votre projet d'achat, vos photos, vos justificatifs, l'adresse de vos biens, vos favoris, vos conversations avec l'assistant et vos notifications.",
        "Votre adresse email ne permet plus de se connecter. Elle reste liée au compte fermé jusque-là : une nouvelle inscription avec elle n'est possible qu'après ces 30 jours.",
        "La suppression ne s'annule pas, et aucun email ne la confirme : cette page est la dernière étape.",
      ],
    },
    kept: {
      title: "Ce que nous gardons",
      items: [
        "Vos commandes et factures, que la loi nous impose de garder 10 ans.",
        "Les offres d'achat envoyées, telles qu'elles ont été envoyées : elles engagent aussi l'autre partie.",
        "Les messages échangés, que vos interlocuteurs gardent dans leurs conversations.",
        "Vos demandes à l'équipe Leenkey et les conditions que vous avez acceptées.",
        "Les caractéristiques et les prix de vos biens (ville, surface, pièces), sans leur adresse, et vos annonces, sans leur titre ni leur texte.",
      ],
    },
    plan: "La suppression du compte ne rembourse pas une formule payée. Si vous êtes encore dans le délai de rétractation de 14 jours, exercez-le d'abord depuis la page de votre formule.",
    planLink: "Ma formule",
    exportNote: "Vous pouvez d'abord télécharger vos données.",
    password: "Mot de passe",
    confirm:
      "Je comprends que mon compte est fermé tout de suite et que mes données sont effacées au bout de 30 jours.",
    submit: "Supprimer mon compte",
    admin:
      "Un compte de l'équipe Leenkey ne se supprime pas depuis cette page : demandez sa fermeture au gérant de Leenkey.",
    errors: {
      passwordRequired: "Indiquez votre mot de passe.",
      confirmRequired: "Cochez la case pour confirmer.",
      saleInProgress: (email: string) =>
        `Une vente est en cours sur votre compte (une offre acceptée) : vous pourrez le supprimer une fois le bien vendu. Une question ? Écrivez-nous à ${email}.`,
      export: "Vos données n'ont pas pu être préparées. Réessayez dans un instant.",
    },
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
    doneMetaTitle: "Adresse modifiée · Leenkey",
    doneTitle: "Votre adresse email est modifiée",
    doneLead: "Connectez-vous désormais avec votre nouvelle adresse email.",
  },
  errors: {
    session: "Votre session a expiré. Connectez-vous de nouveau.",
  },
} as const;
