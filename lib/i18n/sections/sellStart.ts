// Texts of the interface, part « sellStart » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// « Vendre » (Younes, DECISIONS 2026-10-26): the two ways to start a sale,
// the analysis of value first or the listing straight away.

export const frSellStart = {
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
} as const;
