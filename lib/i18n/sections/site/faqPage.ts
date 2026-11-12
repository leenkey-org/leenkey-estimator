// Texts of the public site, part « faqPage » (lib/i18n/site.ts gathers them; P-06).
// /faq (L1-42): the invented « 42 jours » left out (DECISIONS 2026-10-19).

// Narrow no-break space of the amounts (docs/DESIGN.md 3.3).
const N = " ";

export const frSiteFaqPage = {
  metaTitle: "Questions fréquentes · Leenkey",
  metaDescription:
    "Prix, accompagnement, sécurité des données, différence avec une agence : les réponses aux questions que se posent les vendeurs.",
  eyebrow: "Questions fréquentes",
  title: "Tout ce que vous vous demandez, sans détour.",
  items: [
    {
      question: "Combien ça coûte, vraiment ?",
      answer: [
        "Leenkey propose ",
        { strong: "trois formules transparentes" },
        " à forfait fixe\u00A0— jamais de commission au pourcentage. La formule ",
        { strong: "Autonomie est gratuite" },
        " : rapport de valeur de votre bien, création et publication de votre annonce avec l'aide de l'IA, messagerie, demandes de visite et réception des offres. Pour être accompagné, la formule ",
        { strong: `Accompagné à 990${N}€ TTC` },
        " et la formule ",
        { strong: `Sérénité à 1${N}500${N}€ TTC` },
        " sont payées ",
        { strong: "à la souscription" },
        ", en une fois, pour 12\u00A0mois d'accompagnement renouvelables.",
      ],
    },
    {
      question: "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
      answer: [
        "Accompagné. Selon votre forfait, un conseiller Leenkey reste joignable à chaque étape : pour valider votre prix, relire une offre, ou répondre à un doute avant la signature. Vous gardez la main, sans jamais rester seul.",
      ],
    },
    {
      question: "Mes données et mes documents sont-ils en sécurité ?",
      answer: [
        "Oui. Vos documents sont chiffrés et hébergés en France, conformément au RGPD. Vous seul décidez de ce qui est partagé, et avec qui. Aucune donnée n'est revendue.",
      ],
    },
    {
      question: "Combien de temps pour vendre ?",
      answer: [
        "Une annonce bien préparée et diffusée en exclusivité fait toute la différence. C'est précisément ce à quoi Leenkey vous aide, étape par étape.",
      ],
    },
    {
      question: "Quelle est la différence avec une agence ?",
      answer: [
        "Une agence facture une commission au pourcentage et gère la vente à votre place. Leenkey vous donne les mêmes outils (valorisation, diffusion, suivi) pour un forfait fixe, avec un conseiller à la demande. Vous gardez le contrôle et l'économie.",
      ],
    },
    {
      question: "Et si je bloque en cours de route ?",
      answer: [
        "Vous n'avancez jamais à l'aveugle. L'assistant Leenkey vous guide à chaque étape : le jargon est expliqué, les démarches détaillées. Avec Accompagné ou Sérénité, votre conseiller vous rappelle généralement sous 24 h. C'est le principe même de Leenkey.",
      ],
    },
  ],
} as const;
