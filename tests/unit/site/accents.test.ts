import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Accented, splitAccent } from "@/components/shared/accented";
import { fr } from "@/lib/i18n/fr";

// L1-45 (DECISIONS 2026-10-20): the highlighted words of the V1 titles, set in
// blue (or under the dimension line of a hero), never another word.

const home = fr.site.home;

describe("mots mis en valeur des titres", () => {
  const titles: Array<[string, { title: string; accent: string }]> = [
    ["hero", home.hero],
    ["situation", home.stages],
    ["étapes", home.steps],
    ["valorisation", home.features],
    ["espace vendeur", home.space],
    ["comparatif", home.comparison],
    ["formules", home.plans],
    ["questions", home.faq],
    ["contact", home.contact],
    ["concept", fr.site.concept.hero],
    ["tarifs", fr.site.pricing],
    ["investir, hero", fr.site.invest.hero],
    ["investir, vision", fr.site.invest.vision],
    ["investir, fin", fr.site.invest.final],
    ["qui sommes-nous, hero", fr.site.about.hero],
    ["qui sommes-nous, histoire", fr.site.about.story],
    ["qui sommes-nous, fin", fr.site.about.final],
  ];

  it.each(titles)("%s : l'accent est dans son titre", (_, { title, accent }) => {
    expect(title).toContain(accent);
  });

  it("les titres de l'accueil gardent leur accent à la fin, comme en V1", () => {
    for (const [, { title, accent }] of titles.slice(0, 9))
      expect(title.endsWith(accent)).toBe(true);
  });

  it("une espace insécable avant le point d'interrogation : il ne passe jamais seul à la ligne", () => {
    for (const title of [home.stages.title, home.final.title, fr.site.concept.hero.title]) {
      expect(title).toContain("\u00a0?");
      expect(title).not.toMatch(/ \?/);
    }
  });
});

describe("splitAccent", () => {
  it("coupe le titre autour de la dernière occurrence de l'accent", () => {
    expect(splitAccent("de votre vente. votre vente.", "votre vente.")).toEqual({
      before: "de votre vente. ",
      accent: "votre vente.",
      after: "",
    });
  });

  it("rien à couper sans accent, ou s'il n'est pas dans le titre", () => {
    expect(splitAccent("Parlons-en ensemble.")).toBeNull();
    expect(splitAccent("Parlons-en ensemble.", "")).toBeNull();
    expect(splitAccent("Parlons-en ensemble.", "absent")).toBeNull();
  });
});

describe("Accented", () => {
  it("met l'accent dans sa propre balise, le reste du titre tel quel", () => {
    const html = renderToStaticMarkup(
      createElement(Accented, {
        text: "Un forfait fixe. Jamais de commission.",
        accent: "Jamais de commission.",
        className: "text-lk-blue",
      }),
    );
    expect(html).toBe('Un forfait fixe. <span class="text-lk-blue">Jamais de commission.</span>');
  });

  it("au milieu d'un titre : la dernière occurrence", () => {
    const html = renderToStaticMarkup(
      createElement(Accented, {
        text: "Combien vaut vraiment votre bien ?",
        accent: "vraiment",
        className: "a",
      }),
    );
    expect(html).toBe('Combien vaut <span class="a">vraiment</span> votre bien ?');
  });

  it("sans accent, ou s'il n'est pas dans le titre : le titre seul", () => {
    for (const accent of [undefined, "", "absent"]) {
      const html = renderToStaticMarkup(
        createElement(Accented, { text: "Parlons-en ensemble.", accent, className: "a" }),
      );
      expect(html).toBe("Parlons-en ensemble.");
    }
  });
});
