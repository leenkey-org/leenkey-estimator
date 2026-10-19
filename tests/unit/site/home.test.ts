import { describe, expect, it } from "vitest";
import { latestOf, LATEST_COUNT } from "@/leenkey/search/latest";
import { fr } from "@/lib/i18n/fr";
import {
  CONTACT_MOTIFS,
  contactRequest,
  parseContact,
  type ContactFormValues,
} from "@/lib/validations/contact";

// L1-41: the home page rebuilt in V2 (SPEC-V2 8.1, DECISIONS 2026-10-19).

const site = fr.site;

describe("« Les derniers biens »", () => {
  it("the three most recent, or nothing below three", () => {
    expect(LATEST_COUNT).toBe(3);
    expect(latestOf(["a", "b", "c", "d", "e"])).toEqual(["a", "b", "c"]);
    expect(latestOf(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(latestOf(["a", "b"])).toEqual([]);
    expect(latestOf([])).toEqual([]);
  });

  it("« Voir les 12 biens », one listing alone named as such", () => {
    expect(site.home.latest.all(12, "12")).toBe("Voir les 12 biens");
    expect(site.home.latest.all(1, "1")).toBe("Voir le bien");
  });
});

describe("contact form of the site", () => {
  const filled = {
    motif: "Vendeur",
    prenom: "  Alice ",
    nom: "Martin",
    email: " alice@exemple.test ",
    telephone: "",
    message: " Une question sur la formule Accompagné. ",
  };

  it("takes the values trimmed, the phone optional", () => {
    const checked = parseContact(filled);
    expect(checked).toEqual({
      ok: true,
      data: {
        motif: "Vendeur",
        prenom: "Alice",
        nom: "Martin",
        email: "alice@exemple.test",
        telephone: "",
        message: "Une question sur la formule Accompagné.",
      },
    });
  });

  it("says what is missing or wrong, field by field", () => {
    const checked = parseContact({
      motif: "",
      prenom: " ",
      nom: "",
      email: "alice@",
      telephone: "0".repeat(31),
      message: "x".repeat(4001),
    });
    expect(checked).toEqual({
      ok: false,
      errors: {
        motif: "motif",
        prenom: "required",
        nom: "required",
        email: "email",
        telephone: "tooLong",
        message: "tooLong",
      },
    });
    expect(parseContact({ ...filled, email: "" })).toMatchObject({
      ok: false,
      errors: { email: "required" },
    });
    // A motif the endpoint does not know is refused.
    expect(parseContact({ ...filled, motif: "Spam" })).toMatchObject({
      ok: false,
      errors: { motif: "motif" },
    });
    expect(parseContact(null)).toMatchObject({ ok: false });
  });

  it("posts what the V1 pages posted to /api/contact", () => {
    const checked = parseContact(filled);
    if (!checked.ok) throw new Error("expected valid values");
    const body = contactRequest("contact", checked.data);
    expect(body.source).toBe("contact");
    expect(Object.keys(body.data)).toEqual([
      "motif",
      "prenom",
      "nom",
      "email",
      "telephone",
      "message",
    ]);
    const values: ContactFormValues = checked.data;
    expect(body.data).toEqual(values);
  });

  it("offers the motifs that /api/contact reads, without emoji", () => {
    expect(site.contact.motifs.map((motif) => motif.value)).toEqual([...CONTACT_MOTIFS]);
    for (const motif of site.contact.motifs) {
      expect(motif.label).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe("situations of « Où en êtes-vous dans votre vente ? »", () => {
  it("four situations, each with its answer and its way on", () => {
    const items = site.home.stages.items;
    expect(items.map((item) => item.label)).toEqual([
      "Je réfléchis",
      "Je veux connaître mon prix",
      "Je prépare ma vente",
      "Mon bien est déjà en vente",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/estimer",
      "/estimer",
      "/estimer",
      "#contact",
    ]);
    for (const item of items) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.text.length).toBeGreaterThan(0);
    }
  });
});

/** Every text of the public site, functions called with sample values. */
function texts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return texts((value as (...args: unknown[]) => unknown)(3, "3"));
  if (Array.isArray(value)) return value.flatMap(texts);
  if (value && typeof value === "object") return Object.values(value).flatMap(texts);
  return [];
}

describe("editorial rules of the site (CLAUDE.md section 16, DESIGN.md 1)", () => {
  const all = texts(site);

  it("speaks with « nous », never « on »", () => {
    for (const text of all) expect(text).not.toMatch(/(^|[\s'’])on(\s|$)/i);
  });

  it("never « estimation » alone, « Prix ferme », « au succès » nor « ouvrées »", () => {
    for (const text of all) {
      expect(text).not.toMatch(/\bestimation\b/i);
      expect(text).not.toMatch(/prix ferme/i);
      expect(text).not.toMatch(/au succès/i);
      expect(text).not.toMatch(/ouvrées/i);
    }
  });

  it("no arrow after a label, no emoji, no portals but Leenkey's (exclusive listings)", () => {
    for (const text of all) {
      expect(text).not.toContain("→");
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(text).not.toMatch(/portails|portail(?! Leenkey)/i);
    }
  });

  it("the contact form answers « sous 48 h, 7 j/7 »", () => {
    for (const text of [site.home.contact.lead, site.contact.note, site.contact.sent.text]) {
      expect(text).toContain("48 h, 7 j/7");
      expect(text).not.toContain("24 h");
    }
  });

  it("paid plans « payés à la souscription »", () => {
    expect(site.home.plans.items.accompagne.note).toContain("payé à la souscription");
    expect(site.home.plans.items.serenite.note).toContain("payé à la souscription");
  });
});

describe("pages of the site (L1-42)", () => {
  it("splits the text of a plan around its list", async () => {
    const { splitDescription } = await import("@/core/billing/plan-text");
    expect(splitDescription("Sans engagement.")).toEqual({
      intro: "Sans engagement.",
      outro: null,
    });
    expect(
      splitDescription(
        "Tout Autonomie, plus :\nLe propriétaire continue de gérer sa vente et réalise ses visites.",
      ),
    ).toEqual({
      intro: "Tout Autonomie, plus :",
      outro: "Le propriétaire continue de gérer sa vente et réalise ses visites.",
    });
    expect(splitDescription("")).toEqual({ intro: null, outro: null });
  });

  it("« Mon économie vs agence »: the fee of the example minus the price", async () => {
    const { savingCents, EXAMPLE_AGENCY_FEE_CENTS } = await import("@/leenkey/site/pricing");
    expect(savingCents(99_000)).toBe(1_401_000);
    expect(savingCents(150_000)).toBe(1_350_000);
    expect(savingCents(0)).toBeNull();
    expect(savingCents(EXAMPLE_AGENCY_FEE_CENTS + 1)).toBe(0);
    expect(site.pricing.savings("14 010 €")).toBe("−14 010 € vs agence");
  });

  it("the prices written in the texts are those of the plans table (seed)", async () => {
    const { readFileSync } = await import("node:fs");
    const { formatPrice } = await import("@/lib/format");
    const seed = readFileSync("supabase/seed/01_plans.sql", "utf8");
    const price = (code: string) => {
      const match = seed.match(new RegExp(`\\('${code}', '[^']+', '(?:[^']|'')+', (\\d+),`));
      if (!match) throw new Error(`no price for ${code} in the seed`);
      return Number(match[1]);
    };
    const accompagne = formatPrice(price("accompagne"));
    const serenite = formatPrice(price("serenite"));
    const faq = texts(site.faqPage.items[0].answer).join("");
    expect(faq).toContain(`Accompagné à ${accompagne} TTC`);
    expect(faq).toContain(`Sérénité à ${serenite} TTC`);
    const leenkey = site.home.comparison.columns.find((column) => column.key === "leenkey");
    expect(leenkey?.values[0]).toBe(`${accompagne.replace(" €", "")} à ${serenite}`);
  });
});
