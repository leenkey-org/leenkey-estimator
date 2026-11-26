// Texts of the interface, part « favorites » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-18: favourites.

export const frFavorites = {
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
  // Named lists of favourites (DECISIONS.md 2026-11-26).
  lists: {
    nav: "Listes de favoris",
    all: "Tous",
    none: "Sans liste",
    create: "Nouvelle liste",
    createTitle: "Nouvelle liste",
    createText:
      "Donnez un nom à votre liste : une ville, un quartier, « À visiter ». Vous y rangez ensuite vos favoris.",
    createConfirm: "Créer la liste",
    nameLabel: "Nom de la liste",
    nameHelp: (max: number) => `${max}\u00A0caractères au plus.`,
    rename: "Renommer",
    renameTitle: "Renommer la liste",
    renameText: (name: string) => `Choisissez le nouveau nom de la liste « ${name} ».`,
    renameConfirm: "Enregistrer",
    remove: "Supprimer la liste",
    removeTitle: (name: string) => `Supprimer la liste « ${name} » ?`,
    removeText:
      "Les biens de cette liste restent dans vos favoris : vous les retrouvez dans « Tous ».",
    dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
    errors: {
      required: "Donnez un nom à la liste.",
      tooLong: (max: number) => `Le nom ne peut pas dépasser ${max}\u00A0caractères.`,
      duplicate: "Vous avez déjà une liste de ce nom.",
      limit: (max: number) =>
        `Vous avez déjà ${max}\u00A0listes. Supprimez-en une pour en créer une nouvelle.`,
      missing: "Cette liste n'existe plus. Actualisez la page.",
      unavailable: "La liste n'a pas pu être enregistrée. Réessayez.",
      removeUnavailable: "La liste n'a pas pu être supprimée. Réessayez.",
    },
    created: (name: string) => `La liste « ${name} » est créée.`,
    renamed: (name: string) => `La liste s'appelle maintenant « ${name} ».`,
    removed: (name: string) =>
      `La liste « ${name} » est supprimée. Ses biens restent dans vos favoris.`,
    // Beside the menu of a card, for the eye.
    moveShort: "Liste",
    moveProperty: (property: string) => `Ranger dans une liste : ${property}`,
    moved: (name: string) => `Rangé dans « ${name} ».`,
    unfiled: "Retiré de sa liste.",
    moveError: "Le bien n'a pas pu être rangé. Réessayez.",
    moveMissing: "Ce favori ou cette liste n'existe plus. Actualisez la page.",
    emptyListTitle: "Cette liste est vide",
    emptyListText: "Rangez-y un bien depuis « Tous », avec le menu « Liste » sous chaque bien.",
    emptyNoneTitle: "Tous vos favoris sont rangés",
    emptyNoneText: "Chacun de vos favoris est dans une liste.",
    seeAll: "Voir tous mes favoris",
  },
} as const;
