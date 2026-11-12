// Texts of the interface, part « account » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// « Mon compte » (L1-39, SPEC-V2 8.14, DESIGN.md 13.1 G9): the overview in
// rows, then one page per change.

import { of } from "./helpers";

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
    plan: "Ma formule",
    planValue: "Voir ou changer la formule de vos biens",
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
    doneMetaTitle: "Adresse modifiée · Leenkey",
    doneTitle: "Votre adresse email est modifiée",
    doneLead: "Connectez-vous désormais avec votre nouvelle adresse email.",
  },
  errors: {
    session: "Votre session a expiré. Connectez-vous de nouveau.",
  },
} as const;
