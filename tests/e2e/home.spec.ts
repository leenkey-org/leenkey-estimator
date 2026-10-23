import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-41: the home page in V2 (SPEC-V2 8.1, DECISIONS 2026-10-19), in the
// direction of the V1 since L1-49 (DECISIONS 2026-10-23). Two modes, like
// search.spec.ts:
// - without a database (CI): the hero, the sections of the V1 page and their
//   anchors, the contact form (answer of /api/contact simulated), the
//   situations, the menu; neither the latest listings nor the plan cards;
// - E2E_SEED=1 (local stack or preprod): the three latest listings and the
//   three plans read from the database.

const seeded = process.env.E2E_SEED === "1";

async function seriousViolations(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  test("hero de la V1 : « Voir ma valorisation » sur le premier écran, puis l'entrée des acquéreurs", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    const hero = page.locator("#valoriser");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Leenkey vous donne les clés de votre vente.",
    );
    await expect(hero.getByText("Ni agence, ni seul · Vendre accompagné")).toBeVisible();
    const sell = hero.getByRole("link", { name: "Voir ma valorisation" });
    await expect(sell).toHaveAttribute("href", "/estimer");
    await expect(hero.getByRole("link", { name: "Je cherche un bien à acheter" })).toHaveAttribute(
      "href",
      "/acheter",
    );
    // The way of the sellers on the first screen, at 390 px too.
    const box = await sell.boundingBox();
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThan(
      page.viewportSize()?.height ?? 0,
    );
    await expect(hero.getByRole("listitem")).toContainText([
      "Forfait fixe · jamais de commission",
      "Plus de contrôle · vous validez tout",
      "Accompagné à chaque étape",
    ]);
    // The V1 page is gone: no invented figure, no V1 menu.
    await expect(page.getByText("vs prix agence")).toHaveCount(0);
    await expect(page.locator(".lk-nav-logo")).toHaveCount(0);
  });

  test("hero : la carte de la V1 dit que sa valorisation est un exemple", async ({ page }) => {
    await page.goto("/");
    const card = page.getByRole("group", { name: "Exemple de valorisation" });
    await expect(card).toBeVisible();
    await expect(card.getByText("Exemple", { exact: true })).toBeVisible();
    await expect(card).toContainText("Maison contemporaine");
    await expect(card).toContainText("Saint-Michel-sur-Orge, 91240");
    // The value of the engine (tests/unit/site/home-v1.test.ts), and its range.
    await expect(card.getByText(/^\d{3}\u202f000\u202f€$/)).toBeVisible();
    await expect(card).toContainText(
      /Fourchette\u00a0: \d{3}\u202f000\u202f€ à \d{3}\u202f000\u202f€/,
    );
    await expect(card.getByRole("link")).toHaveCount(0);
    await expect(card.getByRole("button")).toHaveCount(0);
    // In place of the V1 figure, what the valuation gives.
    await expect(page.locator("#valoriser").getByText("Rapport PDF")).toBeVisible();
  });

  // L1-46: the house of the V1 hero.
  test("hero : la photo d'une maison, à la place du dessin", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("#valoriser");
    // Its rights confirmed (Q57): in production too, so in CI.
    const photo = hero.locator('img[src*="/images/accueil/maison-"]');
    await expect(photo).toBeVisible();
    // Decorative: the title says what the page is about.
    await expect(photo).toHaveAttribute("alt", "");
    await expect
      .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
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
    // The labels of the V1 above the titles.
    for (const [anchor, eyebrow] of [
      ["etape", "Votre projet"],
      ["comment", "Comment ça marche"],
      ["fonctionnalites", "Le point de départ"],
      ["espace-vendeur", "Votre espace Leenkey"],
      ["comparatif", "Position de Leenkey"],
      ["tarifs", "Nos formules"],
      ["faq", "Questions fréquentes"],
      ["contact", "Une question, un projet ?"],
    ] as const) {
      const label = page.locator(`#${anchor}`).getByText(eyebrow, { exact: true });
      await expect(label).toBeVisible();
      await expect(label).toHaveCSS("text-transform", "uppercase");
    }
    // The three steps of the sale, in order.
    await expect(page.locator("#comment ol > li").getByRole("heading")).toHaveText([
      "Estimez",
      "Préparez",
      "Signez",
    ]);
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

  test("sections sombres de la V1 : la courbe de la valorisation, l'aperçu de l'espace vendeur, les formules", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const features = page.locator("#fonctionnalites");
    // The navy flat (DESIGN.md 2.1).
    expect(await features.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(26, 43, 74)",
    );
    await expect(features.getByRole("heading", { level: 3 })).toHaveText([
      "Une fourchette de valeur, pas un prix figé",
      "Les ventes réelles de votre quartier",
      "Ce qui fait monter ou baisser le prix",
      "Un rapport complet en PDF",
    ]);
    // The curve from 1024 px; below, a line from one item to the next.
    await expect(features.locator("svg[data-reveal-draw]")).toBeVisible({ visible: !isMobile });
    await expect(
      features.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");

    const space = page.locator("#espace-vendeur");
    expect(await space.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(26, 43, 74)",
    );
    // A picture named by what it shows, its example data not read one by one,
    // then its caption.
    const preview = space.getByRole("img", { name: /^Exemple de tableau de bord vendeur/ });
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("Exemple");
    await expect(preview).toContainText("Ma vente");
    await expect(preview).toContainText("Étape 3 sur 6 · Contacts et visites");
    await expect(preview).toContainText("Confirmer la visite de Thomas");
    await expect(preview.getByRole("button")).toHaveCount(0);
    await expect(preview.getByRole("link")).toHaveCount(0);
    await expect(space.locator("figcaption")).toHaveText(
      "Aperçu de l'espace vendeur, avec des données d'exemple.",
    );

    // The plans, dark as in the V1 (L1-48), the way to /tarifs under them.
    const plans = page.locator("#tarifs");
    expect(await plans.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(26, 43, 74)",
    );
    await expect(plans.getByRole("heading", { level: 2 })).toHaveCSS("text-align", "center");
    await expect(plans.getByRole("link", { name: "Voir le détail des formules" })).toHaveAttribute(
      "href",
      "/tarifs",
    );
  });

  test("comparatif : un tableau à partir de 768 px, une carte par façon de vendre avant", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const section = page.locator("#comparatif");
    const table = section.getByRole("table");
    if (isMobile) {
      await expect(table).toBeHidden();
      await expect(section.getByRole("heading", { level: 3 })).toHaveText([
        "Vente seul",
        "Leenkey",
        "Agence",
      ]);
    } else {
      await expect(table).toBeVisible();
      await expect(table.getByRole("columnheader")).toContainText([
        "Vente seul",
        "Leenkey",
        "Agence",
      ]);
      await expect(table.getByRole("rowheader")).toHaveText([
        "Frais de vente",
        "Accompagnement",
        "Contrôle de la vente",
        "Sécurité juridique",
      ]);
    }
    // The check or the cross said in words before each value.
    await expect(
      section.getByText("Point fort :", { exact: true }).filter({ visible: true }),
    ).toHaveCount(8);
    await expect(
      section.getByText("Point faible :", { exact: true }).filter({ visible: true }),
    ).toHaveCount(4);
  });

  test("questions : la réponse se déplie sous sa question", async ({ page }) => {
    await page.goto("/");
    const faq = page.locator("#faq");
    const question = faq.getByText("Est-ce vraiment gratuit pour commencer ?");
    const answer = faq.getByText(/Elle inclut l'analyse de votre bien/);
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
    await question.click();
    await expect(answer).toBeHidden();
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
      "Qui sommes-nous",
      "Contact",
      "Concept",
      "FAQ",
      "Investir",
    ]);
    await expect(menu.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
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
      "Qui sommes-nous",
      "Contact",
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

  // The words in the gradient are transparent text over a background: in
  // print (backgrounds off) and in forced colours, they get a colour back.
  test("les mots en dégradé gardent une couleur à l'impression et en contraste forcé", async ({
    page,
  }) => {
    await page.goto("/");
    const accent = page.locator("#etape-titre .lk-text-grad");
    await expect(accent).toHaveText("votre vente ?");
    expect(await accent.evaluate((el) => getComputedStyle(el).color)).toBe("rgba(0, 0, 0, 0)");
    for (const media of [
      { media: "print" },
      { media: "screen", forcedColors: "active" },
    ] as const) {
      await page.emulateMedia(media);
      const style = await accent.evaluate((el) => {
        const computed = getComputedStyle(el);
        return { color: computed.color, image: computed.backgroundImage };
      });
      expect(style.image, JSON.stringify(media)).toBe("none");
      expect(style.color, JSON.stringify(media)).not.toBe("rgba(0, 0, 0, 0)");
    }
  });

  test("dernier appel : « Valoriser mon bien gratuitement » vers l'estimateur", async ({
    page,
  }) => {
    await page.goto("/");
    const last = page.locator('section[aria-labelledby="cta-final-titre"]');
    await expect(last.getByRole("heading", { level: 2 })).toHaveText(
      "Prêt à garder les clés de votre vente ?",
    );
    await expect(
      last.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
    await expect(last).toContainText("Réponse sous 24 h par un conseiller · Aucune carte requise");
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
    // Those with a photo first (L1-46): the three houses of the seed photos.
    await expect(list.locator('img[src*="/img/"]')).toHaveCount(3);
    for (const href of await cards.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )) {
      expect(href).toMatch(/^\/annonce\/[a-z0-9-]+$/);
    }
    await page.getByRole("link", { name: "Voir les 12 biens" }).click();
    await expect(page).toHaveURL("/acheter");
  });

  test("les formules et leurs prix viennent de la base", async ({ page, isMobile }) => {
    await page.goto("/");
    const plans = page.locator("#tarifs article");
    await expect(plans).toHaveCount(3);
    await expect(plans.getByRole("heading")).toHaveText(["Autonomie", "Accompagné", "Sérénité"]);
    await expect(plans.nth(0)).toContainText("Gratuit");
    await expect(plans.nth(1)).toContainText("990\u202f€");
    await expect(plans.nth(2)).toContainText("1\u202f500\u202f€");
    await expect(plans.nth(1)).toContainText("Forfait fixe · payé à la souscription");
    // In large type at the bottom of the card, as the price cards of the V1 (L1-48).
    const price = plans.nth(1).getByText(/^990\s€$/);
    expect(await price.evaluate((el) => getComputedStyle(el).fontSize)).toBe("36px");

    // Side by side from 1024 px, the prices on one line, whatever the length
    // of the taglines: at 1280 px, and at 1024 px where Sérénité's wraps.
    if (isMobile) return;
    const prices = plans.locator("p.whitespace-nowrap");
    for (const width of [1280, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      const tops = await prices.evaluateAll((items) =>
        items.map((item) => Math.round(item.getBoundingClientRect().top)),
      );
      expect(tops, `${width} px`).toHaveLength(3);
      expect(new Set(tops).size, `${width} px`).toBe(1);
    }
  });
});
