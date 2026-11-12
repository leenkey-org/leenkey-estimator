// Texts of the interface, part « adminAssistant » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-30d: the assistant in the back office (SPEC-V2 17).

export const frAdminAssistant = {
  metaTitle: "Assistant · Back office · Leenkey",
  detailMetaTitle: "Conversation · Assistant · Back office · Leenkey",
  title: "Assistant",
  tabs: {
    label: "Rubriques de l'assistant",
    faq: "Base de connaissances",
    journal: "Journal",
    usage: "Consommation",
  },
  retry: "Réessayer",
  environment: {
    local: "Environnement local",
    staging: "Environnement de préprod",
    production: "Environnement de production",
  } as Record<string, string>,
  faq: {
    summary: (cards: number, missing: number) =>
      missing === 0
        ? `${cards}\u00A0fiches, toutes cherchables par le sens.`
        : `${cards}\u00A0fiches, dont ${missing} pas encore cherchable${missing > 1 ? "s" : ""} par le sens.`,
    embed: "Calculer les fiches manquantes",
    embedding: "Calcul en cours…",
    embedDone: (count: number) =>
      `${count}\u00A0fiche${count > 1 ? "s" : ""} calculée${count > 1 ? "s" : ""} : la base est à jour.`,
    embedMore: (count: number) =>
      `${count}\u00A0fiche${count > 1 ? "s" : ""} calculée${count > 1 ? "s" : ""} ; il en reste : relancez le calcul.`,
    error: "La base de connaissances n'a pas pu être chargée.",
    empty: "Aucune fiche pour l'instant : importez un fichier de la FAQ.",
    list: "Fiches de la base de connaissances",
    toEmbed: "À calculer",
    audience: { seller: "Vendeurs", buyer: "Acquéreurs", both: "Tous" } as Record<string, string>,
    step: (code: string) => `Étape ${code}`,
    search: {
      title: "Recherche test",
      text: "La question telle qu'un vendeur ou un acquéreur la poserait : les 5 fiches que l'assistant lirait, la plus proche d'abord.",
      query: "Question",
      audience: "Posée par",
      audiences: { seller: "un vendeur", buyer: "un acquéreur" },
      submit: "Chercher",
      searching: "Recherche…",
      results: "Fiches trouvées",
      none: "Aucune fiche trouvée.",
      score: (similarity: number) => `Proximité ${similarity.toFixed(2).replace(".", ",")}`,
      invalid: "Écrivez une question de 3 caractères au moins.",
    },
    import: {
      title: "Importer un fichier",
      text: "Un fichier Markdown au format de la FAQ : « ## Question », la ligne « <!-- audience: seller | category: … | step_code: … --> », puis la réponse. Les fiches du même fichier sont mises à jour, celles qui n'y sont plus sont retirées.",
      file: "Fichier .md",
      submit: "Importer",
      importing: "Import en cours…",
      done: (file: string, inserted: number, updated: number, removed: number, unchanged: number) =>
        `${file} : ${inserted} ajoutée${inserted > 1 ? "s" : ""}, ${updated} modifiée${updated > 1 ? "s" : ""}, ${removed} retirée${removed > 1 ? "s" : ""}, ${unchanged} inchangée${unchanged > 1 ? "s" : ""}.`,
      embedLater:
        "Les fiches nouvelles ou modifiées ne sont pas encore cherchables par le sens : relancez le calcul.",
      errors: {
        empty: "Ce fichier ne contient aucune fiche « ## Question ».",
        metadata: (question: string) =>
          `La fiche « ${question} » n'a pas sa ligne « <!-- audience: … | category: … --> ».`,
        fileName: "Ce nom de fichier n'est pas accepté : renommez-le (lettres, chiffres, tirets).",
        invalid:
          "Une fiche est refusée : public inconnu, texte trop long, ou question en double dans une catégorie.",
        tooLarge: "Ce fichier dépasse 300\u00A0Ko.",
        noFile: "Choisissez un fichier .md.",
      },
    },
    errors: {
      auth: "Votre session a expiré : reconnectez-vous.",
      unavailable: "Cela n'a pas fonctionné. Réessayez dans un instant.",
    },
  },
  journal: {
    filters: "Contexte des conversations",
    all: "Toutes",
    contexts: {
      seller: "Vendeurs",
      buyer: "Acquéreurs",
      admin: "Équipe",
      visitor: "Visiteurs",
    } as Record<string, string>,
    context: {
      seller: "Vendeur",
      buyer: "Acquéreur",
      admin: "Équipe",
      visitor: "Visiteur du site",
    } as Record<string, string>,
    kinds: {
      chat: "Conversation",
      reply_suggestion: "Réponse suggérée",
      listing_description: "Description d'annonce",
      rejection_reason: "Motif de refus",
      case_summary: "Synthèse avant appel",
    } as Record<string, string>,
    search: {
      label: "Rechercher dans le journal",
      placeholder: "Mot d'un message, référence, nom",
      submit: "Rechercher",
    },
    list: "Conversations de l'assistant",
    empty: "Aucune conversation ne correspond.",
    error: "Le journal n'a pas pu être chargé.",
    limited: (count: number) =>
      `Les ${count}\u00A0conversations les plus récentes sont affichées : précisez la recherche ou le filtre.`,
    visitor: "Visiteur sans compte",
    noName: "Compte sans nom",
    messages: (count: number) => `${count}\u00A0message${count > 1 ? "s" : ""}`,
    tokens: (input: string, output: string) => `${input} jetons lus · ${output} écrits`,
    noQuestion: "Sans question écrite",
  },
  detail: {
    back: "Journal de l'assistant",
    title: (kind: string) => kind,
    notFound: "Cette conversation n'existe pas ou n'est plus conservée.",
    account: "Compte",
    reference: "Annonce",
    started: "Commencée",
    roles: {
      user: "Question",
      request: "Données envoyées au modèle",
      assistant: "Réponse de l'assistant",
      tool: "Outil",
    },
    tokens: (model: string, input: string, output: string) =>
      `${model} · ${input} jetons lus · ${output} écrits`,
    limited: "Les 300 derniers messages sont affichés.",
    empty: "Aucun message.",
    list: "Messages de la conversation",
  },
  usage: {
    days: (count: number) => `Sur les ${count} derniers jours`,
    answers: "Réponses du modèle",
    input: "Jetons lus",
    output: "Jetons écrits",
    cost: "Coût indicatif",
    costValue: (dollars: number) =>
      `${dollars.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\u00A0$`,
    costUnknown: "—",
    note: "Jetons lus : ceux de la question, plus ceux relus ou mis en cache (prompt et FAQ). Coût calculé sur les tarifs publics des modèles, en dollars, cache compris : une indication, pas une facture. Chaque environnement a sa base : ces chiffres sont ceux de cet environnement.",
    byDay: "Par jour",
    byContext: "Par contexte",
    day: "Jour",
    context: "Contexte",
    model: "Modèle",
    empty: "Aucun appel du modèle sur la période.",
    error: "La consommation n'a pas pu être chargée.",
    table: "Consommation de l'assistant par jour",
    contextTable: "Consommation de l'assistant par contexte",
  },
} as const;
