import { describe, expect, it } from "vitest";
import { fr } from "@/lib/i18n/fr";
import type { Rich } from "@/lib/i18n/rich";

// L1-50 (DECISIONS 2026-10-23): /concept, /tarifs, /faq, /investir and
// /qui-sommes-nous in the direction of the V1, their texts word for word.

const { concept, pricing, faqPage, invest, about } = fr.site;

const plain = (parts: Rich) =>
  parts
    .map((part) => (typeof part === "string" ? part : "strong" in part ? part.strong : part.link))
    .join("");
const digits = (text: string) => Number(text.replace(/\D/g, ""));

describe("labels above the titles of the V1 pages", () => {
  const eyebrows = [
    concept.options.eyebrow,
    concept.tool.eyebrow,
    concept.next.eyebrow,
    pricing.eyebrow,
    faqPage.eyebrow,
    invest.hero.eyebrow,
    invest.market.eyebrow,
    invest.vision.eyebrow,
    invest.progress.eyebrow,
    invest.model.eyebrow,
    invest.timing.eyebrow,
    invest.roadmap.eyebrow,
    invest.reasons.eyebrow,
    invest.faq.eyebrow,
    invest.contact.eyebrow,
    about.hero.eyebrow,
    about.story.eyebrow,
    about.values.eyebrow,
  ];

  it("those of the V1, word for word", () => {
    expect(eyebrows).toEqual([
      "L'idée de départ",
      "Le cœur du concept",
      "Ce que Leenkey ouvre ensuite",
      "Phase de lancement · Freemium",
      "Questions fréquentes",
      "Opportunité d'investissement · PropTech France 2026",
      "Ce que personne n'a encore vraiment résolu",
      "La vision",
      "État d'avancement",
      "Comment Leenkey crée de la valeur",
      "Le timing",
      "La vision 24 mois",
      "Ce que vous obtenez",
      "Questions fréquentes",
      "Échangeons",
      "Qui sommes-nous",
      "L'histoire",
      "Nos valeurs",
    ]);
  });

  it("written in normal case: the capitals are a style, not letters read one by one", () => {
    for (const eyebrow of eyebrows) expect(eyebrow).not.toBe(eyebrow.toUpperCase());
  });
});

describe("/investir in the direction of the V1", () => {
  it("the figure beside the market is the one of its text: 5 % of a sale at 300 000 €", () => {
    const agency = plain(invest.market.agency);
    expect(agency).toContain(`5\u202f% du prix de vente`);
    expect(agency).toContain(invest.market.example.value);
    expect(digits(invest.market.example.value)).toBe(digits(invest.market.example.label) * 0.05);
  });

  it("three sources numbered as in the V1, the third « À venir » without « V2 »", () => {
    expect(invest.model.items.map((_, index) => invest.model.source(index + 1))).toEqual([
      "Source 1",
      "Source 2",
      "Source 3",
    ]);
    expect(invest.model.items[2]).toMatchObject({ status: "next" });
  });

  it("its hero in the two paragraphs of the V1, the second to the partners", () => {
    expect(invest.hero.lead).toHaveLength(2);
    expect(invest.hero.lead[1]).toBe(
      "Nous cherchons des partenaires qui croient, comme nous, que ce marché mérite mieux.",
    );
    expect(invest.hero.lead[0]).toMatch(/^Leenkey construit la première plateforme française /);
  });

  it("no emoji, in any text of the page (DESIGN 1)", () => {
    expect(JSON.stringify(invest)).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe("/qui-sommes-nous in the direction of the V1", () => {
  it("the card on Cédric's photo: his initials, his name and his role", () => {
    expect(about.founder).toMatchObject({
      initials: "CD",
      name: "Cédric Da Cunha",
      role: "Fondateur & CEO · Leenkey",
    });
    expect(about.founder.photoAlt).toContain(about.founder.name);
  });
});
