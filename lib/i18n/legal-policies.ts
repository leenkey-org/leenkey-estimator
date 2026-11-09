// The legal texts of the V2 published on 9 November 2026: CGU (version 2.0),
// CGV, privacy policy, reporting and moderation policy, notice on the
// artificial intelligence. Written from the legal file of 9 October 2026
// (docs/juridique/), completed with the plans worded on 6 November
// (SPEC-V2 11 bis), the list of providers (docs/juridique/prestataires.md)
// and what the site really does; Younes decided they stand for the launch
// instead of the lawyer's reading (DECISIONS.md 2026-11-09, Q34). Part of
// fr.ts (fr.legal). Every change of the CGU, the CGV or the privacy policy
// is a new version (lib/legal/versions.ts, lib/config/sales.ts).

import type { LegalBlock, LegalSection } from "./legal-texts";
import type { Rich } from "./rich";

const EMAIL = "contact.leenkey@gmail.com";
const S = " ";

const p = (...text: Rich): LegalBlock => ({ kind: "p", text });
const para = (text: string): LegalBlock => ({ kind: "p", text: [text] });
const list = (...items: string[]): LegalBlock => ({
  kind: "list",
  items: items.map((item) => [item]),
});
const sub = (text: string): LegalBlock => ({ kind: "subtitle", text });
const email = { link: EMAIL, href: `mailto:${EMAIL}` } as const;
const write = (before: string, after = "."): LegalBlock => ({
  kind: "p",
  text: [before, email, after],
});

const IDENTITY: LegalBlock = {
  kind: "box",
  lines: [
    [
      { strong: "LEENKEY" },
      `, société par actions simplifiée unipersonnelle au capital de 1${S}000${S}€`,
    ],
    [`Siège : 36 rue Pierre Brossolette, 91360 Épinay-sur-Orge, France`],
    [`RCS Évry 107${S}616${S}211 · TVA intracommunautaire FR53${S}107${S}616${S}211`],
    ["Contact : ", email],
  ],
};

// ---------------------------------------------------------------------------
// CGU, version 2.0
// ---------------------------------------------------------------------------

const termsSections: readonly LegalSection[] = [
  {
    id: "champ",
    title: "1. Champ d'application",
    blocks: [
      p(
        "Les présentes conditions générales d'utilisation (CGU) encadrent l'accès au site ",
        { link: "leenkey.fr", href: "https://leenkey.fr" },
        " et l'utilisation de ses services par les visiteurs, les propriétaires vendeurs et les acquéreurs. Elles s'ajoutent aux ",
        { link: "conditions générales de vente", href: "/cgv" },
        ", qui s'appliquent aux formules payantes.",
      ),
      para(
        "Elles restent consultables à tout moment sur cette page. Leur acceptation expresse est demandée à la création d'un compte ; la date et la version acceptées sont enregistrées.",
      ),
    ],
  },
  {
    id: "definitions",
    title: "2. Définitions",
    blocks: [
      list(
        "« Leenkey » : l'éditeur du site, identifié dans les mentions légales.",
        "« Utilisateur » : toute personne qui utilise le site.",
        "« Vendeur » : l'utilisateur propriétaire d'un bien, ou autorisé à le présenter à la vente.",
        "« Acquéreur » : la personne qui consulte des annonces, contacte un vendeur ou lui fait une offre.",
        "« Annonce » : la présentation d'un bien publiée par un vendeur.",
        "« Service » : toute fonctionnalité du site, gratuite ou payante.",
        "« Assistant » : l'assistant fondé sur l'intelligence artificielle qui fournit des réponses ou des suggestions.",
      ),
    ],
  },
  {
    id: "nature",
    title: "3. Nature et périmètre de la plateforme",
    blocks: [
      para(
        "Leenkey propose, selon les fonctionnalités disponibles : une analyse indicative de la valeur d'un bien ; des outils pour préparer le dossier de vente ; la création et la publication d'annonces ; un espace vendeur et un espace acquéreur ; la recherche, les favoris, la messagerie, les demandes de visite, les offres, le partage de documents et le suivi de la vente ; une aide à la compréhension des démarches, par des contenus, un assistant et l'accompagnement d'un conseiller lorsqu'il est prévu par la formule souscrite.",
      ),
      para(
        "Leenkey ne reçoit pas de mandat de vente par l'acceptation des CGU, ne représente ni le vendeur ni l'acquéreur, ne négocie pas et ne formule pas de contre-offre pour leur compte, ne signe aucun document à leur place et ne reçoit ni ne détient les fonds de la vente. Les parties mènent elles-mêmes leurs échanges et prennent elles-mêmes leurs décisions. Cette description ne dispense pas Leenkey du respect de la réglementation applicable à son activité, notamment la loi Hoguet.",
      ),
      para(
        "Les annonces publiées sur Leenkey sont réservées à Leenkey : elles ne sont pas diffusées sur d'autres sites d'annonces.",
      ),
    ],
  },
  {
    id: "acces",
    title: "4. Conditions d'accès",
    blocks: [
      para(
        "La consultation des annonces est libre. La création d'un compte est gratuite et réservée aux personnes majeures et capables, ou agissant valablement pour une personne morale. Les informations d'inscription doivent être exactes.",
      ),
      para(
        "L'utilisateur garde ses identifiants confidentiels et signale sans délai toute utilisation de son compte qu'il n'a pas autorisée. Il ne cède pas son compte et n'utilise ni fausse identité ni identité trompeuse.",
      ),
    ],
  },
  {
    id: "formules",
    title: "5. Formules et prix",
    blocks: [
      p(
        "La formule ",
        { strong: "Autonomie" },
        " est gratuite, sans limite de durée, sans carte bancaire et sans obligation de souscrire une formule payante. Elle comprend l'analyse de valeur du bien, la création et la publication de l'annonce avec l'aide de l'assistant, l'espace de suivi de la vente, la messagerie et la gestion des demandes de visite, la réception des offres, les informations communiquées par les acquéreurs, l'assistant, la checklist et la liste des documents à préparer. Elle ne comprend pas d'accompagnement par un conseiller.",
      ),
      p(
        "Les formules ",
        { strong: "Accompagné" },
        ` (990${S}€ TTC) et `,
        { strong: "Sérénité" },
        ` (1${S}500${S}€ TTC) sont des forfaits fixes par bien, sans commission sur le prix de vente, payés `,
        { strong: "à la souscription" },
        ". Elles couvrent un bien pendant 12 mois, ne sont jamais renouvelées automatiquement et sont régies par les ",
        { link: "conditions générales de vente", href: "/cgv" },
        ", qui précisent leur contenu, leur paiement et le droit de rétractation.",
      ),
      para(
        "Aucune étape essentielle de la vente (publier l'annonce, échanger avec les acquéreurs, organiser les visites, recevoir, accepter ou refuser une offre) n'est réservée aux formules payantes.",
      ),
    ],
  },
  {
    id: "vendeur",
    title: "6. Rôle du vendeur",
    blocks: [
      para(
        "Le vendeur garantit être propriétaire du bien ou disposer des pouvoirs nécessaires pour publier une annonce. Il est seul responsable du contenu de l'annonce, du prix affiché, des diagnostics et des informations obligatoires, de la disponibilité du bien et de la conformité de sa mise en vente. Il met à jour ou retire l'annonce dès qu'elle n'est plus exacte.",
      ),
      para(
        "Il décide seul des personnes avec qui il échange, des visites, des offres et de la vente.",
      ),
    ],
  },
  {
    id: "acquereur",
    title: "7. Rôle de l'acquéreur",
    blocks: [
      para(
        "L'acquéreur donne des informations sincères sur son identité, ses coordonnées, son projet et, s'il le souhaite, son financement. Il n'utilise les informations d'une annonce et de son interlocuteur que pour un projet immobilier réel.",
      ),
      para(
        "Ses demandes de visite et ses offres sont faites en son nom, ou au nom d'une personne qu'il représente valablement. Il répond des conséquences juridiques de ses déclarations et de ses engagements.",
      ),
    ],
  },
  {
    id: "moderation",
    title: "8. Annonces, contenus et modération",
    blocks: [
      para(
        "Chaque annonce est relue par l'équipe Leenkey avant sa publication. Leenkey peut contrôler qu'une annonce est complète et cohérente, et modérer les contenus, avec l'aide d'outils automatiques. Ces contrôles ne valent ni certification de la propriété, ni garantie de l'état du bien, ni vérification complète de sa situation juridique, urbanistique, technique ou financière.",
      ),
      p(
        "Les contenus trompeurs, discriminatoires, frauduleux, contraires aux droits d'autrui ou aux présentes CGU peuvent être refusés, retirés ou suspendus. La procédure de signalement, d'information et de contestation est décrite dans la ",
        { link: "politique de signalement et de modération", href: "/signalement" },
        ".",
      ),
    ],
  },
  {
    id: "echanges",
    title: "9. Échanges, avis consultatifs et visites",
    blocks: [
      para(
        "La messagerie permet aux vendeurs et aux acquéreurs d'échanger directement et d'organiser leurs visites. Dans la limite des prestations prévues, Leenkey peut fournir à l'utilisateur qui le demande des informations factuelles, des synthèses des échanges ou des offres, les points de vigilance à connaître et un avis consultatif, pour l'aider à comprendre sa situation et à décider lui-même.",
      ),
      para(
        "Cet avis ne vaut ni mandat ni intervention au nom d'une partie. Leenkey ne contacte pas l'autre partie pour défendre un prix, ne mène pas de négociation, ne propose pas de contre-offre à la place d'un utilisateur et ne décide pas pour lui. Ses avis et synthèses ne remplacent ni une consultation juridique, ni l'avis d'un notaire, ni une analyse bancaire, ni une expertise.",
      ),
      para(
        "Les demandes et les confirmations de visite relèvent des utilisateurs : Leenkey ne garantit ni la présence, ni la ponctualité, ni le comportement des personnes.",
      ),
    ],
  },
  {
    id: "offres",
    title: "10. Offres d'achat",
    blocks: [
      para(
        "La plateforme peut proposer un outil de saisie, de transmission et de suivi des offres d'achat. Chaque partie relit et valide elle-même ses documents ; Leenkey n'accepte et ne refuse aucune offre à la place d'une partie. Une offre acceptée peut avoir des conséquences juridiques, et les conditions, délais et droits de rétractation propres à un achat immobilier ne sont pas ceux des services Leenkey. Le recours à un notaire est recommandé pour sécuriser la vente.",
      ),
      para(
        "L'outil ne garantit pas la validité ni l'adéquation juridique de chaque offre à une situation particulière. Leenkey ne propose pas de signature électronique : les documents se signent en dehors de la plateforme, sous la responsabilité des parties.",
      ),
    ],
  },
  {
    id: "financement",
    title: "11. Projet et financement de l'acquéreur",
    blocks: [
      para(
        "Les informations sur le budget, l'apport ou le crédit sont déclarées par l'acquéreur. L'indication qu'un justificatif a été fourni signifie seulement qu'il a été reçu ; l'indication qu'il a été vérifié par Leenkey désigne un contrôle de sa présence et de sa cohérence apparente. Aucune de ces indications ne certifie la solvabilité de l'acquéreur, ne vaut décision d'une banque ni ne garantit l'obtention d'un prêt.",
      ),
      para(
        "Leenkey n'est pas intermédiaire en crédit : elle ne recueille ni ne transmet de demande de prêt. Le vendeur voit le statut du financement d'un acquéreur qui l'a contacté, jamais ses montants ni ses justificatifs.",
      ),
    ],
  },
  {
    id: "assistant",
    title: "12. Assistant",
    blocks: [
      p(
        "L'assistant produit des réponses et des suggestions automatiques qui peuvent être incomplètes ou inexactes ; il est toujours présenté comme tel. L'utilisateur vérifie ses propositions avant de s'en servir. Aucun message n'est envoyé et aucune modification n'est faite sans que l'utilisateur l'ait expressément confirmée, et l'assistant ne prend jamais seul de décision sur une offre, un prix ou un compte. Son fonctionnement est décrit sur la page ",
        { link: "Intelligence artificielle", href: "/intelligence-artificielle" },
        ".",
      ),
    ],
  },
  {
    id: "valeur",
    title: "13. Valeur indicative des analyses",
    blocks: [
      para(
        "L'analyse de valeur est une indication automatique, fondée notamment sur les informations fournies et sur les données de ventes publiques disponibles. Elle ne garantit ni un prix de vente, ni un délai de vente, et ne remplace pas une expertise immobilière. Leenkey répond de ses propres obligations et ne s'exonère pas de sa responsabilité en cas de faute qui lui est légalement imputable.",
      ),
    ],
  },
  {
    id: "documents",
    title: "14. Documents et confidentialité des échanges",
    blocks: [
      para(
        "L'utilisateur reste titulaire des droits sur les documents, textes et photos qu'il dépose. Il autorise Leenkey à les héberger, les afficher et les transmettre aux seules personnes concernées par le service, dans les conditions de la politique de confidentialité. Les documents du dossier de vente ne sont visibles par un acquéreur que si le vendeur les lui a partagés.",
      ),
      para(
        "Un utilisateur ne réutilise pas les documents et les coordonnées reçus en dehors du projet pour lequel ils lui ont été communiqués.",
      ),
    ],
  },
  {
    id: "propriete",
    title: "15. Propriété intellectuelle",
    blocks: [
      para(
        "La plateforme, ses marques, ses interfaces et ses contenus propres sont protégés. L'utilisateur dispose d'un droit personnel, non exclusif et non cessible d'accès aux services, pour l'usage prévu. Il lui est interdit de copier massivement les données, d'extraire les annonces, de contourner les protections du site ou de l'exploiter de façon illicite.",
      ),
    ],
  },
  {
    id: "disponibilite",
    title: "16. Disponibilité et maintenance",
    blocks: [
      para(
        "Leenkey fait des efforts raisonnables pour assurer la disponibilité, la maintenance et la sécurité du site. Certains services peuvent être momentanément indisponibles. Les garanties légales, notamment celles des services numériques, restent applicables, et les mises à jour nécessaires au maintien de leur conformité sont fournies dans les conditions prévues par la loi.",
      ),
    ],
  },
  {
    id: "suspension",
    title: "17. Suspension, signalement et clôture",
    blocks: [
      write(
        "L'utilisateur peut demander la clôture de son compte à tout moment, depuis son espace ou en écrivant à ",
        ", sous réserve des obligations contractuelles ou légales encore en cours.",
      ),
      para(
        "Leenkey peut suspendre un service ou un compte en cas de fraude, d'atteinte à la sécurité ou de manquement caractérisé aux présentes CGU, de façon proportionnée, en informant l'utilisateur et en lui indiquant comment contester la décision, sauf lorsque la loi ou la sécurité s'y opposent.",
      ),
    ],
  },
  {
    id: "donnees",
    title: "18. Données personnelles",
    blocks: [
      p(
        "Le traitement des données personnelles est décrit dans la ",
        { link: "politique de confidentialité", href: "/confidentialite" },
        ", et l'usage des cookies dans la ",
        { link: "politique cookies", href: "/cookies" },
        ".",
      ),
    ],
  },
  {
    id: "evolution",
    title: "19. Évolution des CGU",
    blocks: [
      para(
        "Une nouvelle version des CGU est présentée à l'utilisateur à sa connexion suivante, avec sa date d'entrée en vigueur ; il l'accepte pour continuer à utiliser son compte. Elle ne modifie pas rétroactivement les droits d'un consommateur ni les conditions essentielles d'une formule payante en cours.",
      ),
    ],
  },
  {
    id: "responsabilite",
    title: "20. Responsabilité et règlement des différends",
    blocks: [
      para(
        "Leenkey est responsable de ses propres obligations légales et contractuelles ; aucune clause n'écarte la responsabilité qu'une disposition impérative lui impose. L'utilisateur répond des actes qu'il accomplit lui-même.",
      ),
      write("Pour toute réclamation : "),
      para(
        "Les CGU sont soumises au droit français, sous réserve des règles impératives de protection des consommateurs ; les juridictions compétentes sont celles que désigne la loi.",
      ),
    ],
  },
];

export const termsV2 = {
  metaTitle: "Conditions générales d'utilisation · Leenkey",
  title: "Conditions générales d'utilisation",
  updated: "En vigueur depuis le 9 novembre 2026 · Version 2.0",
  toc: "Sommaire",
  contact: "Pour toute question relative à ces CGU, écrivez-nous à",
  sections: termsSections,
} as const;

// ---------------------------------------------------------------------------
// CGV
// ---------------------------------------------------------------------------

const salesSections: readonly LegalSection[] = [
  {
    id: "objet",
    title: "1. Prestataire et objet",
    blocks: [
      IDENTITY,
      para(
        "Leenkey propose aux particuliers des forfaits de services numériques et d'accompagnement pour préparer et mener la vente de leur bien immobilier. Les présentes conditions générales de vente (CGV) fixent les conditions de souscription, d'exécution, de paiement, de rétractation et de réclamation de ces forfaits. Elles complètent les conditions générales d'utilisation.",
      ),
    ],
  },
  {
    id: "mandat",
    title: "2. Absence de mandat et nature du service",
    blocks: [
      para(
        "La souscription n'emporte aucun mandat de vente, aucun pouvoir de représentation et aucune instruction de négocier pour le compte du client. Le vendeur échange directement avec les acquéreurs et reste maître de ses décisions. Leenkey n'encaisse aucune somme liée à la vente immobilière et ne perçoit aucune commission sur le prix de vente. Ses services sont limités aux prestations permises à son activité. La vente du bien n'est pas une obligation de résultat à sa charge.",
      ),
    ],
  },
  {
    id: "formules",
    title: "3. Les formules",
    blocks: [
      sub("Autonomie, gratuite"),
      para(
        "Tous les outils pour gérer sa vente soi-même : rapport de valeur du bien ; création et publication de l'annonce sur Leenkey avec l'aide de l'assistant ; espace personnel et suivi de la vente ; messagerie et gestion des demandes de visite ; réception des offres d'achat ; accès aux informations communiquées par les acquéreurs ; assistant disponible à chaque étape ; checklist et liste des documents à préparer. Sans carte bancaire, sans durée limitée et sans obligation de passer à une formule payante. Elle ne comprend pas d'appel ni d'accompagnement par un conseiller.",
      ),
      sub(`Accompagné, 990${S}€ TTC par bien, pour 12 mois`),
      para("Tout Autonomie, plus :"),
      list(
        "un conseiller Leenkey dédié ;",
        "un regard personnalisé sur le prix et la stratégie de vente ;",
        "la relecture et l'optimisation de l'annonce ;",
        "des recommandations pour valoriser le bien et préparer les visites ;",
        "le suivi des performances de l'annonce et des pistes d'amélioration ;",
        "un accompagnement pour préparer les échanges avec les acquéreurs ;",
        "l'analyse des offres reçues et des informations de financement communiquées ;",
        "une aide à la décision jusqu'à l'acceptation d'une offre.",
      ),
      sub(`Sérénité, 1${S}500${S}€ TTC par bien, pour 12 mois`),
      para("Tout Accompagné, plus :"),
      list(
        "la préparation du dossier de vente : organisation des documents, diagnostics et identification des pièces manquantes ;",
        "l'analyse des documents : lecture des pièces disponibles et signalement des éventuels points de vigilance ;",
        "le suivi jusqu'à la signature : accompagnement dans les démarches après l'acceptation de l'offre, rappel des échéances importantes et aide à la préparation des échanges avec le notaire.",
      ),
      sub("Ce que les formules ne comprennent pas"),
      para(
        "Aucune formule ne comprend la représentation du client, une négociation menée en son nom, la réalisation des visites par Leenkey, un reportage photographique, ni une prestation réservée à une profession réglementée, notamment aux notaires et aux avocats.",
      ),
      para(
        "La fiche de la formule, telle qu'elle est présentée au moment de la commande, fait partie du contrat : elle est conservée et reprise dans l'email de confirmation de la commande. Aucune description générale ne donne droit à une prestation qu'elle ne comprend pas.",
      ),
    ],
  },
  {
    id: "prix",
    title: "4. Prix et absence de commission",
    blocks: [
      para(
        "Les prix sont exprimés en euros toutes taxes comprises. Les forfaits sont fixes, attachés au bien désigné lors de la commande, et indépendants du prix de vente comme de la réussite de la vente. Aucun frais caché n'est appliqué ; tout service payant supplémentaire ferait l'objet d'une information complète et d'une commande distincte.",
      ),
      para(
        `Le passage de la formule Accompagné à la formule Sérénité coûte la différence entre les deux prix, soit 510${S}€ TTC ; il fait repartir la durée de 12 mois.`,
      ),
    ],
  },
  {
    id: "commande",
    title: "5. Commande et preuve",
    blocks: [
      para(
        "Avant de payer, le client voit un récapitulatif de sa commande : la formule, le bien concerné, le contenu exact de la formule, le prix TTC, la durée de 12 mois sans renouvellement automatique, le retour en formule Autonomie à l'échéance, le droit de rétractation de 14 jours et les coordonnées du médiateur de la consommation. Il peut revenir sur son choix avant de confirmer.",
      ),
      para(
        "Il coche lui-même la case d'acceptation des CGU et des CGV, dont les versions sont affichées et enregistrées avec la date et l'heure, et, s'il le souhaite, la case de demande de démarrage immédiat des prestations. Aucune case n'est cochée d'avance. Le bouton « Commander et payer », suivi du prix TTC, indique l'obligation de paiement.",
      ),
      para(
        "Après le paiement, le client reçoit par email la confirmation de sa commande : la formule, le prix, le bien, la date, la durée, le début des prestations, la fiche de la formule, les conditions acceptées, les informations sur la rétractation et le formulaire de rétractation.",
      ),
    ],
  },
  {
    id: "paiement",
    title: "6. Paiement",
    blocks: [
      para(
        "Le prix est payé à la souscription, par carte bancaire, sur la page de paiement sécurisée de notre prestataire Stripe. La formule est activée dès la confirmation du paiement. Les données de carte sont traitées par Stripe ; Leenkey ne les reçoit pas et ne les conserve pas. Le reçu et la facture sont envoyés par email.",
      ),
    ],
  },
  {
    id: "duree",
    title: "7. Durée, échéance et renouvellement",
    blocks: [
      para(
        "Chaque formule Accompagné ou Sérénité est fournie pendant 12 mois à compter de sa souscription. La vente du bien ou l'arrêt du projet n'allongent ni ne réduisent cette durée.",
      ),
      para(
        "Elle n'est jamais renouvelée automatiquement. Le client est prévenu 30 jours avant l'échéance ; il peut la renouveler pour 12 mois, au tarif en vigueur, ou choisir l'autre formule payante, par une nouvelle commande expresse. Sans renouvellement, le bien repasse en formule Autonomie : l'annonce reste en ligne et les outils restent disponibles ; l'accompagnement du conseiller s'arrête.",
      ),
    ],
  },
  {
    id: "leenkey",
    title: "8. Obligations de Leenkey",
    blocks: [
      para(
        "Leenkey fournit avec diligence les services décrits dans la fiche de la formule. Le conseiller accompagne le client dans un rôle d'information et de conseil strictement délimité : il n'agit pas au nom du vendeur et n'accomplit aucun acte réservé à une profession réglementée.",
      ),
      para(
        `Le conseiller contacte le client sous 24${S}h après la souscription lorsque le démarrage immédiat a été demandé, et à partir du 15e jour sinon, à l'issue du délai de rétractation.`,
      ),
    ],
  },
  {
    id: "client",
    title: "9. Obligations du client",
    blocks: [
      para(
        "Le client fournit des informations et des documents exacts, dispose des droits nécessaires sur son bien et sur les contenus qu'il publie, accomplit les démarches qui lui reviennent et participe raisonnablement à l'exécution des prestations. Il prend lui-même ses décisions sur le prix, les visites, les offres, leur acceptation et la signature des documents, et informe Leenkey de tout changement utile.",
      ),
    ],
  },
  {
    id: "retractation",
    title: "10. Droit de rétractation de 14 jours",
    blocks: [
      para(
        "Le client consommateur peut se rétracter sans motif pendant 14 jours à compter de la souscription. Le délai court à partir du lendemain de la commande ; s'il expire un samedi, un dimanche ou un jour férié, il est prolongé jusqu'au premier jour ouvrable suivant.",
      ),
      para("Pour se rétracter, il peut, au choix :"),
      {
        kind: "list",
        items: [
          [
            "utiliser le bouton « Renoncer au contrat », sur la page de sa formule dans son espace, visible pendant tout le délai ;",
          ],
          ["écrire une déclaration dénuée d'ambiguïté à ", email, " ;"],
          ["envoyer le formulaire de rétractation ci-dessous, par email ou par courrier."],
        ],
      },
      para(
        "Un accusé de réception lui est envoyé aussitôt par email. Leenkey rembourse les sommes payées au plus tard 14 jours après la demande, par le moyen de paiement utilisé lors de la commande, sans frais. Après un passage à la formule Sérénité, la rétractation comprend aussi la formule Accompagné qu'elle a remplacée lorsque celle-ci est encore dans son propre délai.",
      ),
    ],
  },
  {
    id: "execution",
    title: "11. Démarrage immédiat",
    blocks: [
      para(
        "Si le client souhaite que les prestations commencent avant la fin des 14 jours, il le demande expressément, par une case distincte de l'acceptation des CGV, au moment de la commande. Sans cette demande, le conseiller ne le contacte qu'à partir du 15e jour.",
      ),
      para(
        "En cas de rétractation après un démarrage immédiat, seul un montant proportionnel aux prestations effectivement fournies jusqu'à la rétractation peut être dû, dans les conditions de l'article L221-25 du code de la consommation ; aucun montant n'est dû lorsque la loi le prévoit. Un simple accès à l'espace personnel ne vaut pas exécution complète d'une formule de 12 mois.",
      ),
    ],
  },
  {
    id: "retrait",
    title: "12. Retrait de l'annonce et résiliation",
    blocks: [
      para(
        "Le client peut retirer son annonce et interrompre la vente à tout moment ; ce retrait ne met pas fin automatiquement à la formule souscrite. Une résiliation anticipée ne donne pas droit, à elle seule, à un remboursement intégral ou proportionnel, sauf disposition légale, manquement de Leenkey, accord particulier ou exercice du droit de rétractation. Les recours prévus par la loi, notamment la résolution du contrat ou la réduction du prix, restent ouverts.",
      ),
    ],
  },
  {
    id: "resultat",
    title: "13. Absence de vente et absence d'engagement de résultat",
    blocks: [
      para(
        "Les forfaits rémunèrent les prestations prévues, non la vente du bien. Leenkey ne garantit ni l'obtention d'une offre, ni le financement d'un acquéreur, ni une vente dans un délai donné. L'absence de vente ne justifie pas, à elle seule, un remboursement lorsque les prestations ont été correctement fournies, sous réserve des droits que la loi reconnaît au client.",
      ),
    ],
  },
  {
    id: "conformite",
    title: "14. Garantie légale de conformité",
    blocks: [
      para(
        "Lorsque les règles applicables aux contenus et services numériques s'appliquent, le client consommateur bénéficie de la garantie légale de conformité : mise en conformité, réduction du prix ou résolution du contrat, dans les conditions prévues par la loi, et mises à jour nécessaires au maintien de la conformité. Les présentes CGV ne limitent pas ces droits.",
      ),
    ],
  },
  {
    id: "reclamations",
    title: "15. Réclamations",
    blocks: [
      write(
        "Toute réclamation peut être adressée à LEENKEY, 36 rue Pierre Brossolette, 91360 Épinay-sur-Orge, ou par email à ",
        ". Leenkey y répond dans un délai raisonnable.",
      ),
    ],
  },
  {
    id: "mediation",
    title: "16. Médiation de la consommation",
    blocks: [
      para(
        "Après une réclamation écrite restée sans solution auprès de Leenkey, le client consommateur peut recourir gratuitement au médiateur de la consommation dont Leenkey relève. Ses coordonnées sont indiquées ici et dans le récapitulatif de chaque commande ; aucune formule payante ne peut être commandée tant qu'elles ne sont pas publiées.",
      ),
    ],
  },
  {
    id: "droit",
    title: "17. Droit applicable et litiges",
    blocks: [
      para(
        "Le contrat est soumis au droit français, sans préjudice des règles impératives qui protègent le consommateur. Les litiges relèvent des juridictions désignées par la loi ; aucune clause n'en réserve la connaissance à un tribunal particulier.",
      ),
    ],
  },
  {
    id: "formulaire",
    title: "Annexe : formulaire de rétractation",
    blocks: [
      para(
        "À compléter et à renvoyer uniquement si vous souhaitez vous rétracter. Vous pouvez aussi utiliser le bouton « Renoncer au contrat » dans votre espace.",
      ),
      {
        kind: "box",
        lines: [
          [
            "À l'attention de LEENKEY, 36 rue Pierre Brossolette, 91360 Épinay-sur-Orge ; ",
            email,
            ".",
          ],
          [
            "Je vous notifie par la présente ma rétractation du contrat de prestation de services ci-dessous :",
          ],
          ["Formule souscrite : ____________________"],
          ["Référence du bien : ____________________"],
          ["Commandée le : ____________________"],
          ["Nom et prénom : ____________________"],
          ["Adresse : ____________________"],
          ["Adresse électronique : ____________________"],
          ["Date : ____________________"],
          ["Signature (uniquement en cas d'envoi sur papier) : ____________________"],
        ],
      },
    ],
  },
];

export const salesTermsText = {
  updated: "En vigueur depuis le 9 novembre 2026",
  toc: "Sommaire",
  sections: salesSections,
} as const;

// ---------------------------------------------------------------------------
// Privacy policy
// ---------------------------------------------------------------------------

const privacySections: readonly LegalSection[] = [
  {
    id: "responsable",
    title: "1. Responsable du traitement",
    blocks: [
      para(
        "LEENKEY, société dont les coordonnées figurent dans les mentions légales, décide de l'usage des données personnelles traitées pour ses services.",
      ),
      write("Pour toute question sur vos données ou pour exercer vos droits : "),
    ],
  },
  {
    id: "personnes",
    title: "2. À qui s'adresse cette politique",
    blocks: [
      para(
        "Aux visiteurs du site, aux personnes qui demandent une analyse de valeur, aux vendeurs, aux acquéreurs et à toute personne en contact avec Leenkey. Des informations plus courtes sont aussi données au moment de chaque collecte.",
      ),
    ],
  },
  {
    id: "donnees",
    title: "3. Les données que nous traitons",
    blocks: [
      list(
        "Compte : prénom, nom, adresse email, téléphone s'il est donné, rôle (vendeur, acquéreur), date et version des conditions acceptées.",
        "Analyse de valeur : les réponses au questionnaire sur le bien, l'adresse email et, s'il est donné, le numéro de téléphone.",
        "Bien et annonce : adresse et caractéristiques du bien, photos, description, prix, documents du dossier de vente, état d'avancement de la vente.",
        "Projet acquéreur : critères de recherche, favoris, demandes de visite, offres, budget, apport et mode de financement déclarés, justificatif de financement s'il est déposé.",
        "Échanges : messages entre utilisateurs et avec Leenkey, signalements, demandes d'aide.",
        "Formules et paiements : formule choisie, historique des commandes, références et statut des paiements transmis par Stripe (jamais les numéros de carte).",
        "Assistant : questions posées, réponses et suggestions produites, actions confirmées.",
        "Données techniques : adresse IP, journaux de sécurité, cookies et stockage du navigateur décrits dans la politique cookies.",
      ),
    ],
  },
  {
    id: "finalites",
    title: "4. Pourquoi, et sur quelle base légale",
    blocks: [
      list(
        "Produire l'analyse de valeur demandée et y répondre : mesures précontractuelles prises à votre demande.",
        "Créer et gérer votre compte, publier une annonce, faire fonctionner la messagerie, les visites, les offres et le suivi de la vente : exécution des CGU.",
        "Vendre et fournir les formules payantes, facturer : exécution du contrat et obligations comptables et fiscales.",
        "Faire fonctionner l'assistant que vous utilisez : exécution du service demandé.",
        "Relire les annonces, modérer les contenus, prévenir la fraude, limiter les abus et sécuriser le site : intérêt légitime de Leenkey et de ses utilisateurs, ou obligation légale.",
        "Répondre à vos demandes sur vos données : obligation légale.",
        "Mesurer l'audience du site avec Google Analytics : votre consentement, que vous pouvez retirer à tout moment.",
      ),
      para(
        "Nous n'envoyons pas de prospection commerciale par email sans votre accord, et vous pouvez vous y opposer à tout moment.",
      ),
    ],
  },
  {
    id: "obligatoire",
    title: "5. Données obligatoires et facultatives",
    blocks: [
      para(
        "Les champs nécessaires à l'inscription, au paiement ou à une fonctionnalité sont signalés ; les autres sont facultatifs. Sans une donnée obligatoire, le service concerné ne peut pas être rendu, sans empêcher les autres.",
      ),
    ],
  },
  {
    id: "visibilite",
    title: "6. Ce que voient les autres utilisateurs",
    blocks: [
      list(
        "Une annonce publiée montre le bien, ses photos, son prix et le prénom du vendeur. Son adresse exacte n'est jamais publiée : la carte montre une position approximative.",
        "Le vendeur voit le prénom d'un acquéreur qui le contacte et le statut de son financement, jamais ses montants ni ses justificatifs.",
        "Lorsqu'une offre est faite, les coordonnées complètes de l'acquéreur ne sont transmises au vendeur qu'une fois l'offre acceptée.",
        "Les documents du dossier de vente ne sont visibles que par les acquéreurs à qui le vendeur les a partagés.",
        "L'équipe Leenkey accède aux données nécessaires à la relecture des annonces, à l'accompagnement des formules, à la modération et à l'assistance.",
      ),
    ],
  },
  {
    id: "prestataires",
    title: "7. Destinataires et prestataires",
    blocks: [
      para(
        "Vos données sont traitées par l'équipe Leenkey et par les prestataires techniques suivants, qui n'en font usage que pour nous rendre leur service :",
      ),
      list(
        "Vercel Inc. (États-Unis) : hébergement du site ; serveurs de calcul à Paris.",
        "Supabase Inc. (États-Unis) : base de données, comptes et fichiers ; données hébergées dans l'Union européenne.",
        "Stripe Payments Europe (Irlande) : paiement des formules et factures.",
        "Anthropic PBC (États-Unis) : modèle d'intelligence artificielle de l'assistant et de l'analyse de valeur rédigée.",
        "Resend (États-Unis) : envoi des emails.",
        "Google (Google Maps Platform) : affichage des cartes, qui reçoit l'adresse IP du visiteur et la zone affichée, jamais l'adresse exacte d'un bien.",
        "IGN, Géoplateforme (France) : suggestion et localisation des adresses saisies par les vendeurs, sans nom, email ni adresse IP.",
        "Google (Google Analytics et Google Tag Manager) : mesure d'audience, seulement après votre accord.",
      ),
      para(
        "Vos données ne sont jamais vendues. Elles peuvent être communiquées aux autorités dans les cas prévus par la loi.",
      ),
    ],
  },
  {
    id: "ia",
    title: "8. Intelligence artificielle",
    blocks: [
      p(
        "Les fonctionnalités qui utilisent l'intelligence artificielle sont signalées comme telles. Les questions posées à l'assistant et les textes nécessaires à sa réponse (par exemple la description d'une annonce) sont transmis à Anthropic pour produire la réponse. Aucun justificatif de financement ni aucune pièce d'identité ne lui est transmis. Les échanges avec l'assistant sont conservés dans votre espace et peuvent être relus par l'équipe Leenkey pour la qualité du service. Le détail figure sur la page ",
        { link: "Intelligence artificielle", href: "/intelligence-artificielle" },
        ".",
      ),
    ],
  },
  {
    id: "durees",
    title: "9. Durées de conservation",
    blocks: [
      list(
        "Compte, biens, annonces, messages, offres et documents : tant que le compte est ouvert ; à sa suppression, ces données sont effacées ou rendues anonymes, sauf celles que la loi impose de garder.",
        "Analyse de valeur faite sans compte : 12 mois.",
        "Conversations avec l'assistant du site sans compte : 30 jours ; l'empreinte de l'adresse IP utilisée pour limiter le nombre de questions est effacée le lendemain.",
        "Empreintes d'adresses IP utilisées pour limiter les tentatives (inscription, connexion, formulaire de contact) : un jour.",
        "Factures et pièces comptables : 10 ans, comme l'impose la loi.",
        "Preuve des commandes et des conditions acceptées : le temps nécessaire à la preuve du contrat, dans la limite des délais de prescription.",
        "Cookies : selon les durées indiquées dans la politique cookies.",
      ),
    ],
  },
  {
    id: "transferts",
    title: "10. Transferts hors de l'Union européenne",
    blocks: [
      para(
        "Certains prestataires sont établis aux États-Unis ou peuvent y accéder aux données. Ces transferts sont encadrés par les garanties prévues par le RGPD : décision d'adéquation de la Commission européenne pour les entreprises certifiées au cadre de protection des données UE–États-Unis, ou clauses contractuelles types de la Commission européenne.",
      ),
    ],
  },
  {
    id: "securite",
    title: "11. Sécurité",
    blocks: [
      para(
        "Nous protégeons vos données par des mesures adaptées : connexions chiffrées, mots de passe jamais stockés en clair, accès limité selon le rôle de chacun et vérifié par la base de données, liens temporaires pour les fichiers privés et limitation des tentatives répétées. En cas de violation de données présentant un risque pour vous, nous vous en informons dans les conditions prévues par la loi.",
      ),
    ],
  },
  {
    id: "droits",
    title: "12. Vos droits",
    blocks: [
      para(
        "Vous pouvez accéder à vos données, les faire rectifier ou effacer, en limiter le traitement, vous opposer à leur traitement, en demander la portabilité et retirer votre consentement à tout moment. Aucune décision produisant des effets juridiques à votre égard n'est prise sur le seul fondement d'un traitement automatisé.",
      ),
      write(
        "Vous pouvez modifier vos informations depuis votre espace, et exercer vos droits en écrivant à ",
        ". Nous vous répondons dans un délai d'un mois, et pouvons vous demander un justificatif d'identité en cas de doute raisonnable.",
      ),
      p(
        "Vous pouvez adresser une réclamation à la CNIL : ",
        { link: "cnil.fr", href: "https://www.cnil.fr" },
        ".",
      ),
    ],
  },
  {
    id: "cookies",
    title: "13. Cookies",
    blocks: [
      p(
        "Les cookies et le stockage du navigateur sont décrits dans la ",
        { link: "politique cookies", href: "/cookies" },
        ". Ceux qui demandent votre accord ne sont déposés qu'après celui-ci.",
      ),
    ],
  },
  {
    id: "mineurs",
    title: "14. Mineurs",
    blocks: [
      para(
        "Les comptes sont réservés aux personnes majeures. Un bien appartenant à un mineur est présenté par son représentant légal.",
      ),
    ],
  },
  {
    id: "mise-a-jour",
    title: "15. Mise à jour",
    blocks: [
      para(
        "Toute modification importante de cette politique vous est présentée à votre connexion suivante. La date de la version en vigueur figure en tête de la page.",
      ),
    ],
  },
];

export const privacyText = {
  updated: "En vigueur depuis le 9 novembre 2026",
  toc: "Sommaire",
  sections: privacySections,
} as const;

// ---------------------------------------------------------------------------
// Reporting and moderation
// ---------------------------------------------------------------------------

const reportingSections: readonly LegalSection[] = [
  {
    id: "objet",
    title: "1. Objet",
    blocks: [
      para(
        "Cette politique présente les règles qui s'appliquent aux annonces, photos, descriptions, messages et autres contenus publiés par les utilisateurs, et la façon dont Leenkey traite les signalements.",
      ),
    ],
  },
  {
    id: "interdits",
    title: "2. Contenus interdits",
    blocks: [
      para(
        "Sont notamment interdits : les annonces fictives, les contenus frauduleux ou trompeurs, l'usurpation d'identité, les annonces ou messages discriminatoires, la diffusion de données personnelles d'autrui sans droit, les atteintes au droit d'auteur, les fichiers malveillants, les messages menaçants ou injurieux, le démarchage et la publicité dans la messagerie, et tout contenu contraire à la loi. Une information immobilière inexacte ou dépassée doit être corrigée sans délai par son auteur.",
      ),
    ],
  },
  {
    id: "controles",
    title: "3. Contrôles et décisions",
    blocks: [
      para(
        "Chaque annonce est relue par l'équipe Leenkey avant sa publication. Leenkey examine aussi les signalements reçus et peut repérer des incohérences. Ces contrôles ne garantissent pas la conformité de tous les contenus.",
      ),
      para(
        "Selon la gravité, les mesures peuvent être : une demande de correction, le refus de publier une annonce, sa suspension ou son retrait, un avertissement adressé à l'auteur d'un message, la suspension de son compte. Elles restent proportionnées.",
      ),
    ],
  },
  {
    id: "signaler",
    title: "4. Signaler un contenu",
    blocks: [
      para(
        "Depuis une conversation, le menu de la conversation propose « Signaler la conversation » : indiquez le motif, il est transmis à l'équipe Leenkey avec la conversation.",
      ),
      write(
        "Pour une annonce ou tout autre contenu, écrivez à ",
        " en indiquant la référence de l'annonce (par exemple LK-0042) ou l'adresse de la page, le motif de votre signalement et, si possible, ce qui le rend selon vous illicite.",
      ),
      para(
        "Les signalements sont examinés avec diligence et objectivité, et leur auteur est informé de la suite donnée lorsqu'il a laissé ses coordonnées.",
      ),
    ],
  },
  {
    id: "information",
    title: "5. Information des personnes concernées",
    blocks: [
      para(
        "Lorsqu'une mesure est prise, la personne concernée en est informée par email, avec ses motifs, la mesure décidée et la façon de la contester, sauf lorsque la loi ou la sécurité s'y opposent.",
      ),
    ],
  },
  {
    id: "contester",
    title: "6. Contester une décision",
    blocks: [
      write(
        "Vous pouvez contester une décision en écrivant à ",
        ", avec la référence concernée et vos raisons. Votre demande est réexaminée par une autre personne de l'équipe lorsque c'est possible, et vous recevez une réponse motivée.",
      ),
    ],
  },
  {
    id: "automatise",
    title: "7. Outils automatiques",
    blocks: [
      para(
        "L'assistant peut aider l'équipe à repérer, dans une annonce soumise, les informations manquantes ou incohérentes. Toute décision de refus, de retrait ou de suspension est prise par une personne de l'équipe Leenkey.",
      ),
    ],
  },
  {
    id: "contact",
    title: "8. Point de contact",
    blocks: [write("Pour les signalements, les contestations et les demandes des autorités : ")],
  },
  {
    id: "mise-a-jour",
    title: "9. Mise à jour",
    blocks: [
      para(
        "Cette politique évolue avec les fonctionnalités du site et les obligations qui s'appliquent à Leenkey.",
      ),
    ],
  },
];

export const reportingText = {
  updated: "En vigueur depuis le 9 novembre 2026",
  sections: reportingSections,
} as const;

// ---------------------------------------------------------------------------
// Artificial intelligence
// ---------------------------------------------------------------------------

const aiSections: readonly LegalSection[] = [
  {
    id: "quoi",
    title: "1. Ce que fait l'assistant",
    blocks: [
      para(
        "Dans votre espace, l'assistant Leenkey répond à vos questions sur la vente ou l'achat d'un bien, à partir de notre base de questions fréquentes et des informations de votre espace. Il peut aussi vous proposer un texte : une description d'annonce, une réponse à un message.",
      ),
      para(
        "Sur le site, sans compte, il répond à vos questions sur nos formules et vous aide à souscrire, à partir de nos formules et de notre FAQ seulement.",
      ),
      para(
        "L'analyse de valeur d'un bien est calculée par notre moteur, sans intelligence artificielle ; l'assistant n'en rédige que le commentaire.",
      ),
    ],
  },
  {
    id: "jamais",
    title: "2. Ce qu'il ne fait jamais seul",
    blocks: [
      list(
        "Il n'envoie aucun message et ne modifie rien sans votre confirmation : chaque action proposée s'affiche, et vous la validez ou la refusez.",
        "Il ne prend aucune décision sur une offre, un prix, un financement ou un compte.",
        "Il ne donne pas d'avis juridique, fiscal ou financier engageant : pour ces questions, il vous oriente vers votre conseiller Leenkey ou un professionnel.",
        "Il n'est pas votre interlocuteur : il ne contacte pas l'autre partie et ne négocie pas.",
      ),
    ],
  },
  {
    id: "limites",
    title: "3. Ses limites",
    blocks: [
      para(
        "Ses réponses sont produites automatiquement et peuvent être incomplètes ou inexactes : vérifiez-les avant de vous en servir. En cas de doute, demandez à parler à une personne de l'équipe Leenkey. Le nombre de questions par jour est limité.",
      ),
    ],
  },
  {
    id: "donnees",
    title: "4. Vos données",
    blocks: [
      p(
        "L'assistant utilise un modèle d'Anthropic PBC (États-Unis). Vos questions et les informations nécessaires à la réponse lui sont transmises ; aucun justificatif de financement ni aucune pièce d'identité ne lui est transmis. Les conversations sont conservées dans votre espace et peuvent être relues par l'équipe Leenkey pour la qualité du service. Pour en savoir plus, consultez la ",
        { link: "politique de confidentialité", href: "/confidentialite" },
        ".",
      ),
      para(
        "Sans compte, vos questions et ses réponses sont conservées 30 jours, sans votre nom. Votre adresse IP n'est pas enregistrée : pour limiter le nombre de questions par jour, nous n'en gardons qu'une empreinte, calculée avec une clé secrète et effacée le lendemain.",
      ),
    ],
  },
];

export const aiText = {
  updated: "En vigueur depuis le 9 novembre 2026",
  sections: aiSections,
} as const;
