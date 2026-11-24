import { formatInteger, formatPrice, formatWaiting } from "@/lib/format";

// « Résumé du jour » of the dashboard (L1-30b, SPEC-V2 17): the facts given
// to the model, how they are written for it, the cache of an hour and the
// text kept from its answer. No server code here: the facts are read by
// leenkey/admin/dashboard/daily-brief.ts.

/** What the dashboard reads, counted by the database with the admin's session. */
export type DailyBriefFacts = {
  listingsPending: number;
  /** When the oldest listing to review was sent; null without any. */
  listingsOldestSubmittedAt: string | null;
  casesOpen: number;
  reportsOpen: number;
  /** Advisor conversations where the seller wrote last, unread by the team. */
  advisorUnread: number;
  /** Interventions of the adviser that wait for the team. */
  interventionsOpen: number;
  financingToCheck: number;
  identityToCheck: number;
  /** Identity files still stored after their document reached its end. */
  identityFilesToDelete: number;
  /** Offers sent that wait for the answer of their seller. */
  offersWaiting: number;
  /** The last 24 hours. */
  offersSent: number;
  signupsSellers: number;
  signupsBuyers: number;
  plansSold: number;
  plansAmountCents: number;
};

/** A brief as the dashboard shows it. */
export type DailyBrief = {
  text: string;
  /** When it was written. */
  createdAt: string;
  /** « Régénérer » asked too soon after the last brief: the last one is shown. */
  tooSoon?: boolean;
};

/** A brief is kept an hour (SPEC 17: « mis en cache 1 h »). */
export const DAILY_BRIEF_CACHE_MS = 60 * 60 * 1000;
/** « Régénérer » writes a new brief 5 minutes at least after the last one (as the base checks it). */
export const DAILY_BRIEF_REGENERATE_MS = 5 * 60 * 1000;
/** Lines of the brief at most. */
export const DAILY_BRIEF_LINES = 5;
/** Characters of the brief at most (the table takes 1 200). */
export const DAILY_BRIEF_MAX = 800;
/** The 24 h target of the review of a listing (SPEC 17, DECISIONS 2026-10-15). */
const REVIEW_TARGET_MS = 24 * 60 * 60 * 1000;

export type BriefDecision = "cached" | "generate" | "too_soon";

/**
 * What to do with the last brief: show it while it is less than an hour
 * old; on « Régénérer », write a new one unless the last is less than 5
 * minutes old (then show it, and say so).
 */
export function briefDecision(
  latest: { createdAt: string } | null,
  now: Date,
  regenerate: boolean,
): BriefDecision {
  if (!latest) return "generate";
  const age = now.getTime() - Date.parse(latest.createdAt);
  if (!Number.isFinite(age)) return "generate";
  if (regenerate) return age < DAILY_BRIEF_REGENERATE_MS ? "too_soon" : "generate";
  return age < DAILY_BRIEF_CACHE_MS ? "cached" : "generate";
}

/** Nothing waits for the team and nothing happened in the last 24 hours. */
export function isQuietDay(facts: DailyBriefFacts): boolean {
  return [
    facts.listingsPending,
    facts.casesOpen,
    facts.reportsOpen,
    facts.advisorUnread,
    facts.interventionsOpen,
    facts.financingToCheck,
    facts.identityToCheck,
    facts.identityFilesToDelete,
    facts.offersWaiting,
    facts.offersSent,
    facts.signupsSellers,
    facts.signupsBuyers,
    facts.plansSold,
  ].every((value) => value === 0);
}

const n = (value: number) => formatInteger(value);

/** What the model writes the brief from: the figures, nothing else. */
export function briefPrompt(facts: DailyBriefFacts, now: Date): string {
  const oldest = facts.listingsOldestSubmittedAt;
  const late = oldest !== null && now.getTime() - Date.parse(oldest) > REVIEW_TARGET_MS;
  const listings =
    facts.listingsPending > 0 && oldest
      ? `${n(facts.listingsPending)} (la plus ancienne attend depuis ${formatWaiting(oldest, now)}, ${
          late ? "au-delà de l'objectif de 24 h" : "dans l'objectif de 24 h"
        })`
      : n(facts.listingsPending);
  const lines = [
    "<a_traiter>",
    `Annonces à valider : ${listings}`,
    `Dossiers ouverts : ${n(facts.casesOpen)}`,
    `Signalements ouverts : ${n(facts.reportsOpen)}`,
    `Messages clients non lus : ${n(facts.advisorUnread)}`,
    `Interventions du conseiller à traiter : ${n(facts.interventionsOpen)}`,
    `Justificatifs de financement à contrôler : ${n(facts.financingToCheck)}`,
    `Pièces d'identité à contrôler : ${n(facts.identityToCheck)}`,
    `Fichiers de pièces d'identité à supprimer : ${n(facts.identityFilesToDelete)}`,
    `Offres en attente de la réponse du vendeur : ${n(facts.offersWaiting)}`,
    "</a_traiter>",
    "",
    "<dernieres_24_heures>",
    `Inscriptions : ${n(facts.signupsSellers)} vendeur(s), ${n(facts.signupsBuyers)} acquéreur(s)`,
    `Formules vendues : ${n(facts.plansSold)}${
      facts.plansSold > 0 ? ` (${formatPrice(facts.plansAmountCents)} TTC)` : ""
    }`,
    `Offres envoyées : ${n(facts.offersSent)}`,
    "</dernieres_24_heures>",
    "",
  ];
  if (isQuietDay(facts)) {
    lines.push(
      "Rien n'attend l'équipe et il n'y a eu aucune activité ces dernières 24 heures.",
      "",
    );
  }
  lines.push("Rédige le résumé du jour à partir de ces chiffres seulement.");
  return lines.join("\n");
}

/**
 * The brief kept from the answer of the model: plain lines (no bullet, no
 * bold), five at most, 800 characters at most cut at the end of a line or a
 * sentence; empty when nothing is left.
 */
export function briefText(answer: string): string {
  const lines = answer
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*|__/g, "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, "")
        .replace(/^#+\s*/, "")
        .trim(),
    )
    .filter((line) => line !== "")
    .slice(0, DAILY_BRIEF_LINES);
  let text = "";
  for (const line of lines) {
    const next = text === "" ? line : `${text}\n${line}`;
    if (Array.from(next).length <= DAILY_BRIEF_MAX) {
      text = next;
      continue;
    }
    if (text === "") {
      const kept = Array.from(line).slice(0, DAILY_BRIEF_MAX).join("");
      const end = kept.lastIndexOf(". ");
      text = (end > DAILY_BRIEF_MAX / 2 ? kept.slice(0, end + 1) : kept).trim();
    }
    break;
  }
  return text;
}
