// Legal notice and terms of use of the V1 (« Mentions légales » of 23 July
// 2026, « CGU » version 1.0 of 28 June 2026), word for word, in the legal
// page template of the V2 (L1-43). The CGU are the version accepted at
// signup (lib/legal/versions.ts): a change of their text is a new version.
// Final texts from Cédric's lawyer (Q34). Part of fr.ts (fr.legal).

import type { Rich } from "./rich";

export type LegalBlock =
  | { readonly kind: "p"; readonly text: Rich }
  | { readonly kind: "list"; readonly items: readonly Rich[] }
  | { readonly kind: "subtitle"; readonly text: string }
  /** Identity lines on a stone tile (publisher, host). */
  | { readonly kind: "box"; readonly lines: readonly Rich[] }
  | { readonly kind: "important"; readonly text: Rich };

export type LegalSection = {
  /** Anchor of the section (/mentions-legales#rgpd). */
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LegalBlock[];
};

const EMAIL = "contact.leenkey@gmail.com";
const email = { link: EMAIL, href: `mailto:${EMAIL}` } as const;
const S = "\u00A0";

export const legalNotice = {
  metaTitle: "Mentions légales · Leenkey",
  title: "Mentions légales",
  updated: "Dernière mise à jour : 23 juillet 2026",
  sections: [
    {
      id: "editeur",
      title: "1. Éditeur du site",
      blocks: [
        {
          kind: "box",
          lines: [
            ["Dénomination sociale : ", { strong: "LEENKEY" }],
            ["Forme juridique : Société par actions simplifiée à associé unique (SAS)"],
            [`Capital social : 1${S}000,00${S}€`],
            [`Siège social : 36${S}Rue Pierre Brossolette, 91360 Épinay-sur-Orge, France`],
            [`SIREN : 107${S}616${S}211`],
            ["RCS : ", { strong: `107${S}616${S}211 R.C.S. Évry` }],
            [`N° de TVA intracommunautaire : FR53${S}107${S}616${S}211`],
            ["Président et directeur de la publication : ", { strong: "Cédric Da Cunha" }],
            ["Email : ", email],
            ["Téléphone : ", { link: "+33 6 13 84 54 51", href: "tel:+33613845451" }],
          ],
        },
      ],
    },
    {
      id: "hebergement",
      title: "2. Hébergement",
      blocks: [
        {
          kind: "box",
          lines: [
            [{ strong: "Vercel Inc." }],
            ["340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis"],
            ["Site : ", { link: "vercel.com", href: "https://vercel.com" }],
          ],
        },
      ],
    },
    {
      id: "conception",
      title: "3. Conception et développement",
      blocks: [
        {
          kind: "box",
          lines: [["Site conçu et développé par ", { strong: "Nebula Creativ" }, "."]],
        },
      ],
    },
    {
      id: "propriete-intellectuelle",
      title: "4. Propriété intellectuelle",
      blocks: [
        {
          kind: "p",
          text: [
            "L'ensemble du contenu du site ",
            { strong: "leenkey.fr" },
            " (textes, graphismes, logos, images, vidéos, icônes, code source) est la propriété exclusive de Leenkey ou de ses partenaires, et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.",
          ],
        },
        {
          kind: "p",
          text: [
            "Toute reproduction, représentation, modification, publication, adaptation ou exploitation de tout ou partie des éléments du site, par quelque procédé que ce soit, est strictement interdite sans l'autorisation écrite préalable de Leenkey.",
          ],
        },
      ],
    },
    {
      id: "rgpd",
      title: "5. Données personnelles (RGPD)",
      blocks: [
        {
          kind: "p",
          text: [
            "Les données personnelles collectées sur ce site (nom, prénom, email, téléphone, données relatives au bien immobilier) sont traitées par Leenkey en qualité de responsable de traitement, dans le respect du Règlement Général sur la Protection des Données (Règlement UE 2016/679) et de la loi Informatique et Libertés modifiée.",
          ],
        },
        { kind: "subtitle", text: "Finalités du traitement" },
        {
          kind: "list",
          items: [
            ["Établir une analyse de valorisation de votre bien immobilier"],
            ["Vous transmettre votre rapport de valorisation personnalisé"],
            ["Vous recontacter dans le cadre de votre demande"],
            ["Améliorer nos services et notre algorithme"],
          ],
        },
        { kind: "subtitle", text: "Vos droits" },
        {
          kind: "p",
          text: [
            "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition au traitement de vos données. Pour exercer ces droits, contactez-nous à ",
            email,
            ".",
          ],
        },
        {
          kind: "p",
          text: [
            "Vous pouvez également introduire une réclamation auprès de la CNIL (",
            { link: "www.cnil.fr", href: "https://www.cnil.fr" },
            ").",
          ],
        },
        { kind: "subtitle", text: "Durée de conservation" },
        {
          kind: "p",
          text: [
            "Vos données sont conservées ",
            { strong: "3 ans" },
            " à compter du dernier contact, sauf obligation légale de conservation plus longue (notamment comptable).",
          ],
        },
      ],
    },
    {
      id: "cookies",
      title: "6. Cookies",
      blocks: [
        {
          kind: "p",
          text: [
            "Le site dépose des cookies ",
            { strong: "nécessaires" },
            " à son fonctionnement (session, sécurité, mémorisation de vos choix) et, seulement avec votre accord, des cookies de mesure d'audience. Aucun cookie publicitaire n'est utilisé. Le détail et vos choix : ",
            { link: "politique cookies", href: "/cookies" },
            ".",
          ],
        },
      ],
    },
    {
      id: "responsabilite",
      title: "7. Limitation de responsabilité",
      blocks: [
        {
          kind: "p",
          text: [
            "Les rapports de valorisation fournis par Leenkey constituent une ",
            { strong: "analyse automatisée" },
            " à titre informatif uniquement, basée sur les informations renseignées et les données de marché disponibles. Ils ne constituent ni une expertise immobilière ni une estimation au sens de la loi Hoguet, et ne peuvent engager la responsabilité de Leenkey quant au prix réel de vente.",
          ],
        },
        {
          kind: "p",
          text: [
            "Pour une évaluation officielle opposable, il est recommandé de consulter un expert immobilier agréé ou un notaire.",
          ],
        },
      ],
    },
    {
      id: "droit-applicable",
      title: "8. Droit applicable",
      blocks: [
        {
          kind: "p",
          text: [
            "Les présentes mentions légales sont régies par le droit français. Tout litige relatif à l'utilisation du site relève de la compétence exclusive des tribunaux de Paris.",
          ],
        },
      ],
    },
    {
      id: "contact",
      title: "9. Contact",
      blocks: [
        {
          kind: "p",
          text: [
            "Pour toute question relative à ces mentions légales, contactez-nous à ",
            email,
            ".",
          ],
        },
      ],
    },
  ] satisfies readonly LegalSection[],
} as const;

export const terms = {
  metaTitle: "Conditions générales d'utilisation · Leenkey",
  title: "Conditions générales d'utilisation",
  updated: "Dernière mise à jour : 28 juin 2026 · Version 1.0",
  toc: "Sommaire",
  contact: "Pour toute question relative à ces CGU, contactez-nous à",
  sections: [
    {
      id: "objet",
      title: "1. Objet et acceptation",
      blocks: [
        {
          kind: "p",
          text: [
            `Les présentes Conditions Générales d'Utilisation («${S}CGU${S}») régissent l'accès et l'utilisation de la plateforme `,
            { strong: "Leenkey" },
            ", accessible à l'adresse ",
            { link: "leenkey.fr", href: "https://leenkey.fr" },
            ` et ses sous-domaines (le «${S}Site${S}»).`,
          ],
        },
        {
          kind: "p",
          text: [
            "En accédant au Site et en utilisant les services proposés, l'Utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepter sans réserve.",
          ],
        },
      ],
    },
    {
      id: "definitions",
      title: "2. Définitions",
      blocks: [
        {
          kind: "list",
          items: [
            [
              { strong: "Leenkey" },
              ` : LEENKEY, société par actions simplifiée au capital de 1${S}000${S}€, immatriculée au RCS d'Évry sous le numéro 107${S}616${S}211, dont le siège social est situé 36${S}Rue Pierre Brossolette, 91360 Épinay-sur-Orge${S}— éditeur du Site et fournisseur des services décrits ci-dessous`,
            ],
            [{ strong: "Utilisateur" }, " : toute personne physique ou morale accédant au Site"],
            [
              { strong: "Vendeur" },
              " : Utilisateur souhaitant valoriser ou vendre un bien immobilier via la plateforme",
            ],
            [
              { strong: "Rapport de valorisation" },
              " : document automatisé d'analyse de la valeur d'un bien immobilier",
            ],
            [
              { strong: "Service" },
              " : ensemble des fonctionnalités proposées par Leenkey (analyse de valeur, accompagnement, diffusion, etc.)",
            ],
          ],
        },
      ],
    },
    {
      id: "service",
      title: "3. Description du service",
      blocks: [
        {
          kind: "p",
          text: [
            "Leenkey est une plateforme d'",
            { strong: "aide à la vente immobilière entre particuliers" },
            ". Elle propose notamment :",
          ],
        },
        {
          kind: "list",
          items: [
            [
              `Une analyse automatisée de la valeur d'un bien immobilier («${S}Rapport de valorisation${S}»)`,
            ],
            ["Des outils de préparation à la vente (dossier, diagnostics, documents)"],
            ["Un accompagnement humain à la demande par des conseillers indépendants"],
            ["Une diffusion exclusive de l'annonce sur le portail Leenkey"],
            ["Un suivi des visites, des offres et de la coordination avec le notaire"],
          ],
        },
        {
          kind: "important",
          text: [
            { strong: "Important :" },
            " Leenkey n'est ",
            { strong: "pas une agence immobilière" },
            " au sens de la loi Hoguet du 2 janvier 1970. La plateforme ne réalise aucune transaction au nom des Utilisateurs et n'agit pas en qualité de mandataire. Le Vendeur reste à tout moment décisionnaire et responsable de sa vente.",
          ],
        },
      ],
    },
    {
      id: "inscription",
      title: "4. Inscription et accès",
      blocks: [
        {
          kind: "p",
          text: [
            "Certaines fonctionnalités du Site nécessitent la création d'un compte personnel. L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour, et à les maintenir à jour pendant toute la durée d'utilisation du Service.",
          ],
        },
        {
          kind: "p",
          text: [
            "L'Utilisateur est seul responsable de la confidentialité de ses identifiants et de toutes les activités effectuées depuis son compte.",
          ],
        },
      ],
    },
    {
      id: "tarifs",
      title: "5. Tarifs et paiement",
      blocks: [
        { kind: "subtitle", text: "5.1 Formule Autonomie" },
        {
          kind: "p",
          text: [
            "La formule ",
            { strong: "Autonomie" },
            " est proposée ",
            { strong: "gratuitement" },
            " durant la phase de lancement, sans engagement ni saisie de carte bancaire. Elle donne accès à l'analyse de valeur du bien, à un call stratégique avec un conseiller (30 minutes) et à la mise en place du dossier de vente.",
          ],
        },
        { kind: "subtitle", text: "5.2 Formules payantes" },
        {
          kind: "p",
          text: [
            "Les formules ",
            { strong: "Accompagné" },
            ` (990${S}€ TTC) et `,
            { strong: "Sérénité" },
            ` (1${S}500${S}€ TTC) sont facturées en forfait fixe TTC, sans commission au pourcentage. Le paiement s'effectue `,
            { strong: "à la souscription" },
            ", dès activation des services associés à la formule choisie (création de l'espace personnel, diffusion de l'annonce, mobilisation du conseiller dédié).",
          ],
        },
        { kind: "subtitle", text: "5.3 Modalités de paiement" },
        {
          kind: "p",
          text: [
            "Le règlement s'effectue par carte bancaire ou virement, au moment de la souscription. L'accès aux fonctionnalités payantes est conditionné à la réception effective du paiement. Conformément au Code de la consommation, le Vendeur dispose d'un droit de rétractation de 14 jours à compter de la souscription, sauf s'il a expressément demandé le démarrage immédiat de l'exécution du Service avant l'expiration de ce délai.",
          ],
        },
        { kind: "subtitle", text: "5.4 Remboursement et garantie" },
        {
          kind: "p",
          text: [
            "Aucun remboursement n'est dû lorsque le Service a été pleinement exécuté. En cas de non-vente du bien, le Vendeur conserve l'accès à son dossier et à son conseiller pendant 12 mois à compter de la souscription, sans frais additionnels.",
          ],
        },
      ],
    },
    {
      id: "obligations",
      title: "6. Obligations de l'utilisateur",
      blocks: [
        { kind: "p", text: ["L'Utilisateur s'engage à :"] },
        {
          kind: "list",
          items: [
            ["Fournir des informations exactes et sincères sur son bien"],
            ["Disposer des droits nécessaires pour mettre le bien en vente"],
            ["Respecter la législation en vigueur (notamment les obligations de diagnostics)"],
            ["Ne pas utiliser le Site à des fins frauduleuses, malveillantes ou illicites"],
            ["Ne pas tenter de contourner les sécurités ou perturber le fonctionnement du Site"],
            ["Respecter la propriété intellectuelle de Leenkey et des tiers"],
          ],
        },
      ],
    },
    {
      id: "responsabilite",
      title: "7. Responsabilité de Leenkey",
      blocks: [
        {
          kind: "p",
          text: [
            "Le Rapport de valorisation fourni par Leenkey est une ",
            { strong: "analyse automatisée" },
            " basée sur les informations renseignées par l'Utilisateur et sur des données de marché publiques (notamment la base DVF). Il est fourni ",
            { strong: "à titre informatif" },
            " et ne constitue ni une expertise immobilière ni une estimation au sens de la loi Hoguet.",
          ],
        },
        { kind: "p", text: ["Leenkey ne peut être tenue responsable :"] },
        {
          kind: "list",
          items: [
            ["De l'écart éventuel entre la valeur estimée et le prix réel de vente"],
            ["De la non-vente du bien ou des délais de transaction"],
            ["Des décisions prises par l'Utilisateur sur la base du Rapport"],
            ["Des informations inexactes fournies par l'Utilisateur"],
            [
              "Des interruptions techniques du Service liées à la maintenance ou à un cas de force majeure",
            ],
          ],
        },
      ],
    },
    {
      id: "propriete-intellectuelle",
      title: "8. Propriété intellectuelle",
      blocks: [
        {
          kind: "p",
          text: [
            "Tous les éléments du Site (textes, graphismes, logo, photos, code, algorithmes) sont la propriété exclusive de Leenkey. Toute reproduction ou utilisation non autorisée est interdite et pourra faire l'objet de poursuites judiciaires.",
          ],
        },
        {
          kind: "p",
          text: [
            "L'Utilisateur conserve la propriété des contenus qu'il publie (photos de son bien, descriptions). Il accorde toutefois à Leenkey une licence d'utilisation gratuite et non-exclusive pour la durée nécessaire à la fourniture du Service.",
          ],
        },
      ],
    },
    {
      id: "donnees",
      title: "9. Données personnelles",
      blocks: [
        {
          kind: "p",
          text: [
            "Les traitements de données personnelles sont décrits en détail dans nos ",
            { link: "Mentions légales", href: "/mentions-legales" },
            " et notre ",
            { link: "Politique de Confidentialité", href: "/confidentialite" },
            ".",
          ],
        },
        {
          kind: "p",
          text: [
            "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition. Pour exercer ces droits : ",
            email,
            ".",
          ],
        },
      ],
    },
    {
      id: "resiliation",
      title: "10. Résiliation",
      blocks: [
        {
          kind: "p",
          text: [
            "L'Utilisateur peut résilier son compte à tout moment en contactant Leenkey à ",
            email,
            `. Les sommes déjà versées au titre d'une formule souscrite restent définitivement acquises à Leenkey lorsque le Service a été pleinement exécuté (voir article${S}5.4). Aucun remboursement au prorata n'est dû après le démarrage effectif de l'accompagnement.`,
          ],
        },
        {
          kind: "p",
          text: [
            "Leenkey se réserve le droit de suspendre ou de résilier le compte d'un Utilisateur en cas de manquement grave aux présentes CGU, sans préavis ni indemnité.",
          ],
        },
      ],
    },
    {
      id: "litiges",
      title: "11. Droit applicable et litiges",
      blocks: [
        {
          kind: "p",
          text: [
            "Les présentes CGU sont régies par le ",
            { strong: "droit français" },
            ". En cas de litige, une solution amiable sera recherchée en priorité.",
          ],
        },
        {
          kind: "p",
          text: [
            "Conformément aux dispositions du Code de la consommation concernant le règlement amiable des litiges, l'Utilisateur peut recourir gratuitement à un médiateur de la consommation. À défaut d'accord, les tribunaux compétents seront ceux du ressort de Paris.",
          ],
        },
      ],
    },
    {
      id: "modification",
      title: "12. Modification des CGU",
      blocks: [
        {
          kind: "p",
          text: [
            "Leenkey se réserve le droit de modifier les présentes CGU à tout moment. Les modifications entrent en vigueur dès leur publication sur le Site. L'Utilisateur est invité à consulter régulièrement la version en vigueur.",
          ],
        },
      ],
    },
  ] satisfies readonly LegalSection[],
} as const;
