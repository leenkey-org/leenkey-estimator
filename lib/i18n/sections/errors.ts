// Texts of the interface, part « errors » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// A page that does not exist, or that could not be shown (app/not-found.tsx,
// app/error.tsx, app/global-error.tsx; docs/DESIGN.md 13.1).

export const frErrors = {
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
} as const;
