import type { BuyerFile, BuyerOfferFact } from "./buyer-data";
import type { PropertyOverview } from "./seller-data";

// The file of the seller as the model reads it with each of their messages
// (SPEC-V2 section 12: « le dossier est le contexte »), before the message,
// between <dossier> tags: the day, their first name, their properties
// (status, price, plan, step, tasks left) and the property the conversation
// is about. Data, never instructions: what the seller typed (a title, their
// first name) is kept on one line and cut short. Kept with the message in the
// log: the model reads the same text again.

const day = (now: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

/** A value typed by the seller: one line, 120 characters at most, no tag. */
export function typed(value: string): string {
  return value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
}

const euros = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;

function propertyLine(property: PropertyOverview): string {
  const parts = [
    `- Bien ${property.propertyId} : « ${typed(property.name)} », ${typed(property.city)} (${typed(property.postalCode)}).`,
  ];
  parts.push(
    property.listingStatus
      ? `Annonce : ${property.listingStatus}${property.priceEuros !== null ? `, ${euros(property.priceEuros)}` : ""}.`
      : "Annonce pas encore rédigée.",
  );
  if (property.plan) {
    parts.push(`Formule : ${property.plan.name} (${property.plan.paid ? "payante" : "gratuite"}).`);
  }
  if (property.step) {
    parts.push(
      `Étape ${property.step.position} sur ${property.step.total} : ${property.step.title}.`,
    );
    parts.push(
      property.tasksToDo.length > 0
        ? `Tâches restantes de l'étape : ${property.tasksToDo.join(" ; ")}.`
        : "Toutes les tâches de l'étape sont faites.",
    );
  }
  return parts.join(" ");
}

export function sellerContextText({
  firstName,
  now,
  overview,
  total,
  propertyId,
}: {
  firstName: string | null;
  now: Date;
  overview: readonly PropertyOverview[];
  /** All the properties of the seller (the overview shows 10 at most). */
  total: number;
  /** The property the conversation is about, if any. */
  propertyId: string | null;
}): string {
  const lines = [
    "<dossier>",
    "Dossier du vendeur au moment de son message, résumé par Leenkey (les noms et titres sont ceux qu'il a saisis) :",
    `- Date : ${day(now)}.`,
    `- Prénom : ${firstName ? typed(firstName) : "non renseigné"}.`,
  ];
  if (overview.length === 0) {
    lines.push("- Aucun bien pour l'instant : il peut en créer un depuis « Ma vente ».");
  } else {
    lines.push(
      `- Biens : ${total}${total > overview.length ? ` (les ${overview.length} plus récents ci-dessous)` : ""}.`,
    );
    lines.push(...overview.map(propertyLine));
  }
  const about = propertyId ? overview.find((property) => property.propertyId === propertyId) : null;
  if (about) {
    lines.push(
      `- La conversation porte sur le bien ${about.propertyId} (« ${typed(about.name)} »).`,
    );
  }
  lines.push("</dossier>");
  return lines.join("\n");
}

// The file of a buyer (L2-06), in the same way: their buying project and the
// status of their financing file (the budget, never the other amounts nor
// the proof), their offers with their dates, and the listing they are
// reading when they write.

const PROJECTS = {
  residence_principale: "résidence principale",
  residence_secondaire: "résidence secondaire",
  investissement: "investissement",
} as const;

function offerLine(offer: BuyerOfferFact): string {
  const parts = [
    `- Offre ${offer.reference || offer.offerId} sur l'annonce ${offer.listingId} (« ${typed(offer.listingTitle)} », ${typed(offer.city)}) : ${offer.status}`,
  ];
  if (offer.priceEuros !== null) parts.push(`, ${euros(offer.priceEuros)}`);
  if (offer.sentOn) parts.push(`, envoyée le ${offer.sentOn}`);
  if (offer.validUntil) parts.push(`, valable jusqu'au ${offer.validUntil}`);
  parts.push(".");
  if (offer.precontractSignedOn) {
    parts.push(` Avant-contrat signé le ${offer.precontractSignedOn}.`);
    parts.push(
      offer.withdrawalStart
        ? ` Délai de rétractation : départ enregistré le ${offer.withdrawalStart}${offer.withdrawalEnd ? `, fin indicative le ${offer.withdrawalEnd} (le notaire fait foi)` : ""}.`
        : " Délai de rétractation : date de départ non enregistrée dans le dossier.",
    );
  }
  return parts.join("");
}

export function buyerContextText({
  firstName,
  now,
  file,
}: {
  firstName: string | null;
  now: Date;
  file: BuyerFile;
}): string {
  const lines = [
    "<dossier>",
    "Dossier de l'acquéreur au moment de son message, résumé par Leenkey (les noms et titres sont ceux qui ont été saisis) :",
    `- Date : ${day(now)}.`,
    `- Prénom : ${firstName ? typed(firstName) : "non renseigné"}.`,
  ];
  const project = file.project;
  if (!project || !project.declared) {
    lines.push(
      "- Projet d'achat : non renseigné. Il se renseigne sur la page « Mon projet d'achat » ; une offre ne peut être préparée qu'ensuite.",
    );
  } else {
    const parts = [`- Projet d'achat : ${project.kind ? PROJECTS[project.kind] : "non précisé"}`];
    if (project.cities.length > 0) {
      parts.push(` ; villes recherchées : ${project.cities.slice(0, 10).map(typed).join(", ")}`);
    }
    if (project.budgetMaxEuros !== null) {
      parts.push(` ; budget maximum déclaré : ${euros(project.budgetMaxEuros)}`);
    }
    lines.push(`${parts.join("")}.`);
    lines.push(
      `- Dossier de financement : ${project.financing}${project.financingCheckedOn ? ` (contrôlé par Leenkey le ${project.financingCheckedOn})` : ""}.`,
    );
  }
  if (file.offers.length === 0) {
    lines.push("- Offres d'achat : aucune.");
  } else {
    lines.push(
      `- Offres d'achat : ${file.offersTotal}${file.offersTotal > file.offers.length ? ` (les ${file.offers.length} plus récentes ci-dessous)` : ""}.`,
    );
    lines.push(...file.offers.map(offerLine));
  }
  if (file.listing) {
    lines.push(
      `- Annonce consultée en ce moment : ${file.listing.listingId} (« ${typed(file.listing.title)} », ${typed(file.listing.city)}, prix affiché ${euros(file.listing.priceEuros)}).`,
    );
  }
  lines.push("</dossier>");
  return lines.join("\n");
}
