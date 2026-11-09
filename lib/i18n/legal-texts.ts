// Legal notice of the V1 (« Mentions légales » of 23 July 2026), in the legal
// page template of the V2 (L1-43), updated on 9 November 2026 with the
// legal file of 9 October (data host, activity, jurisdiction). The other
// legal texts are in legal-policies.ts. Part of fr.ts (fr.legal).

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
  updated: "Dernière mise à jour : 9 novembre 2026",
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
        {
          kind: "p",
          text: [
            "Leenkey exploite une plateforme numérique d'information, de préparation et d'accompagnement à la vente immobilière entre particuliers. Les utilisateurs restent responsables de leurs choix et de leurs démarches ; Leenkey n'est le mandataire ni des vendeurs ni des acquéreurs.",
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
        {
          kind: "p",
          text: [
            "Les données des comptes, des annonces et des fichiers sont hébergées par Supabase Inc. (États-Unis), sur des serveurs situés dans l'Union européenne. La liste de nos prestataires figure dans la ",
            { link: "politique de confidentialité", href: "/confidentialite" },
            ".",
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
            "Leenkey traite les données personnelles collectées sur ce site en qualité de responsable de traitement, dans le respect du règlement général sur la protection des données (RGPD) et de la loi Informatique et Libertés. Les données traitées, leurs finalités, leurs destinataires, leurs durées de conservation et vos droits sont décrits dans la ",
            { link: "politique de confidentialité", href: "/confidentialite" },
            ". Pour exercer vos droits : ",
            email,
            ".",
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
            " à titre informatif uniquement, basée sur les informations renseignées et les données de marché disponibles. Ils ne constituent pas une expertise immobilière et ne garantissent pas le prix de vente.",
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
            "Les présentes mentions légales sont régies par le droit français, sous réserve des règles impératives applicables. Les litiges relèvent des juridictions désignées par la loi ; aucune compétence exclusive n'est imposée aux consommateurs.",
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
            ". Pour signaler un contenu, consultez la ",
            { link: "politique de signalement et de modération", href: "/signalement" },
            ".",
          ],
        },
      ],
    },
  ] satisfies readonly LegalSection[],
} as const;
