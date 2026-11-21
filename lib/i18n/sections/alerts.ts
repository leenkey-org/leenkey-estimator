// Texts of the interface, part « alerts » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L3-06 (SPEC-V2 16): a search kept under a name, its new listings sent by
// email once a day. « Créer une alerte » on the search page, the page
// /acquereur/alertes.

export const frAlerts = {
  /** « 3 / 5 ». */
  count: (count: number, max: number) => `${count}\u00A0/\u00A0${max}`,
  countLabel: (count: number, max: number) =>
    count === 0
      ? `Aucune alerte sur ${max} possibles`
      : count === 1
        ? `1 alerte sur ${max} possibles`
        : `${count} alertes sur ${max} possibles`,
  create: {
    button: "Créer une alerte",
    title: "Créer une alerte",
    description:
      "Nous vous envoyons un email, une fois par jour au plus, quand de nouveaux biens correspondent à cette recherche.",
    criteria: "Critères",
    name: "Nom de l'alerte",
    confirm: "Créer l'alerte",
    doneTitle: "Votre alerte est créée",
    done: (name: string) =>
      `« ${name} » est enregistrée. Vous recevrez par email les nouveaux biens qui correspondent, une fois par jour au plus.`,
    manage: "Gérer mes alertes",
    errors: {
      auth: "Votre session a expiré. Reconnectez-vous.",
      invalid: "Donnez un nom à votre alerte (80 caractères au plus).",
      limit: (max: number) =>
        `Vous avez déjà ${max} alertes. Supprimez-en une depuis « Mes alertes » pour en créer une nouvelle.`,
      unavailable: "Ça n'a pas fonctionné. Réessayez.",
    },
  },
  dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
  page: {
    metaTitle: "Mes alertes",
    title: "Mes alertes",
    intro:
      "Chaque alerte garde une recherche. Nous vous envoyons par email, une fois par jour au plus, les nouveaux biens qui lui correspondent.",
    back: "Mon espace",
    loadError: "Vos alertes n'ont pas pu être chargées. Rechargez la page.",
    list: "Alertes",
    empty: {
      title: "Aucune alerte pour l'instant",
      text: "Lancez une recherche, puis choisissez « Créer une alerte » : nous vous prévenons par email des nouveaux biens.",
      action: "Chercher un bien",
    },
    full: (max: number) =>
      `Vous avez ${max} alertes, le maximum. Supprimez-en une pour en créer une nouvelle.`,
    emailsOff: "Les emails de vos alertes sont désactivés : vous ne recevez aucun email.",
    emailsOffAction: "Les réactiver",
    homeLink: "Mes alertes",
    criteriaUnknown: "Critères à redéfinir",
    see: "Voir les biens",
    seeAbout: (name: string) => `Voir les biens de l'alerte ${name}`,
    activeAbout: (name: string) => `Alerte active : ${name}`,
    on: "Active",
    off: "En pause",
    rename: "Renommer",
    renameAbout: (name: string) => `Renommer l'alerte ${name}`,
    renameTitle: "Renommer l'alerte",
    renameDescription: "Ce nom vous sert à reconnaître l'alerte dans vos emails.",
    renameConfirm: "Enregistrer",
    delete: "Supprimer",
    deleteAbout: (name: string) => `Supprimer l'alerte ${name}`,
    deleteTitle: "Supprimer cette alerte ?",
    deleteDescription: (name: string) =>
      `« ${name} » sera supprimée : vous ne recevrez plus ses emails. Vos autres alertes ne changent pas.`,
    deleteConfirm: "Supprimer l'alerte",
    errors: {
      auth: "Votre session a expiré. Reconnectez-vous.",
      invalid: "Donnez un nom à votre alerte (80 caractères au plus).",
      not_found: "Cette alerte n'existe plus. Rechargez la page.",
      unavailable: "Ça n'a pas fonctionné. Réessayez.",
    },
  },
} as const;
