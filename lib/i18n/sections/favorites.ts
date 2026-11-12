// Texts of the interface, part « favorites » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-18: favourites.

import { of } from "./helpers";

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
} as const;
