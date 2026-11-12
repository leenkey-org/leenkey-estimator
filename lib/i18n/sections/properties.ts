// Texts of the interface, part « properties » (CLAUDE.md section 9; lib/i18n/fr.ts gathers them).
// L1-11: creation of a property in steps (SPEC-V2 section 8.3, DESIGN.md 12.2).

export const frProperties = {
  creation: {
    metaTitle: (step: string) => `${step} · Mon bien · Leenkey`,
    title: "Mon bien",
    leave: "Retour à Ma vente",
    previousStep: "Étape précédente",
    save: "Enregistrer",
    previous: "Précédent",
    next: "Continuer",
    step: (step: number, label: string) => `Étape ${step} sur 4 · ${label}`,
    steps: {
      address: "Adresse",
      characteristics: "Caractéristiques",
      price: "Prix et description",
      preview: "Aperçu",
    },
    error: "L'enregistrement n'a pas pu se faire. Réessayez.",
    signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
    notFound: "Ce bien n'existe plus ou ne peut plus être modifié.",
    loadError: "Votre bien n'a pas pu être chargé.",
    retry: "Réessayer",
  },
  address: {
    title: "Où se trouve votre bien ?",
    lead: "Son adresse exacte n'est jamais publiée : l'annonce montre la commune et une zone approximative.",
    label: "Adresse du bien",
    placeholder: "12 rue de la Gare, Épinay-sur-Orge",
    help: "Tapez le numéro et la rue, puis choisissez l'adresse dans la liste.",
    suggestions: "Adresses proposées",
    searching: "Recherche des adresses…",
    count: (count: number) =>
      count === 1 ? "1\u00A0adresse proposée." : `${count}\u00A0adresses proposées.`,
    noResult: "Aucune adresse trouvée. Vérifiez le numéro et la rue.",
    unavailable: "La recherche d'adresse ne répond pas. Réessayez dans un instant.",
    required: "Choisissez l'adresse dans la liste.",
    chosen: "Adresse choisie",
    chosenStatus: (label: string) => `Adresse choisie : ${label}.`,
    change: "Changer d'adresse",
    notFound: "Cette adresse n'a pas été retrouvée. Choisissez-la de nouveau dans la liste.",
  },
  characteristics: {
    title: "Décrivez votre bien",
    required: "Le type, la surface et le nombre de pièces sont nécessaires pour continuer.",
    requiredLand: "Le type et la surface sont nécessaires pour continuer.",
    photosBusy: "Vos photos sont en cours d'envoi : patientez un instant, puis réessayez.",
    type: "Type de bien",
    typePlaceholder: "Choisir le type",
    surface: "Surface habitable",
    landSurface: "Surface du terrain",
    carrez: "Surface Carrez",
    rooms: "Pièces",
    bedrooms: "Chambres",
    floor: "Étage",
    floorHelp: "0 pour un rez-de-chaussée.",
    floorsTotal: "Étages de l'immeuble",
    levels: "Niveaux",
    buildYear: "Année de construction",
    dpe: "DPE",
    ges: "GES",
    energyClass: (label: string, letter: string) => `${label} classe ${letter}`,
    heating: "Chauffage",
    heatingPlaceholder: "Choisir",
    features: "Atouts",
    featureLabels: {
      balcony: "Balcon",
      terrace: "Terrasse",
      garden: "Jardin",
      parking: "Parking",
      cellar: "Cave",
      elevator: "Ascenseur",
    },
    details: "Charges et copropriété",
    charges: "Charges",
    perMonth: "€ / mois",
    tax: "Taxe foncière",
    perYear: "€ / an",
    lots: "Lots de copropriété",
    // L1-65: the DPE, asked to send the listing for review (Cédric, 2026-11-09).
    energy: {
      legend: "Diagnostic de performance énergétique (DPE)",
      note: "Vous pouvez enregistrer votre annonce sans le DPE. Il est demandé pour l'envoyer en validation : une annonce de vente doit l'afficher.",
      exempt: "Mon bien n'est pas soumis au DPE",
      // L1-66: the DPE taken from the register of ADEME by its number.
      number: "Numéro du DPE",
      numberHelp:
        "13 caractères, en haut de la première page de votre DPE («\u00A0N°\u00A0ADEME\u00A0»). Exemple\u00A0: 2491E0000001A.",
      retrieve: "Récupérer les informations de mon DPE",
      found: (energyClass: string | null, climateClass: string | null, date: string | null) =>
        `Repris du registre de l'ADEME : ${[
          energyClass ? `classe énergie ${energyClass}` : null,
          climateClass ? `classe climat ${climateClass}` : null,
          date ? `DPE du ${date}` : null,
        ]
          .filter(Boolean)
          .join(", ")}. Vérifiez ces informations.`,
      foundCosts:
        "Il reste à indiquer les dépenses annuelles d'énergie : le registre ne les donne pas.",
      otherPostalCode: (postalCode: string) =>
        `Ce DPE est enregistré à l'ADEME pour le code postal ${postalCode}, qui n'est pas celui de votre bien. Vérifiez le numéro.`,
      unknown:
        "Ce numéro n'est pas dans le registre de l'ADEME. Vérifiez-le : un DPE récent y arrive sous quelques jours. Vous pouvez saisir les informations de votre DPE ci-dessous.",
      unavailable:
        "Le registre de l'ADEME ne répond pas pour l'instant. Saisissez les informations de votre DPE ci-dessous, ou réessayez plus tard.",
      kindLocked: (email: string) =>
        `Ce numéro est celui d'un autre type de DPE que celui de votre annonce (logement ou local professionnel). Une fois l'annonce envoyée, le type de DPE se change avec notre équipe : écrivez-nous à ${email}.`,
      premisesNumber:
        "Ce numéro est celui d'un DPE tertiaire, celui d'un local professionnel. Pour un appartement ou une maison, indiquez le DPE du logement ; pour un local, choisissez le type « Autre bien ».",
      kind: "Type de DPE",
      kinds: {
        logement: "DPE d'un logement",
        tertiaire: "DPE tertiaire (local professionnel)",
      },
      energyUse: "Consommation",
      emissions: "Émissions",
      kwh: "kWh/m²/an",
      kg: "kg CO₂/m²/an",
      figuresHelp:
        "La consommation d'énergie et les émissions de gaz à effet de serre de l'étiquette.",
      figuresOptional: "Recommandées pour un local professionnel.",
      energyClass: "Classe énergie (DPE)",
      climateClass: "Classe climat (GES)",
      date: "Date du DPE",
      dateHelp: "Sur le rapport du diagnostiqueur.",
      costs: "Dépenses annuelles d'énergie",
      costMin: "Minimum",
      costMax: "Maximum",
      costHelp: "La fourchette estimée pour un usage standard, telle qu'elle figure sur le DPE.",
      priceYear: "Année des prix",
      priceYearHelp: "Celle des « prix moyens des énergies indexés au 1er janvier », sur le DPE.",
      priceYearPlaceholder: "Choisir",
      reason: "Motif de l'exemption",
      reasonPlaceholder: "Choisir le motif",
      // The motives proposed are read from the base (dpe_exemption_reasons, L1-66).
      otherReason: "Autre motif",
      otherReasonLabel: "Précisez le motif",
      reasonNote: "Nous relisons le motif avant de publier votre annonce.",
      reasonLocked: (email: string) =>
        `Le motif ne change plus une fois l'annonce envoyée. Pour le corriger, écrivez-nous à ${email}.`,
      // The first day and the years of validity of the rule in force (dpe_rules).
      outdated: (from: string | null, years: number) =>
        `Ce DPE n'est plus valable : un DPE doit dater ${from ? `du ${from} au plus tôt et ` : ""}de moins de ${years} ans. Un nouveau DPE sera demandé pour envoyer votre annonce.`,
    },
  },
  errors: {
    required: "À renseigner pour continuer.",
    number: "Saisissez un nombre.",
    outOfRange: "Cette valeur n'est pas possible.",
    carrezAboveSurface: "La surface Carrez ne peut pas dépasser la surface habitable.",
    bedroomsAboveRooms: "Il ne peut pas y avoir plus de chambres que de pièces.",
    floorAboveTotal: "L'étage ne peut pas dépasser le nombre d'étages.",
    roomsAtLeastOne: "Un logement compte au moins une pièce.",
    cents: "Deux chiffres après la virgule au plus.",
    costRange: "Le minimum ne peut pas dépasser le maximum.",
    wholeEuros: "En euros, sans centimes.",
    reasonLength: "Le motif compte au moins 3 caractères.",
    dateFuture: "La date du DPE ne peut pas être dans le futur.",
    dpeNumber: "Le numéro d'un DPE compte 13 caractères, comme 2491E0000001A.",
    dpeNumberPremises:
      "Ce numéro est celui d'un DPE tertiaire (local professionnel) : indiquez le numéro du DPE du logement.",
    dpeNumberHome:
      "Ce numéro est celui d'un DPE de logement : choisissez « DPE d'un logement », ou indiquez le numéro du DPE tertiaire.",
    date: "Saisissez une date valide.",
  } as Record<string, string>,
  photos: {
    title: "Photos",
    count: (count: number, max: number) => `${count} / ${max}`,
    countLabel: (count: number, max: number) =>
      `${count} ${count > 1 ? "photos" : "photo"} sur ${max}`,
    add: "Ajouter des photos",
    full: (max: number) => `${max} photos au maximum`,
    help: "JPEG, PNG ou WebP, 10 Mo au plus. La première photo est la photo principale de l'annonce.",
    hint: "Entrée pour les options de la photo, flèches gauche et droite pour la déplacer.",
    main: "Principale",
    sending: "Envoi…",
    tile: (index: number, total: number, caption: string | null, main: boolean) =>
      [`Photo ${index} sur ${total}`, caption, main ? "photo principale" : null]
        .filter(Boolean)
        .join(", "),
    added: (count: number, max: number) => `Photo ajoutée : ${count} sur ${max}.`,
    moved: (index: number, total: number) =>
      index === 1
        ? `Photo déplacée en position 1 sur ${total} : c'est la photo principale.`
        : `Photo déplacée en position ${index} sur ${total}.`,
    deleted: "Photo supprimée.",
    captionSaved: "Légende enregistrée.",
    errors: {
      format: (name: string) =>
        `« ${name} » : ce format n'est pas accepté. Choisissez une photo JPEG, PNG ou WebP.`,
      tooLarge: (name: string) => `« ${name} » dépasse 10 Mo.`,
      tooSmall: (name: string, long: number, short: number) =>
        `« ${name} » est trop petite : ${long} × ${short} pixels au minimum.`,
      tooHeavy: (name: string) =>
        `« ${name} » est trop lourde, même réduite. Essayez une autre photo.`,
      unreadable: (name: string) => `« ${name} » n'a pas pu être lue. Essayez une autre photo.`,
      full: (name: string, max: number) =>
        `${max} photos au maximum : « ${name} » n'a pas été ajoutée.`,
      unavailable: (name: string) => `« ${name} » n'a pas pu être envoyée. Réessayez.`,
      order: "L'ordre des photos n'a pas pu être enregistré. Réessayez.",
      change: "La photo n'a pas pu être modifiée. Réessayez.",
    },
    sheet: {
      title: (index: number, total: number) => `Photo ${index} sur ${total}`,
      back: "Retour aux caractéristiques",
      close: "Fermer",
      caption: "Légende",
      captionPlaceholder: "Séjour, cuisine, jardin…",
      captionHelp: "Elle décrit la photo pour les personnes qui ne la voient pas.",
      saveCaption: "Enregistrer la légende",
      makeMain: "En faire la photo principale",
      isMain: "C'est la photo principale",
      before: "Déplacer avant",
      after: "Déplacer après",
      delete: "Supprimer la photo",
      confirmDelete: "Supprimer définitivement",
      deleteWarning: "La photo sera supprimée de votre annonce.",
      cancel: "Annuler",
    },
  },
  // L1-13b: a property created from an analysis of value (SPEC-V2 8.3).
  fromEstimation: (date: string) =>
    `Repris de votre analyse de valeur du ${date}. Vérifiez et complétez.`,
  claimingEstimation: "Nous reprenons votre analyse de valeur…",
  // L1-13: step 3 (SPEC-V2 8.3). « Rédiger avec l'assistant » comes with L1-29.
  price: {
    title: "Votre prix et votre annonce",
    price: "Prix de vente",
    priceHelp: "Le prix affiché sur votre annonce.",
    valuation: (date: string | null) =>
      date ? `Votre analyse de valeur du ${date}` : "Votre analyse de valeur",
    valuationValue: (value: string, low: string | null, high: string | null) =>
      low && high ? `${value}, dans une fourchette de ${low} à ${high}.` : `${value}.`,
    gap: (percent: number) =>
      percent === 0
        ? "Votre prix correspond à cette valeur."
        : `Votre prix est ${Math.abs(percent)}\u00A0% ${percent > 0 ? "au-dessus" : "en dessous"} de cette valeur.`,
    listingTitle: "Titre de l'annonce",
    titleHelp: "Proposé d'après votre bien : modifiez-le si vous le souhaitez.",
    description: "Description",
    descriptionPlaceholder:
      "La lumière, l'agencement, les travaux récents, le quartier, les écoles, les transports…",
    count: (count: string, max: string) => `${count} / ${max} caractères`,
    required: "Le prix et la description sont nécessaires pour continuer.",
    priceToSave: "Indiquez le prix pour enregistrer votre annonce.",
    errors: {
      required: "À renseigner pour continuer.",
      price: "Saisissez un prix en euros, sans centimes.",
      priceTooHigh: "Ce prix semble trop élevé : vérifiez le nombre de zéros.",
      titleLength: "Le titre compte de 3 à 120 caractères.",
      descriptionLength: "La description compte 1\u00A0200 caractères au plus.",
    } as Record<string, string>,
  },
  // Step 4: the listing as buyers will see it, then « Envoyer en validation ».
  preview: {
    title: "Aperçu de votre annonce",
    lead: "Voici votre annonce telle que les acquéreurs la verront. Vérifiez-la, puis envoyez-la : nous la relisons sous 24\u00A0h.",
    submit: "Envoyer en validation",
    errors: {
      characteristics:
        "Il manque le type, la surface ou les pièces de votre bien : complétez l'étape 2.",
      listing: "Il manque le prix ou la description : complétez l'étape 3.",
      // L1-65: what listing_submit refuses (property_dpe_issue).
      dpe: {
        dpe_missing:
          "Il manque le DPE de votre bien, ou une partie : numéro, classes énergie et climat, date, consommation et émissions, dépenses d'énergie et année des prix. Une annonce de vente doit l'afficher : complétez l'étape 2.",
        dpe_outdated:
          "Le DPE de votre bien n'est plus valable. Un DPE à jour doit figurer sur votre annonce : complétez l'étape 2.",
        exemption_reason:
          "Indiquez pourquoi votre bien n'est pas soumis au DPE : complétez l'étape 2.",
      },
      notFound: "Cette annonce a déjà été envoyée, ou ne peut plus être modifiée.",
      unavailable: "L'envoi n'a pas pu se faire. Réessayez.",
    },
    fix: "Compléter",
    fixDpe: "Compléter le DPE",
    // A listing refused by Leenkey, corrected through the steps (L1-19).
    rejected: "Votre annonce est à corriger",
    rejectedNext: "Corrigez-la à l'étape qui convient, puis envoyez-la de nouveau.",
  },
  // End of the flow (SPEC-V2 8.3, docs/DESIGN.md 10.8, G8).
  sent: {
    metaTitle: "Annonce envoyée · Leenkey",
    title: "C'est envoyé.",
    text: "Nous relisons votre annonce sous 24\u00A0h et vous prévenons par email.",
    action: "Retour à Ma vente",
    recap: "Votre annonce",
  },
  list: {
    title: "Vos biens",
    create: "Créer mon annonce",
    untitled: "Bien à compléter",
    error: "Vos biens n'ont pas pu être chargés.",
  },
  // L1-14: the page of a property (SPEC-V2 8.3), its tabs and the actions
  // of its status.
  sheet: {
    metaTitle: (name: string) => `${name} · Ma vente · Leenkey`,
    back: "Ma vente",
    reference: (reference: string) => `Réf.\u00A0${reference}`,
    tabs: {
      label: "Rubriques de votre bien",
      infos: "Infos",
      photos: "Photos",
      listing: "Annonce",
      steps: "Étapes",
    },
    pricePerM2: "prix au m²",
    status: {
      draft: {
        title: "Votre annonce n'est pas encore envoyée",
        text: "Reprenez-la là où vous l'avez laissée, puis envoyez-la en validation.",
      },
      pending: {
        title: "Nous relisons votre annonce",
        text: "Nous la relisons sous 24\u00A0h et vous prévenons par email.",
      },
      rejected: {
        title: "Votre annonce est à corriger",
        text: (reason: string) => `Notre remarque : ${reason}`,
      },
      published: {
        title: "Votre annonce est en ligne",
        text: (date: string | null) =>
          date
            ? `Elle est visible de tous les acquéreurs depuis le ${date}.`
            : "Elle est visible de tous les acquéreurs.",
      },
      paused: {
        title: "Votre annonce est en pause",
        text: "Elle n'apparaît plus dans les recherches et sa page n'est plus visible. Remettez-la en ligne quand vous le souhaitez.",
      },
      suspended: {
        title: "Leenkey a suspendu votre annonce",
        text: (reason: string) => `Motif : ${reason}`,
        readOnly:
          "Elle n'est plus visible et reste en lecture seule : vous ne pouvez ni la modifier ni la remettre en ligne vous-même. Pour en parler, écrivez-nous à",
      },
      sold: {
        title: "Votre bien est vendu",
        text: (date: string | null, price: string | null) =>
          `${date ? `Vendu le ${date}` : "Vendu"}${price ? `, au prix de ${price}` : ""}.`,
      },
    },
    actions: {
      label: "Actions sur votre annonce",
      resume: "Reprendre la création",
      fix: "Corriger mon annonce",
      view: "Voir l'annonce en ligne",
      pause: "Mettre en pause",
      publish: "Remettre en ligne",
      sold: "Marquer comme vendu",
      delete: "Supprimer le brouillon",
    },
    soldDialog: {
      title: "Marquer votre bien comme vendu ?",
      text: "L'annonce quitte les recherches et n'est plus visible. Vous ne pourrez pas la remettre en ligne.",
      price: "Prix de vente final",
      priceHelp: "Facultatif. Il reste privé : il n'apparaît sur aucune annonce.",
      confirm: "Marquer comme vendu",
    },
    deleteDialog: {
      title: "Supprimer ce brouillon ?",
      text: "Le bien, ses photos et son annonce en préparation disparaîtront de votre espace. Vous ne pourrez pas les récupérer.",
      confirm: "Supprimer le brouillon",
    },
    dialog: { back: "Retour", close: "Fermer", cancel: "Annuler" },
    done: {
      paused: "Votre annonce est en pause.",
      published: "Votre annonce est de nouveau en ligne.",
      sold: "Votre bien est marqué comme vendu.",
    },
    errors: {
      conflict:
        "Votre annonce a changé entre-temps. La page est à jour : vérifiez-la avant de recommencer.",
      suspended: "Leenkey a suspendu cette annonce : elle est en lecture seule.",
      notFound: "Ce bien n'existe plus.",
      unavailable: "Votre demande n'a pas pu être enregistrée. Réessayez dans un instant.",
      signedOut: "Votre session a pris fin : reconnectez-vous, puis réessayez.",
      price: "Indiquez un prix en euros, sans centimes, ou laissez le champ vide.",
    },
    infos: {
      address: "Adresse",
      addressNote:
        "Votre adresse exacte n'est jamais publiée : l'annonce montre la commune et une zone approximative.",
      characteristics: "Caractéristiques",
      edit: "Modifier",
      editAddress: "Modifier l'adresse",
      editCharacteristics: "Modifier les caractéristiques",
    },
    photos: {
      title: "Photos",
      count: (count: number) =>
        count === 0 ? "Aucune photo" : count === 1 ? "1 photo" : `${count} photos`,
      cover: "Photo principale",
      empty: "Votre bien n'a pas encore de photo.",
    },
    listing: {
      title: "Titre",
      price: "Prix",
      pricePerM2: (amount: string) => `soit ${amount} le m²`,
      description: "Description",
      reference: "Référence",
      empty: "Votre annonce n'est pas encore rédigée.",
      write: "Rédiger mon annonce",
      edit: "Modifier l'annonce",
    },
    loadError: "Votre bien n'a pas pu être chargé.",
    retry: "Réessayer",
  },
  // L1-14b: a listing sent for review, online or paused, changed from the
  // page of its property; it stays as it is.
  edit: {
    metaTitle: (part: string) => `${part} · Modifier votre bien · Leenkey`,
    title: "Modifier votre bien",
    back: "Retour à votre bien",
    cancel: "Annuler",
    save: "Enregistrer",
    parts: { characteristics: "Caractéristiques", listing: "Prix et description" },
    note: {
      pending: "Nous relisons votre annonce : nous tiendrons compte de vos modifications.",
      published:
        "Votre annonce reste en ligne : vos modifications sont visibles dès leur enregistrement.",
      paused:
        "Votre annonce est en pause : vos modifications seront visibles quand vous la remettrez en ligne.",
    },
    saved: {
      pending: "Vos modifications sont enregistrées. Nous en tenons compte dans notre relecture.",
      published: "Vos modifications sont enregistrées et visibles sur votre annonce.",
      paused:
        "Vos modifications sont enregistrées. Elles seront visibles quand vous remettrez votre annonce en ligne.",
    },
    addressLocked:
      "Elle ne change plus une fois l'annonce envoyée. Pour la corriger, écrivez-nous à",
    required: {
      characteristics:
        "Le type, la surface et le nombre de pièces restent nécessaires à votre annonce.",
      land: "Le type et la surface restent nécessaires à votre annonce.",
      listing: "Le prix et la description restent nécessaires à votre annonce.",
      field: "À renseigner.",
      // L1-65: properties_keep_dpe.
      dpe: "Le DPE de votre annonce reste nécessaire : son numéro, ses classes, une date valable, la consommation et les émissions, les dépenses d'énergie d'un logement, ou le motif de l'exemption.",
      dpeExemption: (email: string) =>
        `Une fois l'annonce envoyée, l'exemption du DPE, le type de DPE (logement ou local professionnel) et le passage en terrain passent par notre équipe, qui les relit : écrivez-nous à ${email}.`,
    },
  },
} as const;
