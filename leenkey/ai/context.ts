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
