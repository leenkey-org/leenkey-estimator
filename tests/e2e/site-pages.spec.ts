import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-42: /concept, /tarifs and /faq in V2 (DECISIONS 2026-10-19). Without a
// database (CI), /tarifs says the plans could not be read; with the seed
// (E2E_SEED=1), it shows the three plans of the plans table.

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
