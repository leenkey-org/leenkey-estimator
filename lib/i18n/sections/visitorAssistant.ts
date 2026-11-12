// Texts of the interface, part « visitorAssistant » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// The assistant of the public site (DECISIONS.md 2026-11-07): a visitor
// without an account, helped to choose a plan and to subscribe.

export const frVisitorAssistant = {
  open: "Une question ?",
  title: "Assistant Leenkey",
  close: "Fermer l'assistant",
  newConversation: "Nouvelle conversation",
  thread: "Conversation avec l'assistant Leenkey",
  you: "Vous",
  name: "Assistant Leenkey",
  intro:
    "Bonjour. Je réponds à vos questions sur Leenkey et je vous aide à choisir la formule adaptée à votre vente, puis à la souscrire.",
  suggestionsLabel: "Questions fréquentes",
  suggestions: [
    "Est-ce vraiment gratuit ?",
    "Quelle formule me convient ?",
    "Comment souscrire à une formule ?",
  ],
  next: {
    label: "Pour avancer",
    valuation: "Valoriser mon bien",
    plans: "Voir les formules",
    signUp: "Créer mon compte",
  },
  disclaimer: "Réponses générales, sans avis juridique. N'écrivez pas d'informations personnelles.",
  howItWorks: "Comment fonctionne l'assistant",
  field: "Votre question",
  send: "Envoyer",
  writing: "L'assistant écrit…",
  errors: {
    unavailable: "L'assistant ne répond pas pour le moment. Réessayez dans quelques instants.",
    refused:
      "L'assistant ne peut pas répondre à cette question. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
    quota:
      "Vous avez posé le nombre de questions possible pour aujourd'hui. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
    busy: "L'assistant est très sollicité aujourd'hui. Écrivez-nous : nous vous répondons sous 48 h, 7 j/7.",
    cut: "La réponse de l'assistant a été interrompue. Reformulez votre question si besoin.",
    contact: "Nous écrire",
  },
} as const;
