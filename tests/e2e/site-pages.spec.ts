import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-42: /concept, /tarifs and /faq in V2 (DECISIONS 2026-10-19). Without a
// database (CI), /tarifs says the plans could not be read; with the seed
// (E2E_SEED=1), it shows the three plans of the plans table. L1-43:
// /investir, /qui-sommes-nous, then the legal notice and the CGU of the V1 on
// the legal page template.

const seeded = process.env.E2E_SEED === "1";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

test.describe("pages du site en V2", () => {
  for (const [path, title] of [
    ["/concept", "Combien vaut vraiment votre bien ?"],
    ["/tarifs", "Une formule pour chaque vendeur."],
    ["/faq", "Tout ce que vous vous demandez, sans détour."],
    ["/investir", "L'immobilier français se réinvente. Soyez-en."],
    ["/qui-sommes-nous", "Rendre la vente immobilière enfin simple, humaine et transparente."],
  ] as const) {
    test(`${path} : titre, en-tête et pied V2, aucune violation sérieuse @a11y`, async ({
      page,
      isMobile,
    }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator(".lk-nav-logo")).toHaveCount(0);
      await expect(
        page.getByRole("contentinfo").getByRole("navigation", { name: "Découvrir Leenkey" }),
      ).toBeVisible();
      if (isMobile) await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("/concept : les corrections de la V1 (exclusivité, formule gratuite)", async ({ page }) => {
    await page.goto("/concept");
    await expect(page.getByText("diffusion en exclusivité sur Leenkey")).toBeVisible();
    await expect(page.getByText(/portails/)).toHaveCount(0);
    await expect(page.getByText("la formule Autonomie est entièrement gratuite")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Valoriser mon bien", exact: true }),
    ).toHaveAttribute("href", "/estimer");
    await expect(
      page.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
  });

  test("/faq : les réponses s'ouvrent au clavier, sans chiffre inventé", async ({ page }) => {
    await page.goto("/faq");
    const questions = page.locator("summary");
    await expect(questions).toHaveText([
      "Combien ça coûte, vraiment ?",
      "Suis-je vraiment accompagné, ou seul face à la plateforme ?",
      "Mes données et mes documents sont-ils en sécurité ?",
      "Combien de temps pour vendre ?",
      "Quelle est la différence avec une agence ?",
      "Et si je bloque en cours de route ?",
    ]);
    const answer = page.getByText("sont payées", { exact: false });
    await expect(answer).toBeHidden();
    await questions.first().focus();
    await page.keyboard.press("Enter");
    await expect(answer).toBeVisible();
    await expect(page.locator("details").first()).toContainText("Accompagné à 990 € TTC");
    await expect(page.getByText(/42 jours/)).toHaveCount(0);
  });

  test("/investir : sans projection ni chiffre sans source, ni diffusion vers des portails", async ({
    page,
  }) => {
    await page.goto("/investir");
    const main = page.getByRole("main");
    await expect(main).toContainText("des milliards d'euros");
    for (const removed of [/M€/, /MRR|ARR|NPS/, /10 milliards/, /1 000 000/, /diffusion auto/i]) {
      await expect(main.getByText(removed)).toHaveCount(0);
    }
    const milestone = main
      .getByRole("listitem")
      .filter({ hasText: "V2 — Automatisation et scale" });
    await expect(milestone).toContainText("En cours");
    await expect(main.getByRole("link", { name: /Contacter par WhatsApp/ })).toHaveAttribute(
      "href",
      /^https:\/\/wa\.me\/33613845451\?text=Bonjour%20C%C3%A9dric/,
    );
    await expect(main.getByRole("link", { name: /Écrire à l'équipe Leenkey/ })).toHaveAttribute(
      "href",
      /^mailto:contact\.leenkey@gmail\.com\?subject=Investir%20dans%20Leenkey&body=/,
    );
    // Every call to action leads to the form of the page.
    for (const name of ["Rejoindre l'aventure", "Parlons-en", "Rejoindre le projet"]) {
      await expect(main.getByRole("link", { name, exact: true })).toHaveAttribute(
        "href",
        "#formulaire",
      );
    }
  });

  test("/investir : le formulaire part vers /api/contact avec la source « investir »", async ({
    page,
  }) => {
    let body: { source?: string; data?: Record<string, string> } = {};
    await page.route("**/api/contact", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto("/investir#formulaire");
    const form = page.locator("#invest-form");
    await expect(form.locator("#if-motif option")).toHaveText([
      "Choisissez",
      "Je souhaite investir dans Leenkey",
      "Je veux vendre mon bien (question)",
      "Je suis un partenaire (notaire, conseiller…)",
      "Autre demande",
    ]);
    await form.locator('[name="motif"]').selectOption({ index: 1 });
    await form.locator('[name="prenom"]').fill("Test");
    await form.locator('[name="nom"]').fill("Recette");
    await form.locator('[name="email"]').fill("test@example.com");
    await form.locator('[name="message"]').fill("Message de recette");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.locator("#invest-form ~ .form-success")).toBeVisible();
    expect(body.source).toBe("investir");
    expect(body.data?.motif).toBe("Investisseur");
  });

  test("/qui-sommes-nous : la photo de Cédric et les chemins vers le contact", async ({ page }) => {
    await page.goto("/qui-sommes-nous");
    const main = page.getByRole("main");
    const photo = main.getByRole("img", { name: "Cédric Da Cunha, fondateur de Leenkey" });
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(720);
    await expect(main.getByRole("link", { name: "Découvrir notre vision" })).toHaveAttribute(
      "href",
      "/investir",
    );
    await expect(main.getByRole("link", { name: "Nous contacter" })).toHaveAttribute(
      "href",
      "/#contact",
    );
    await expect(
      main.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
  });

  test("/tarifs sans base : le message d'indisponibilité", async ({ page }) => {
    test.skip(seeded, "base de seed : voir plus bas");
    await page.goto("/tarifs");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "Les formules n'ont pas pu être chargées.",
    );
  });
});

test.describe("/tarifs (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("les trois formules de la table plans, Autonomie mise en avant", async ({ page }) => {
    await page.goto("/tarifs");
    const plans = page.locator("article");
    await expect(plans).toHaveCount(3);
    await expect(plans.getByRole("heading", { level: 2 })).toHaveText([
      "Autonomie",
      "Accompagné",
      "Sérénité",
    ]);
    await expect(plans.nth(0)).toContainText("Disponible gratuitement");
    await expect(plans.nth(0)).toContainText("Publication de l'annonce sur Leenkey");
    await expect(plans.nth(1)).toContainText("990 €");
    await expect(plans.nth(1)).toContainText("Tout Autonomie, plus :");
    await expect(plans.nth(1)).toContainText("Forfait fixe TTC · payé à la souscription");
    await expect(plans.nth(2)).toContainText("1 500 €");
    // Only the free plan is the primary action.
    await expect(
      plans.nth(0).getByRole("link", { name: "Commencer gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
    // The V1 lists of another offer are gone.
    await expect(page.getByText("Garantie juridique")).toHaveCount(0);
  });

  test("« Mon économie vs agence » : l'économie indicative à la place du prix", async ({
    page,
  }) => {
    await page.goto("/tarifs");
    const plans = page.locator("article");
    await page.getByRole("radio", { name: "Mon économie vs agence" }).click();
    await expect(plans.nth(1)).toContainText("−14 010 € vs agence");
    await expect(plans.nth(2)).toContainText("−13 500 € vs agence");
    await expect(plans.nth(1)).toContainText("Économie indicative sur un bien à 350 000 €");
    await expect(plans.nth(0)).toContainText("Gratuit");
    await page.getByRole("radio", { name: "Gratuit pendant le lancement" }).click();
    await expect(plans.nth(1)).toContainText("990 €");
  });
});

test.describe("mentions légales et CGU de la V1", () => {
  for (const [path, title] of [
    ["/mentions-legales", "Mentions légales"],
    ["/cgu", "Conditions générales d'utilisation"],
  ] as const) {
    test(`${path} : le texte en vigueur, sans mention de rédaction @a11y`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.getByText("Cette page est en cours de rédaction.")).toHaveCount(0);
      await expect(page.locator(".lk-legal")).toHaveCount(0);
      await expect(
        page.getByRole("contentinfo").getByRole("navigation", { name: "Découvrir Leenkey" }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("/mentions-legales garde ses ancres et ses liens", async ({ page }) => {
    await page.goto("/mentions-legales#rgpd");
    await expect(
      page.getByRole("heading", { name: "5. Données personnelles (RGPD)" }),
    ).toBeInViewport();
    await expect(
      page.locator("#cookies").getByRole("link", { name: "politique cookies" }),
    ).toHaveAttribute("href", "/cookies");
    await expect(page.getByRole("link", { name: "+33 6 13 84 54 51" })).toHaveAttribute(
      "href",
      "tel:+33613845451",
    );
  });

  test("/cgu : le sommaire mène à chaque article, version 1.0", async ({ page }) => {
    await page.goto("/cgu");
    await expect(page.getByText("Dernière mise à jour : 28 juin 2026 · Version 1.0")).toBeVisible();
    const toc = page.getByRole("navigation", { name: "Sommaire" });
    await expect(toc.getByRole("link")).toHaveCount(12);
    await toc.getByRole("link", { name: "5. Tarifs et paiement" }).click();
    await expect(page).toHaveURL(/\/cgu#tarifs$/);
    await expect(page.getByRole("heading", { name: "5. Tarifs et paiement" })).toBeInViewport();
    await expect(page.getByRole("status").filter({ hasText: "Important :" })).toHaveCount(0);
    await expect(page.getByText("pas une agence immobilière")).toBeVisible();
  });
});
