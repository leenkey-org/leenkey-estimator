// Texts of the interface, part « adminListings » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-19: back office v0 of the listings (SPEC-V2 section 17, DESIGN.md 12.12, 12.13).

import { of } from "./helpers";

export const frAdminListings = {
  metaTitle: "Annonces · Back office · Leenkey",
  detailMetaTitle: (reference: string) => `${reference} · Annonces · Back office · Leenkey`,
  title: "Annonces",
  summary: {
    pending: (count: number) => `${count}\u00A0en attente de validation`,
    published: (count: number) => `${count}\u00A0en ligne`,
    suspended: (count: number) =>
      count <= 1 ? `${count}\u00A0suspendue` : `${count}\u00A0suspendues`,
  },
  filters: {
    label: "Statut des annonces",
    all: "Toutes",
  },
  limited: (count: number) =>
    `Les ${count}\u00A0premières annonces sont affichées : précisez la recherche ou le filtre.`,
  outOfZone: "Hors zone",
  search: {
    label: "Rechercher une annonce",
    placeholder: "Référence, ville ou vendeur",
    submit: "Rechercher",
  },
  table: {
    label: "Annonces",
    property: "Bien",
    seller: "Vendeur",
    price: "Prix",
    plan: "Formule",
    received: "Reçue",
    status: "Statut",
  },
  notReceived: "Pas envoyée",
  // L1-30d: the pre-analysis, computed by rules (not by the assistant).
  review: {
    column: "Pré-analyse",
    title: "Pré-analyse",
    ok: "Conforme",
    check: "À vérifier",
    unavailable: "Pré-analyse indisponible",
    okSentence: (facts: string[]) => `Rien à signaler : ${facts.join(", ")}.`,
    checkSentence: (issues: string[]) => `À vérifier : ${issues.join(", ")}.`,
    issues: {
      dpe: "DPE manquant ou plus valable",
      dpeExemption: "exemption de DPE à vérifier",
      photos: (count: number, min: number) =>
        count === 0
          ? "aucune photo"
          : `${count}\u00A0photo${count > 1 ? "s" : ""} sur ${min} conseillées`,
      priceHigh: (gap: number) => `prix ${gap}\u00A0% au-dessus de l'analyse de valeur`,
      priceLow: (gap: number) => `prix ${Math.abs(gap)}\u00A0% sous l'analyse de valeur`,
      description: (length: number) =>
        length === 0 ? "pas de description" : `description courte (${length}\u00A0caractères)`,
    },
    facts: {
      price: (gap: number) =>
        `prix cohérent avec l'analyse de valeur (${gap > 0 ? "+" : gap < 0 ? "−" : ""}${Math.abs(gap)}\u00A0%)`,
      noValue: "sans analyse de valeur pour comparer le prix",
      photos: (count: number) => `${count}\u00A0photos`,
      dpe: "DPE renseigné",
      noDpe: "sans DPE à fournir",
    },
    detail: {
      completeness: "Complétude",
      photos: "Photos",
      photosValue: (count: number, min: number) => `${count} (${min} conseillées)`,
      description: "Description",
      descriptionValue: (length: number, min: number) =>
        `${length}\u00A0caractères (${min} au moins conseillés)`,
      price: "Prix et analyse de valeur",
      priceValue: (gap: number, value: string) =>
        `${gap > 0 ? "+" : gap < 0 ? "−" : ""}${Math.abs(gap)}\u00A0% par rapport à ${value}`,
      noValue: "Pas d'analyse de valeur pour ce bien",
      dpe: "DPE",
      dpeValue: {
        ok: "Renseigné et valable",
        missing: "Manquant ou plus valable",
        exempt: "Non soumis selon le vendeur : motif à vérifier",
        none: "Sans DPE à fournir",
      },
      note: (gap: number) =>
        `Calculée par des règles fixes (photos, description, DPE, écart de prix de plus de ${gap}\u00A0%) : elle aide à décider, elle ne décide pas.`,
    },
    draftClosed: "Cette annonce n'attend plus de décision : rechargez la page.",
  },
  export: "Exporter CSV",
  csv: {
    fileName: (day: string) => `leenkey-annonces-${day}.csv`,
    limited: (count: number) =>
      `Liste coupée aux ${count} premières annonces : précisez la recherche ou le filtre.`,
    header: [
      "Référence",
      "Titre",
      "Statut",
      "Ville",
      "Code postal",
      "Vendeur",
      "Formule",
      "Prix (€)",
      "Reçue le",
      "Publiée le",
      "Pré-analyse",
      "Points à vérifier",
      "Complétude (%)",
      "Écart à l'analyse de valeur (%)",
      "Photos",
      "Lien",
    ],
  },
  empty: {
    title: "Aucune annonce",
    text: "Aucune annonce ne correspond à ce filtre.",
    search: (query: string) => `Aucune annonce ne correspond à « ${query} ».`,
    action: "Voir toutes les annonces",
  },
  error: "Les annonces n'ont pas pu être chargées.",
  retry: "Réessayer",
  open: "Aperçu",
  openLabel: (reference: string) => `Aperçu de l'annonce ${reference}`,
  sellerUnknown: "Vendeur",
  back: "Toutes les annonces",
  detail: {
    seller: "Vendeur",
    plan: "Formule",
    received: "Reçue",
    published: "Publiée le",
    rejection: "Motif du refus",
    suspension: "Motif de la suspension",
    // L1-65: to read before publishing.
    dpeExemption: "Non soumis au DPE, selon le vendeur",
    dpeExemptionToCheck: "Non soumis au DPE, selon le vendeur : motif à vérifier avant de publier",
    dpeMissing:
      "Le DPE de cette annonce manque ou n'est plus valable : elle ne peut pas être publiée. Refusez-la avec le motif « Une information obligatoire manque ».",
    preview: "Aperçu de l'annonce",
    history: "Historique",
    historyEmpty: "Aucune décision pour l'instant.",
    publicPage: "Voir la page publique",
  },
  // L1-66: the DPE of a listing against the register of ADEME.
  dpe: {
    title: (number: string) => `DPE n° ${number} au registre de l'ADEME`,
    register: "Ouvrir l'observatoire DPE de l'ADEME",
    validUntil: (date: string) => `Valable jusqu'au ${date}.`,
    field: "Information",
    entered: "Saisi par le vendeur",
    registered: "Registre de l'ADEME",
    energyClass: "Classe énergie",
    climateClass: "Classe climat",
    date: "Date du DPE",
    energyUse: "Consommation",
    emissions: "Émissions",
    postalCode: "Code postal",
    kwh: "kWh/m²/an",
    kg: "kg CO₂/m²/an",
    none: "Non renseigné",
    differs: "(différent de la saisie)",
    caption: "Saisie du vendeur et enregistrement du DPE à l'ADEME",
    otherProperty:
      "Ce DPE est enregistré à l'ADEME pour un autre code postal : c'est peut-être celui d'un autre bien. À vérifier avec le vendeur avant de publier.",
    expired: (date: string) =>
      `Pour l'ADEME, ce DPE n'est plus valable depuis le ${date} : demandez un DPE à jour au vendeur, ou refusez l'annonce.`,
    same: "La saisie du vendeur correspond au registre de l'ADEME.",
    different:
      "La saisie diffère du registre de l'ADEME. Un DPE actualisé en 2024 ou en 2026 a une nouvelle étiquette : demandez au vendeur son attestation avant de publier, ou refusez l'annonce.",
    kindDiffers: {
      logement:
        "Ce numéro est celui d'un DPE de logement, l'annonce déclare un local professionnel (DPE tertiaire) : à corriger avant de publier.",
      tertiaire:
        "Ce numéro est celui d'un DPE tertiaire (local professionnel), l'annonce déclare un logement : à corriger avant de publier.",
    },
    unknown: (number: string) =>
      `Le DPE n° ${number} n'est pas dans les données ouvertes de l'ADEME. Un DPE récent y arrive sous quelques jours : vérifiez le numéro sur l'observatoire, ou demandez le DPE au vendeur.`,
    unavailable: (number: string) =>
      `Le registre de l'ADEME ne répond pas : vérifiez le DPE n° ${number} sur l'observatoire.`,
    pending: (number: string) => `Vérification du DPE n° ${number} au registre de l'ADEME…`,
  },
  history: {
    actions: {
      "listing.publish": "Validée et publiée",
      "listing.reject": "Refusée",
      "listing.suspend": "Suspendue",
      "listing.unsuspend": "Remise en ligne",
    } as Record<string, string>,
    other: "Modifiée",
    by: (name: string) => `par ${name}`,
    reason: (reason: string) => `Motif : ${reason}`,
    // L1-66: the motive of an exemption of DPE read at the publication.
    dpeExemption: (reason: string) => `Non soumis au DPE, motif vérifié : ${reason}`,
  },
  actions: {
    label: (reference: string) => `Décisions sur l'annonce ${reference}`,
    publish: "Valider et publier",
    reject: "Refuser avec motif",
    suspend: "Suspendre",
    unsuspend: "Remettre en ligne",
    // Mobile cards (AdminAnnonces): the motive is asked in the dialog anyway.
    publishShort: "Valider",
    rejectShort: "Refuser",
  },
  reasonDialog: {
    rejectTitle: "Refuser l'annonce",
    rejectText: "Le vendeur reçoit ce motif par email, corrige son annonce et nous la renvoie.",
    suspendTitle: "Suspendre l'annonce",
    suspendText:
      "L'annonce n'est plus visible des acquéreurs. Le vendeur reçoit ce motif par email ; il ne peut pas la remettre en ligne lui-même.",
    templates: "Motifs fréquents",
    reason: "Motif envoyé au vendeur",
    reasonHint: "Au moins 3 caractères, envoyé tel quel.",
    cancel: "Annuler",
    back: "Retour",
    close: "Fermer",
    confirmReject: "Refuser l'annonce",
    confirmSuspend: "Suspendre l'annonce",
  },
  // Provisional wording, to be validated by Cédric (DECISIONS 2026-10-17).
  rejectTemplates: [
    "La description est incomplète : précisez l'état du bien, ses pièces et ses points forts.",
    "Le prix ne correspond pas au bien décrit : vérifiez-le ou expliquez-le dans la description.",
    "Une information obligatoire manque : classe énergie (DPE), surface ou nombre de pièces.",
    "L'annonce contient des coordonnées personnelles : retirez-les, les échanges passent par la messagerie Leenkey.",
  ],
  suspendTemplates: [
    "Un signalement d'acquéreur est en cours de vérification.",
    "Des informations de l'annonce semblent inexactes.",
    "Le bien semble déjà vendu ou n'est plus disponible.",
    "Le contenu de l'annonce ne respecte pas nos conditions d'utilisation.",
  ],
  result: {
    published: "Annonce publiée.",
    rejected: "Annonce refusée.",
    suspended: "Annonce suspendue.",
    unsuspended: "Annonce remise en ligne.",
    emailSent: "Le vendeur est prévenu par email.",
    emailTest: "Email envoyé à la boîte de test (hors production).",
    emailLogged: "Email non envoyé : environnement local.",
    emailFailed: "L'email au vendeur n'a pas pu partir : prévenez-le autrement.",
  },
  errors: {
    invalid: "Le motif doit faire au moins 3 caractères.",
    conflict:
      "Cette annonce a changé de statut entre-temps : la page montre maintenant son statut.",
    notFound: "Cette annonce n'existe plus.",
    forbidden: "Cette action est réservée à l'équipe Leenkey.",
    unavailable: "La décision n'a pas pu être enregistrée. Réessayez.",
    // L1-65: listing_publish.
    dpe: "Cette annonce n'a pas de DPE valable : elle ne peut pas être publiée. Refusez-la avec le motif « Une information obligatoire manque » : le vendeur le complètera.",
    network:
      "Pas de réponse du serveur : la décision a peut-être été enregistrée. Rechargez la page pour vérifier le statut de l'annonce avant de recommencer.",
    reload: "Recharger la page",
  },
} as const;
