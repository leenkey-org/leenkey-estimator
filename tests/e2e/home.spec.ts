import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-41: the home page in V2 (SPEC-V2 8.1, DECISIONS 2026-10-19). Two modes,
// like search.spec.ts:
// - without a database (CI): the hero, the sections of the V1 page and their
//   anchors, the contact form (answer of /api/contact simulated), the
//   situations, the menu; neither the latest listings nor the plan cards;
// - E2E_SEED=1 (local stack or preprod): the three latest listings and the
//   three plans read from the database.

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

const ANCHORS = [
  "valoriser",
  "etape",
  "comment",
  "fonctionnalites",
  "comparatif",
  "tarifs",
  "faq",
  "contact",
];

test.describe("accueil", () => {
  test("hero : « Je vends » vers l'estimateur, « J'achète » vers les annonces", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Leenkey vous donne les clés de votre vente.",
    );
    const entries = page.getByRole("group", { name: "Vendre ou acheter" });
    await expect(entries.getByRole("link")).toHaveText(["Je vends", "J'achète"]);
    await expect(entries.getByRole("link", { name: "Je vends" })).toHaveAttribute(
      "href",
      "/estimer",
    );
    await expect(entries.getByRole("link", { name: "J'achète" })).toHaveAttribute(
      "href",
      "/acheter",
    );
    // Two equal entries.
    const [sell, buy] = await Promise.all(
      ["Je vends", "J'achète"].map((name) => entries.getByRole("link", { name }).boundingBox()),
    );
    expect(sell?.width).toBe(buy?.width);
    expect(sell?.height).toBe(buy?.height);
    // The V1 page is gone: no invented figure, no V1 menu.
    await expect(page.getByText("vs prix agence")).toHaveCount(0);
    await expect(page.locator(".lk-nav-logo")).toHaveCount(0);
  });

  test("les sections de la V1 gardent leurs ancres et leurs textes", async ({ page }) => {
    await page.goto("/");
    for (const anchor of ANCHORS) await expect(page.locator(`#${anchor}`)).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2 })).toContainText([
      "Où en êtes-vous dans votre vente ?",
      "Trois étapes. Vous gardez les clés du début à la fin.",
      "Ce que vous obtenez en quelques minutes.",
      "Vous savez toujours quoi faire ensuite.",
      "Bénéficiez d'un support total et gardez votre indépendance.",
      "Un forfait fixe. Jamais de commission.",
      "Les trois questions essentielles.",
      "Parlons-en ensemble.",
      "Prêt à garder les clés de votre vente ?",
    ]);
    await expect(page.getByText("Étape 1 sur 3")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir le détail des formules" })).toHaveAttribute(
      "href",
      "/tarifs",
    );
    await expect(page.getByRole("link", { name: "Toutes les questions" })).toHaveAttribute(
      "href",
      "/faq",
    );
    // An anchor of the V1 links still lands on its section.
    await page.goto("/#tarifs");
    await expect(page.locator("#tarifs")).toBeInViewport();
  });

  test("« Où en êtes-vous » : la réponse suit la situation choisie", async ({ page }) => {
    await page.goto("/");
    const situations = page.getByRole("group", { name: "Votre situation" });
    const first = situations.getByRole("button", { name: "Je réfléchis" });
    const onSale = situations.getByRole("button", { name: "Mon bien est déjà en vente" });
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("link", { name: "Commencer gratuitement" })).toHaveAttribute(
      "href",
      "/estimer",
    );
    await onSale.click();
    await expect(onSale).toHaveAttribute("aria-pressed", "true");
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("heading", { name: "Faites le point sur votre vente en cours." }),
    ).toBeVisible();
    // Pressed again, it stays chosen.
    await onSale.click();
    await expect(onSale).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Parler à un conseiller" }).click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact-form")).toBeInViewport();
  });

  test("formulaire de contact : les erreurs sous les champs, puis l'envoi", async ({ page }) => {
    let body: { source?: string; data?: Record<string, string> } = {};
    await page.route("**/api/contact", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.goto("/");
    const form = page.locator("#contact-form");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(form.getByLabel("Motif de votre demande")).toBeFocused();
    await expect(form.getByText("Choisissez le motif de votre demande.")).toBeVisible();
    // First name, last name, email and message.
    await expect(form.getByText("À renseigner pour envoyer votre demande.")).toHaveCount(4);
    expect(body.source).toBeUndefined();

    await form.getByLabel("Motif de votre demande").selectOption("Partenaire");
    await form.getByLabel("Prénom").fill(" Alice ");
    await form.getByLabel("Nom", { exact: true }).fill("Martin");
    await form.getByLabel("Email").fill("alice@");
    await form.getByLabel("Votre message").fill("Bonjour, je suis notaire.");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(form.getByLabel("Email")).toBeFocused();
    await expect(form.getByText("Cet email n'est pas valide.")).toBeVisible();
    await form.getByLabel("Email").fill("alice@exemple.test");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();

    const sent = page.locator("#contact-form ~ .form-success");
    await expect(sent).toBeVisible();
    await expect(sent.getByRole("heading")).toHaveText(
      "Votre demande de contact a bien été envoyée",
    );
    await expect(sent.getByRole("heading")).toBeFocused();
    await expect(form).toBeHidden();
    expect(body).toEqual({
      source: "contact",
      data: {
        motif: "Partenaire",
        prenom: "Alice",
        nom: "Martin",
        email: "alice@exemple.test",
        telephone: "",
        message: "Bonjour, je suis notaire.",
      },
    });
  });

  test("formulaire de contact : un envoi refusé se dit, le formulaire reste", async ({ page }) => {
    await page.route("**/api/contact", (route) =>
      route.fulfill({ status: 502, contentType: "application/json", body: '{"error":"x"}' }),
    );
    await page.goto("/");
    const form = page.locator("#contact-form");
    await form.getByLabel("Motif de votre demande").selectOption("Autre");
    await form.getByLabel("Prénom").fill("Alice");
    await form.getByLabel("Nom", { exact: true }).fill("Martin");
    await form.getByLabel("Email").fill("alice@exemple.test");
    await form.getByLabel("Votre message").fill("Bonjour");
    await form.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(form.getByRole("alert")).toContainText(
      "Erreur d'envoi. Réessayez ou contactez-nous par email.",
    );
    await expect(form.getByLabel("Votre message")).toHaveValue("Bonjour");
    await expect(page.locator(".form-success")).toBeHidden();
  });

  test("pied de page : les pages du site, puis les liens légaux", async ({ page }) => {
    await page.goto("/");
    const site = page.getByRole("contentinfo").getByRole("navigation", {
      name: "Découvrir Leenkey",
    });
    await expect(site.getByRole("link")).toHaveText([
      "Concept",
      "Tarifs",
      "FAQ",
      "Investir",
      "Qui sommes-nous",
    ]);
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Mentions légales" }),
    ).toBeVisible();
  });

  test("en mobile : le logo, « Menu » et tous les liens du site", async ({ page, isMobile }) => {
    test.skip(!isMobile, "en-tête mobile sous 768 px");
    await page.goto("/");
    // Nothing wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
    const menuButton = page.getByRole("button", { name: "Menu" });
    await menuButton.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("navigation").getByRole("link")).toHaveText([
      "Acheter",
      "Vendre",
      "Tarifs",
      "Valoriser mon bien",
      "Concept",
      "FAQ",
      "Investir",
      "Qui sommes-nous",
    ]);
    await expect(menu.getByRole("link", { name: "Vendre", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(menu.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
      "href",
      "/inscription?role=seller",
    );
    await expect(menu.getByRole("link", { name: "Mon compte" })).toHaveAttribute(
      "href",
      "/connexion?next=%2F",
    );
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(menuButton).toBeFocused();
    // A link followed closes the menu.
    await menuButton.click();
    await menu.getByRole("link", { name: "Acheter" }).click();
    await expect(page).toHaveURL("/acheter");
    await expect(menu).toBeHidden();
  });

  test("en desktop : la barre haute, « Vendre » courant", async ({ page, isMobile }) => {
    test.skip(isMobile, "barre haute à partir de 768 px");
    await page.goto("/");
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText([
      "Acheter",
      "Vendre",
      "Tarifs",
      "Valoriser mon bien",
    ]);
    await expect(nav.getByRole("link", { name: "Vendre", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  });

  test("accueil : aucune violation sérieuse ou critique @a11y", async ({ page }) => {
    await page.goto("/");
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("sans base : ni derniers biens ni cartes de formules, la page reste entière", async ({
    page,
  }) => {
    test.skip(seeded, "base de seed : voir plus bas");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Les derniers biens" })).toHaveCount(0);
    await expect(page.locator("#tarifs article")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Voir le détail des formules" })).toBeVisible();
  });
});

test.describe("accueil (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("les trois derniers biens et le lien vers les 12", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("list", { name: "Les derniers biens" });
    const cards = list.getByRole("link");
    await expect(cards).toHaveCount(3);
    for (const href of await cards.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )) {
      expect(href).toMatch(/^\/annonce\/[a-z0-9-]+$/);
    }
    await page.getByRole("link", { name: "Voir les 12 biens" }).click();
    await expect(page).toHaveURL("/acheter");
  });

  test("les formules et leurs prix viennent de la base", async ({ page }) => {
    await page.goto("/");
    const plans = page.locator("#tarifs article");
    await expect(plans).toHaveCount(3);
    await expect(plans.getByRole("heading")).toHaveText(["Autonomie", "Accompagné", "Sérénité"]);
    await expect(plans.nth(0)).toContainText("Gratuit");
    await expect(plans.nth(1)).toContainText("990 €");
    await expect(plans.nth(2)).toContainText("1 500 €");
    await expect(plans.nth(1)).toContainText("Forfait fixe · payé à la souscription");
  });
});
