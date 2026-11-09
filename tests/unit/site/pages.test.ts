import { describe, expect, it } from "vitest";
import { emailHref, LEENKEY_WHATSAPP, whatsappHref } from "@/leenkey/site/contact-links";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";
import { fr } from "@/lib/i18n/fr";
import type { LegalSection } from "@/lib/i18n/legal-texts";
import type { Rich } from "@/lib/i18n/rich";

// L1-43: /investir, /qui-sommes-nous, the legal notice and the CGU of the V1
// in V2 (DECISIONS 2026-10-19).

const invest = fr.site.invest;
const { notice, terms, salesTerms, privacy, reporting, ai } = fr.legal;

/** Every text of a part of fr, as plain strings (bold parts and links too). */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === "object") return Object.values(value).flatMap(texts);
  return [];
}

const plain = (parts: Rich) =>
  parts
    .map((part) => (typeof part === "string" ? part : "strong" in part ? part.strong : part.link))
    .join("")
    .replace(/[\u00A0\u202F]/g, " ");

describe("contact links of /investir", () => {
  it("WhatsApp to Cédric, with the first message ready", () => {
    expect(whatsappHref(invest.contact.whatsapp.message)).toBe(
      `https://wa.me/${LEENKEY_WHATSAPP}?text=Bonjour%20C%C3%A9dric%2C%20je%20souhaiterais%20%C3%A9changer%20avec%20vous%20au%20sujet%20de%20Leenkey.`,
    );
  });

  it("the number is the one of the legal notice", () => {
    const phone = texts(notice.sections).find((text) => text.startsWith("tel:"));
    expect(phone).toBe(`tel:+${LEENKEY_WHATSAPP}`);
  });

  it("an email to the team, its subject and body encoded", () => {
    expect(
      emailHref(fr.legal.contactEmail, invest.contact.email.subject, invest.contact.email.body),
    ).toBe(
      "mailto:contact.leenkey@gmail.com?subject=Investir%20dans%20Leenkey&body=Bonjour%20C%C3%A9dric%2C%0A%0AJe%20souhaite%20%C3%A9changer%20au%20sujet%20du%20projet%20Leenkey.",
    );
  });
});

describe("texts of /investir", () => {
  // The figures are written with no-break spaces: plain ones for the patterns.
  const all = texts(invest)
    .join("\n")
    .replace(/[\u00A0\u202F]/g, " ");

  it("no forecast, target or market figure without a source (Q53)", () => {
    for (const removed of [
      /M€/,
      /\bMRR\b/,
      /\bARR\b/,
      /\bNPS\b/,
      /CA annuel/,
      /10 milliards/,
      /1 000 000/,
    ]) {
      expect(all).not.toMatch(removed);
    }
  });

  it("no diffusion to other portals, no « modèle entraîné »", () => {
    expect(all).not.toMatch(/diffusion auto/i);
    expect(all).not.toMatch(/entraîn/i);
  });

  it("every milestone and source of income has a known stage", () => {
    const stages = Object.keys(invest.status);
    for (const item of invest.progress.items) expect(stages).toContain(item.status);
    for (const item of invest.model.items) {
      if ("status" in item) expect(stages).toContain(item.status);
    }
  });
});

describe("legal texts of the launch (2026-11-09)", () => {
  const sets: [string, readonly LegalSection[]][] = [
    ["notice", notice.sections],
    ["terms", terms.sections],
    // The model form of withdrawal closes the CGV, without a number.
    ["salesTerms", salesTerms.sections.filter((section) => section.id !== "formulaire")],
    ["privacy", privacy.sections],
    ["reporting", reporting.sections],
    ["ai", ai.sections],
  ];

  it("unique anchors, numbered titles in order", () => {
    for (const [, sections] of sets) {
      const ids = sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      sections.forEach((section, index) =>
        expect(section.title).toMatch(new RegExp(`^${index + 1}\\. `)),
      );
    }
    // Links already shared (footer of the V1, emails).
    expect(notice.sections.map((section) => section.id)).toEqual(
      expect.arrayContaining(["rgpd", "cookies"]),
    );
  });

  it("the CGU shown are the version accepted at signup", () => {
    const [year, month, day] = LEGAL_VERSIONS.cgu.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    expect(terms.updated).toBe(`En vigueur depuis le ${date} · Version 2.0`);
  });

  it("the CGU describe the plans decided on 2026-11-06", () => {
    const text = terms.sections
      .find((section) => section.id === "formules")
      ?.blocks.map((block) =>
        block.kind === "p" ? plain(block.text) : block.kind === "subtitle" ? block.text : "",
      )
      .join(" ");
    expect(text).toContain("Elle ne comprend pas d'accompagnement par un conseiller.");
    expect(text).toContain("jamais renouvelées automatiquement");
    expect(text).not.toMatch(/call|phase de lancement/);
  });

  it("the prices of the CGU are those of the plans table (seed)", async () => {
    const { readFileSync } = await import("node:fs");
    const { formatPrice } = await import("@/lib/format");
    const seed = readFileSync("supabase/seed/01_plans.sql", "utf8");
    const price = (code: string) => {
      const match = seed.match(new RegExp(`\\('${code}', '[^']+', '(?:[^']|'')+', (\\d+),`));
      if (!match) throw new Error(`no price for ${code} in the seed`);
      return formatPrice(Number(match[1])).replace(/[\u00A0\u202F]/g, " ");
    };
    const paid = terms.sections
      .find((section) => section.id === "formules")
      ?.blocks.find(
        (block) => block.kind === "p" && plain(block.text).startsWith("Les formules Accompagné"),
      );
    if (paid?.kind !== "p") throw new Error("no paragraph of the paid plans");
    expect(plain(paid.text)).toContain(`Accompagné (${price("accompagne")} TTC)`);
    expect(plain(paid.text)).toContain(`Sérénité (${price("serenite")} TTC)`);
    expect(plain(paid.text)).toContain("à la souscription");
  });

  it("no placeholder, no « on », the editorial rules of the site", () => {
    const all = sets
      .flatMap(([, sections]) => texts(sections))
      .concat(texts(salesTerms.sections))
      .join(" ");
    expect(all).not.toMatch(/À COMPLÉTER|À CONFIRMER|À VALIDER|\[|\]/);
    // « façon » is not « on »: letters with accents count as letters.
    expect(all).not.toMatch(/(^|[^\p{L}])on([^\p{L}]|$)/iu);
    expect(all).not.toMatch(/au succès|prix ferme/i);
  });

  it("the CGV give the withdrawal, its button and its model form", () => {
    const text = texts(salesTerms.sections).join(" ");
    expect(text).toContain("« Renoncer au contrat »");
    expect(text).toContain("14 jours");
    expect(text).toContain("Formule souscrite : ____________________");
    expect(text).toContain("510");
  });
});
