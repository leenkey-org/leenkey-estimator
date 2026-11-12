// Texts of the public site, part « contact » (lib/i18n/site.ts gathers them; P-06).
// Contact form of the site (V1 form, /api/contact unchanged).

export const frSiteContact = {
  motif: "Motif de votre demande",
  motifPlaceholder: "Choisissez",
  // Values read by /api/contact (lib/legacy-api/contact.ts).
  motifs: [
    { value: "Vendeur", label: "Je veux vendre mon bien (question)" },
    { value: "Investisseur", label: "Je souhaite investir dans Leenkey" },
    { value: "Partenaire", label: "Je suis un partenaire (notaire, conseiller…)" },
    { value: "Presse", label: "Contact presse / médias" },
    { value: "Autre", label: "Autre demande" },
  ],
  firstName: "Prénom",
  lastName: "Nom",
  email: "Email",
  phone: "Téléphone",
  message: "Votre message",
  submit: "Envoyer ma demande",
  note: "Vos données restent confidentielles · Réponse sous 48 h, 7 j/7 par un conseiller",
  privacy: "Politique de confidentialité",
  sent: {
    title: "Votre demande de contact a bien été envoyée",
    text: "Merci ! Nous revenons vers vous sous 48 h, 7 j/7. Un email de confirmation vient d'être envoyé à l'adresse indiquée.",
  },
  failed: "Erreur d'envoi. Réessayez ou contactez-nous par email.",
  // Past 5 messages an hour from the same address (L1-38).
  tooMany:
    "Trop de messages envoyés depuis votre connexion. Réessayez plus tard ou écrivez-nous par email.",
  errors: {
    motif: "Choisissez le motif de votre demande.",
    required: "À renseigner pour envoyer votre demande.",
    email: "Cet email n'est pas valide.",
    tooLong: "Ce texte est trop long.",
  },
} as const;
