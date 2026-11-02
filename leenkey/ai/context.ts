import type { PropertyOverview } from "./seller-data";

// The file of the seller as the model reads it with each of their messages
// (SPEC-V2 section 12: « le dossier est le contexte »), a system message
// after the message: the day, their first name, their properties (status,
// price, plan, step, tasks left) and the property the conversation is about.
// Kept with the message in the log: the model reads the same text again.

const day = (now: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

const euros = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} €`;

function propertyLine(property: PropertyOverview): string {
  const parts = [
    `- Bien ${property.propertyId} : « ${property.name} », ${property.city} (${property.postalCode}).`,
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
    "Dossier du vendeur, fourni par Leenkey (pas par le vendeur) au moment de son message :",
    `- Date : ${day(now)}.`,
    `- Prénom : ${firstName ?? "non renseigné"}.`,
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
  if (about)
    lines.push(`- La conversation porte sur le bien ${about.propertyId} (« ${about.name} »).`);
  return lines.join("\n");
}
