import { NNBSP, formatPrice, formatSurface } from "@/lib/format";
import { frOffer } from "@/lib/i18n/sections/offer";
import { frPropertyType } from "@/lib/i18n/sections/propertyType";
import type { OfferContent, OfferIdentity, OfferProperty } from "./content";
import { priceInWordsFr } from "./words";

// The texts this module shows (lib/i18n/sections, P-06).
const fr = { offer: frOffer, propertyType: frPropertyType } as const;

// The document of an offer (SPEC-V2 13, « PDF de l'offre », model of Cédric):
// its seven sections and the notice « Avant d'envoyer votre offre », as plain
// values. The review of the form, the page of the offer and the PDF all show
// this, so they never differ. It never carries: the gap to the asking price,
// the status of qualification, the summary for the seller, a message.

const t = fr.offer.document;

export type DocumentBlock =
  | { kind: "rows"; rows: { label: string; value: string }[] }
  | { kind: "subtitle"; text: string }
  | { kind: "text"; text: string }
  /** The price, in figures. */
  | { kind: "strong"; text: string }
  /** Boxes ticked. */
  | { kind: "checks"; items: string[] };

export type DocumentSection = { number: number; title: string; blocks: DocumentBlock[] };

export type OfferDocument = {
  title: string;
  /** Reference, version, date of issue. */
  meta: string[];
  sections: DocumentSection[];
  notice: { title: string; paragraphs: readonly string[] };
  /** « LK-2026-00012 · version 1 », at the foot of each page. */
  footer: string;
};

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** « 18/11/2026 à 14:00 », in Paris. */
export function formatNumericDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${dayFormat.format(date)} ${t.at} ${timeFormat.format(date)}`;
}

/** « 04/03/1988 » from « 1988-03-04 »; the text itself when it is not a day. */
export function formatNumericDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day;
}

const rateFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** Rows with something to say only: the seller reads no empty line. */
function rows(entries: [label: string, value: string][]): DocumentBlock[] {
  const kept = entries
    .filter(([, value]) => value.trim() !== "")
    .map(([label, value]) => ({ label, value }));
  return kept.length > 0 ? [{ kind: "rows", rows: kept }] : [];
}

export const fullName = (identity: Pick<OfferIdentity, "firstName" | "lastName">) =>
  `${identity.firstName} ${identity.lastName}`.trim();

function identityRows(identity: OfferIdentity): DocumentBlock[] {
  const labels = fr.offer.buyer;
  const address = [identity.addressLine, `${identity.postalCode} ${identity.city}`.trim()]
    .filter((part) => part !== "")
    .join(", ");
  return rows([
    [labels.lastName, identity.lastName],
    [labels.firstName, identity.firstName],
    [labels.birthDate, formatNumericDay(identity.birthDate)],
    [labels.addressLine, address],
    [labels.email, identity.email],
    [labels.phone, identity.phone],
  ]);
}

/** « Jean Dupont », « Jean Dupont et Marie Dupont », « A, B et C ». */
function names(people: OfferIdentity[]): string {
  const list = people.map(fullName).filter((name) => name !== "");
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} ${t.and} ${list[list.length - 1]}`;
}

export function buildOfferDocument(offer: OfferContent, property: OfferProperty): OfferDocument {
  const buyer: DocumentBlock[] = [...identityRows(offer.buyer)];
  offer.coBuyers.forEach((coBuyer, index) => {
    buyer.push({ kind: "subtitle", text: t.coBuyer(index + 1) }, ...identityRows(coBuyer));
  });
  // Under its own title: it is said of all the buyers, not of the last one.
  buyer.push(
    { kind: "subtitle", text: t.mode },
    {
      kind: "text",
      text:
        offer.acquisitionMode === "other"
          ? t.modeOther(offer.acquisitionModeOther)
          : fr.offer.buyer.modes[offer.acquisitionMode],
    },
  );
  if (offer.sci) {
    buyer.push(
      ...rows([
        [t.sci.name, offer.sci.name],
        [t.sci.status, offer.sci.status ? fr.offer.buyer.sci.statuses[offer.sci.status] : ""],
        [t.sci.siren, offer.sci.siren],
        [t.sci.seatAddress, offer.sci.seatAddress],
        [t.sci.representative, offer.sci.representative],
      ]),
    );
  }

  const labels = fr.offer.property;
  const propertyBlocks = rows([
    [labels.address, `${property.postalCode} ${property.city}`.trim()],
    [labels.type, fr.propertyType[property.type]],
    [labels.surface, formatSurface(property.surfaceM2)],
    [
      labels.annexes,
      property.annexes.length > 0
        ? property.annexes.map((annex) => labels.annex[annex]).join(", ")
        : labels.noAnnex,
    ],
    [labels.reference, property.listingReference],
  ]);

  const price: DocumentBlock[] = [];
  if (offer.priceCents !== null) {
    const people = [offer.buyer, ...offer.coBuyers];
    const words = offer.priceInWords ?? priceInWordsFr(offer.priceCents);
    price.push(
      {
        kind: "text",
        text: people.length > 1 ? t.undersignedMany(names(people)) : t.undersigned(names(people)),
      },
      { kind: "strong", text: formatPrice(offer.priceCents) },
      ...(words ? [{ kind: "text" as const, text: words }] : []),
      { kind: "text", text: t.priceReserve },
    );
  }

  const financingLabels = fr.offer.financing;
  const financing: DocumentBlock[] = [];
  if (offer.financingMode !== null) {
    const loan = offer.financingMode === "loan";
    financing.push(
      ...rows([
        [t.financingQuestion, t.financingModes[offer.financingMode]],
        ...(loan
          ? ([
              [financingLabels.downPayment, formatPrice(offer.downPaymentCents)],
              [financingLabels.loanAmount, formatPrice(offer.loanAmountCents)],
              [
                financingLabels.loanDuration,
                offer.loanDurationYears === null ? "" : t.years(offer.loanDurationYears),
              ],
              [
                financingLabels.loanRate,
                offer.loanRateMaxPct === null
                  ? ""
                  : `${rateFormat.format(offer.loanRateMaxPct)}${NNBSP}%`,
              ],
              [t.lender, offer.lenderName],
              [
                financingLabels.progress,
                offer.financingProgress === null
                  ? ""
                  : offer.financingProgress === "other"
                    ? t.progressOther(offer.financingProgressOther)
                    : financingLabels.progressOptions[offer.financingProgress],
              ],
            ] satisfies [string, string][])
          : []),
      ]),
      { kind: "text", text: t.declaredByBuyer },
    );
  }

  const conditionLabels = fr.offer.conditions;
  const others = [
    offer.conditionPriorSale ? conditionLabels.priorSale : null,
    offer.conditionAuthorization ? conditionLabels.authorization : null,
    offer.conditionOther ? conditionLabels.other : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const conditions: DocumentBlock[] = [
    ...(offer.financingMode
      ? ([
          { kind: "subtitle", text: conditionLabels.financing },
          { kind: "text", text: conditionLabels.mention[offer.financingMode] },
        ] satisfies DocumentBlock[])
      : []),
    { kind: "subtitle", text: conditionLabels.others },
    others.length > 0 ? { kind: "checks", items: others } : { kind: "text", text: t.noOther },
    ...rows([[conditionLabels.details, offer.conditionsDetails]]),
  ];

  const validity: DocumentBlock[] = offer.validityUntil
    ? [{ kind: "text", text: t.validUntil(formatNumericDateTime(offer.validityUntil)) }]
    : [];

  const said = fr.offer.declarations;
  const ticked = [
    offer.visited === null ? null : offer.visited ? said.visitedText : said.notVisitedText,
    offer.declarations.accuracy ? said.accuracy : null,
    offer.declarations.priceAndFinancingChecked ? said.priceAndFinancingChecked : null,
    offer.declarations.legalEffectsUnderstood ? said.legalEffectsUnderstood : null,
    offer.declarations.infoRead ? said.infoRead : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);
  const declarations: DocumentBlock[] = [
    ...(ticked.length > 0 ? [{ kind: "checks" as const, items: ticked }] : []),
    ...(offer.declarations.acceptedAt
      ? [
          {
            kind: "text" as const,
            text: t.acceptedAt(formatNumericDateTime(offer.declarations.acceptedAt)),
          },
        ]
      : []),
  ];

  const titles = t.sections;
  return {
    title: t.title,
    meta: [
      t.reference(offer.reference),
      t.version(offer.version),
      offer.submittedAt ? t.issued(formatNumericDateTime(offer.submittedAt)) : t.notIssued,
    ],
    sections: [
      { title: titles.buyer, blocks: buyer },
      { title: titles.property, blocks: propertyBlocks },
      { title: titles.price, blocks: price },
      { title: titles.financing, blocks: financing },
      { title: titles.conditions, blocks: conditions },
      { title: titles.validity, blocks: validity },
      { title: titles.declarations, blocks: declarations },
    ].map((section, index) => ({ number: index + 1, ...section })),
    notice: said.notice,
    footer: t.footer(offer.reference, offer.version),
  };
}

/** Every text of a document, in its order (tests: what it must never say). */
export function documentTexts(document: OfferDocument): string[] {
  return [
    document.title,
    ...document.meta,
    ...document.sections.flatMap((section) => [
      section.title,
      ...section.blocks.flatMap((block) =>
        block.kind === "rows"
          ? block.rows.flatMap((row) => [row.label, row.value])
          : block.kind === "checks"
            ? block.items
            : [block.text],
      ),
    ]),
    document.notice.title,
    ...document.notice.paragraphs,
    document.footer,
  ];
}
