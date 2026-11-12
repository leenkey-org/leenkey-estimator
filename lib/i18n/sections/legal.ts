// Texts of the interface, part « legal » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).

import { aiText, privacyText, reportingText, salesTermsText, termsV2 } from "../legal-policies";
import { legalNotice } from "../legal-texts";

export const frLegal = {
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
} as const;
