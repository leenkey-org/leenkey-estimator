import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanCard } from "@/components/shared/plan-card";

// L1-48: the large price of the plans of the home page, the other cards as they were.

const props = {
  name: "Accompagné",
  price: "990 €",
  priceSuffix: "TTC",
  tagline: "Un conseiller dédié à vos côtés, du prix à la signature.",
  note: "Forfait fixe · payé à la souscription",
};

describe("PlanCard", () => {
  it("par défaut : le prix sur la ligne de tête, avant l'accroche", () => {
    const html = renderToStaticMarkup(createElement(PlanCard, props));
    expect(html).toContain("text-lk-h2");
    expect(html).not.toContain("text-lk-display");
    expect(html.indexOf(props.price)).toBeLessThan(html.indexOf(props.tagline));
  });

  it("prix en grand : après l'accroche, au-dessus de la note", () => {
    const html = renderToStaticMarkup(createElement(PlanCard, { ...props, priceSize: "large" }));
    expect(html).toContain("text-lk-display");
    expect(html).not.toContain("text-lk-h2");
    // Once, between the tagline and the note.
    expect(html.split(props.price)).toHaveLength(2);
    expect(html.indexOf(props.tagline)).toBeLessThan(html.indexOf(props.price));
    expect(html.indexOf(props.price)).toBeLessThan(html.indexOf(props.note));
  });

  // L1-49: the glass card of the V1 home page on its navy section.
  it("sombre : la carte de verre de la V1, texte blanc, sans le fond blanc", () => {
    const html = renderToStaticMarkup(
      createElement(PlanCard, { ...props, priceSize: "large", tone: "dark" }),
    );
    expect(html).toContain("border-white/10");
    expect(html).toContain("rounded-lk-xl");
    expect(html).not.toContain("bg-lk-surface");
    expect(html).not.toContain("text-lk-ink");
  });
});
