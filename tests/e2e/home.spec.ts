import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The home page of direction C (docs/design-handoff/SPECS.md 3, DECISIONS
// 2026-10-26), after L1-41 and L1-49. Two modes, like search.spec.ts:
// - without a database (CI): the hero and its search card (the national
//   address base simulated), the shortcuts, the steps, the questions, the
//   last banner, the header and the footer; neither the listings, nor the
//   plans, nor the savings (the price of a plan is never in the code);
// - E2E_SEED=1 (local stack or preprod): the listings around Épinay-sur-Orge,
//   the savings and the three plans read from the database.

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

/** The answer of the national address base (api-adresse.data.gouv.fr). */
const ADDRESS = {
  label: "12 Rue de la Gare 91360 Épinay-sur-Orge",
  postcode: "91360",
  city: "Épinay-sur-Orge",
  context: "91, Essonne, Île-de-France",
};

async function simulateAddressBase(page: Page) {
  await page.route("https://api-adresse.data.gouv.fr/search/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        features: [
          { properties: ADDRESS },
          {
            properties: {
              label: "12 Rue de la Gare 91420 Morangis",
              postcode: "91420",
              city: "Morangis",
              context: "91, Essonne, Île-de-France",
            },
          },
        ],
      }),
    }),
  );
}

test.describe("accueil", () => {
  test("hero : la photo, la pastille, le titre et la carte de recherche sur le premier écran", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    const hero = page.getByRole("region", {
      name: "Vendez votre bien autrement. Moins de frais, plus de contrôle.",
    });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Vendez votre bien autrement. Moins de frais, plus de contrôle.",
    );
    await expect(hero.getByText("Ni agence, ni seul · 0 € de commission")).toBeVisible();
    // Its rights confirmed (Q57): in production too, so in CI. Decorative.
    // Beside the text from 1 024 px, under it below: the one shown.
    const photo = hero.locator('img[src*="/images/accueil/maison-"]:visible');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute("alt", "");
    // « Valoriser mon bien » open first, its action on the first screen, at 390 px too.
    const tabs = page.getByRole("tablist", { name: "Votre projet" });
    await expect(tabs.getByRole("tab")).toHaveCount(3);
    await expect(tabs.getByRole("tab", { name: "Acheter" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(tabs.getByRole("tab", { name: "Valoriser mon bien" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const action = page.getByRole("button", { name: "Valoriser mon bien gratuitement" });
    const box = await action.boundingBox();
    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThan(
      page.viewportSize()?.height ?? 0,
    );
    await expect(page.getByRole("tabpanel")).toContainText("2 minutes");
    // The pages of the V1 home are gone: no invented figure, no example card.
    await expect(page.getByText("vs prix agence")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Exemple de valorisation" })).toHaveCount(0);
  });

  test("Valoriser : l'adresse choisie remplit l'étape « Localisation » de l'estimateur", async ({
    page,
  }) => {
    await simulateAddressBase(page);
    await page.goto("/");
    const field = page.getByRole("combobox", { name: "Adresse du bien à valoriser" });
    await field.fill("12 rue de la gare");
    const list = page.getByRole("listbox", { name: "Adresses proposées" });
    await expect(list.getByRole("option")).toHaveCount(2);
    // Typed, not chosen: the estimator needs its postal code, a choice is asked
    // (Enter: on a phone, the list covers the button under the field).
    await field.press("Enter");
    await expect(page.getByText("Choisissez votre adresse dans la liste.")).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toBeFocused();
    await expect(page).toHaveURL("/");
    expect(await seriousViolations(page)).toEqual([]);
    // With the keyboard: down to the first one, Enter.
    await field.press("ArrowDown");
    await expect(field).toHaveAttribute("aria-activedescendant", /.+/);
    await field.press("Enter");
    await expect(field).toHaveValue(ADDRESS.label);
    await expect(list).toBeHidden();
    await page.getByRole("button", { name: "Valoriser mon bien gratuitement" }).click();
    // Read once: the address of the page is cleaned, the draft holds it.
    await expect(page).toHaveURL("/estimer");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("leenkey_form_v1") ?? "{}") as {
            form?: Record<string, string>;
          };
          return saved.form
            ? [saved.form.adresse, saved.form.code_postal, saved.form.ville, saved.form.departement]
            : null;
        }),
      )
      .toEqual([ADDRESS.label, "91360", "Épinay-sur-Orge", "91"]);
  });

  test("Vendre : l'adresse tapée part vers la création du bien, après l'inscription", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Vendre" }).click();
    await page.getByRole("textbox", { name: "Adresse du bien à vendre" }).fill("12 rue de la Gare");
    await page.getByRole("button", { name: "Publier mon bien gratuitement" }).click();
    await expect(page).toHaveURL(/\/inscription\?role=seller&next=/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toBe("/vendeur/biens/nouveau?adresse=12%20rue%20de%20la%20Gare");
  });

  test("Acheter : la barre segmentée à partir de 768 px, un bouton vers la recherche avant", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Acheter" }).click();
    if (isMobile) {
      await expect(page.getByRole("search")).toBeHidden();
      await expect(page.getByRole("link", { name: /^Où cherchez-vous/ })).toHaveAttribute(
        "href",
        "/acheter",
      );
      return;
    }
    const bar = page.getByRole("search");
    // The commune at the keyboard: down to the first suggestion, Enter.
    const where = bar.getByRole("combobox", { name: "Où\u00a0?" });
    await where.fill("Savi");
    await where.press("ArrowDown");
    await expect(where).toHaveAttribute("aria-activedescendant", /.+/);
    await where.press("Enter");
    await expect(where).toHaveValue("Savigny-sur-Orge");
    await bar.getByRole("button", { name: /^Type de bien/ }).click();
    await page.getByRole("button", { name: "Maison", exact: true }).click();
    await expect(bar.getByRole("button", { name: /^Type de bien/ })).toContainText("Maison");
    await bar.getByRole("button", { name: /^Budget max/ }).click();
    await page.getByRole("button", { name: "400 000 €" }).click();
    await bar.getByRole("button", { name: "Rechercher" }).click();
    await expect(page).toHaveURL(/\/acheter\?/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("ville")).toBe("savigny-sur-orge");
    expect(params.get("type")).toBe("maison");
    expect(params.get("budget_max")).toBe("400000");
  });

  test("pilules de service et raccourcis : chacun vers sa page", async ({ page }) => {
    await page.goto("/");
    const services = page.getByRole("navigation", { name: "Accès directs" });
    const signUp = `/inscription?role=seller&next=${encodeURIComponent("/vendeur/biens/nouveau")}`;
    for (const [name, href] of [
      ["Valoriser votre bien", "/estimer"],
      ["Déposer une annonce", signUp],
      ["Nos formules", "/tarifs"],
    ] as const) {
      await expect(services.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    // Each card is its link, named by its title first.
    const shortcuts = page
      .getByRole("region", { name: "Que voulez-vous faire ?" })
      .getByRole("link");
    for (const [index, [title, href]] of [
      ["Valoriser mon bien", "/estimer"],
      ["Vendre mon bien", signUp],
      ["Être accompagné", "/tarifs"],
      ["Trouver un bien", "/acheter"],
    ].entries()) {
      await expect(shortcuts.nth(index)).toHaveAccessibleName(new RegExp(`^${title}`));
      await expect(shortcuts.nth(index)).toHaveAttribute("href", href);
    }
    await expect(shortcuts).toHaveCount(4);
  });

  test("étapes, formules, questions et bandeau final", async ({ page }) => {
    await page.goto("/");
    await expect(
      page
        .getByRole("region", { name: "Trois étapes. Vous gardez les clés du début à la fin." })
        .getByRole("heading", { level: 3 }),
    ).toHaveText(["Estimez", "Préparez", "Signez"]);
    await expect(page.getByRole("link", { name: "Voir le détail des formules" })).toHaveAttribute(
      "href",
      "/tarifs",
    );
    const faq = page.getByRole("region", { name: "Les trois questions essentielles." });
    const answer = faq.getByText(/Elle inclut l'analyse de votre bien/);
    await expect(answer).toBeHidden();
    await faq.getByText("Est-ce vraiment gratuit pour commencer ?").click();
    await expect(answer).toBeVisible();
    await expect(faq.getByRole("link", { name: "Toutes les questions" })).toHaveAttribute(
      "href",
      "/faq",
    );
    const last = page.getByRole("region", { name: "Prêt à garder les clés de votre vente ?" });
    await expect(
      last.getByRole("link", { name: "Valoriser mon bien gratuitement" }),
    ).toHaveAttribute("href", "/estimer");
    // The contact form is on /contact now.
    await expect(page.locator("#contact-form")).toHaveCount(0);
  });

  test("pied de page : blanc, le logo, les pages du site, puis les liens légaux", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    // White in the redesign D (SPECS.md 3, item 11), the logo first.
    expect(await footer.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      "rgb(255, 255, 255)",
    );
    await expect(footer.getByRole("link").first()).toHaveAccessibleName("Leenkey");
    const site = footer.getByRole("navigation", { name: "Découvrir Leenkey" });
    await expect(site.getByRole("link")).toHaveText([
      "Concept",
      "Tarifs",
      "FAQ",
      "Investir",
      "Qui sommes-nous",
    ]);
    await expect(footer.getByRole("link", { name: "Mentions légales" })).toBeVisible();
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
      "Leenkey et son fondateur",
      "Investir dans Leenkey",
      "Contact",
      "Concept",
      "FAQ",
    ]);
    // The two pages of « Qui sommes-nous » under its label (L1-51).
    const about = menu.getByRole("list", { name: "Qui sommes-nous" });
    await expect(about.getByRole("link", { name: "Leenkey et son fondateur" })).toHaveAttribute(
      "href",
      "/qui-sommes-nous",
    );
    await expect(about.getByRole("link", { name: "Investir dans Leenkey" })).toHaveAttribute(
      "href",
      "/investir",
    );
    await expect(menu.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
    // « Vendre » leads to its two ways (DECISIONS 2026-10-26), not the home page.
    const sell = menu.getByRole("link", { name: "Vendre", exact: true });
    await expect(sell).toHaveAttribute("href", "/vendre");
    await expect(sell).not.toHaveAttribute("aria-current");
    await expect(menu.getByRole("link", { name: "Vendre mon bien" })).toHaveAttribute(
      "href",
      "/vendre",
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

  test("en desktop : la barre haute, « Vendre » courant sur sa page", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "barre haute à partir de 768 px");
    await page.goto("/");
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText([
      "Acheter",
      "Vendre",
      "Tarifs",
      "Valoriser mon bien",
      "Contact",
    ]);
    // Its two pages open from a button (L1-51).
    await expect(nav.getByRole("button", { name: "Qui sommes-nous" })).toBeVisible();
    // « Vendre » leads to its two ways (DECISIONS 2026-10-26): no longer the home page.
    const sell = nav.getByRole("link", { name: "Vendre", exact: true });
    await expect(sell).toHaveAttribute("href", "/vendre");
    await expect(sell).not.toHaveAttribute("aria-current");
    await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
    // Signed out, the pill of the account (menu and avatar) to the login page.
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Mon compte" }),
    ).toHaveAttribute("href", "/connexion?next=%2F");
    await sell.click();
    await expect(page).toHaveURL("/vendre");
    await expect(sell).toHaveAttribute("aria-current", "page");
  });

  test("accueil : aucune violation sérieuse ou critique @a11y", async ({ page }) => {
    await page.goto("/");
    expect(await seriousViolations(page)).toEqual([]);
    // Nothing wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()?.width ?? 0,
    );
  });

  test("sans base : ni biens, ni formules, ni simulateur, la page reste entière", async ({
    page,
  }) => {
    test.skip(seeded, "base de seed : voir plus bas");
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Biens à vendre près de chez vous" }),
    ).toHaveCount(0);
    await expect(page.getByText("Notre recommandation")).toHaveCount(0);
    // Nor the savings: the price of Accompagné is never written in the code.
    await expect(
      page.getByRole("heading", { name: "Combien vous économisez avec Leenkey" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Voir le détail des formules" })).toBeVisible();
  });
});

test.describe("accueil (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("biens autour d'Épinay-sur-Orge : leurs cartes, les catégories, le nombre réel", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const list = page.getByRole("list", { name: "Biens à vendre près de chez vous" });
    await expect(page.getByText("Autour d'Épinay-sur-Orge · 10 km")).toBeVisible();
    const cards = list.getByRole("listitem");
    expect(await cards.count()).toBeGreaterThan(0);
    for (const href of await list
      .locator("a[href^='/annonce/']")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")))) {
      expect(href).toMatch(/^\/annonce\/[a-z0-9-]+$/);
    }
    // Each card shows its photo (every listing of the seed has one, L1-46b).
    await expect(list.locator('img[src*="/img/"]').first()).toBeVisible();
    // « Voir les N biens »: the real number, to the search around Épinay-sur-Orge.
    const all = page.getByRole("link", { name: /^Voir les \d+( biens)?$/ });
    await expect(all).toHaveAttribute("href", "/acheter?ville=epinay-sur-orge&rayon=10");
    // From 1024 px, the arrows and the counter, the first arrow off at the start.
    if (!isMobile && (page.viewportSize()?.width ?? 0) >= 768) {
      // Off but in place at the start: the focus is never lost at an end.
      const previous = page.getByRole("button", { name: "Biens précédents" });
      await expect(previous).toHaveAttribute("aria-disabled", "true");
      await page.getByRole("button", { name: "Biens suivants" }).click();
      await expect(previous).not.toHaveAttribute("aria-disabled");
    }
    // A category filters the cards and the link.
    const categories = page.getByRole("group", { name: "Catégories de biens" });
    await expect(categories.getByRole("button", { name: "Tous les biens" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await categories.getByRole("button", { name: "Maisons" }).click();
    await expect(categories.getByRole("button", { name: "Maisons" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(all).toHaveAttribute(
      "href",
      "/acheter?ville=epinay-sur-orge&rayon=10&type=maison",
    );
    for (const text of await list.getByRole("listitem").allInnerTexts()) {
      expect(text).toMatch(/^Maison/m);
    }
    expect(await seriousViolations(page)).toEqual([]);
  });

  test("simulateur : 340 000 € d'abord, l'économie suit le prix choisi", async ({ page }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Combien vous économisez avec Leenkey" });
    const prices = section.getByRole("group", { name: "Prix de vente" });
    await expect(prices.getByRole("radio")).toHaveCount(4);
    await expect(prices.getByRole("radio", { name: "340 000 €" })).toBeChecked();
    // 5 % of 340 000 €, minus Accompagné (990 € in the seed).
    const saved = section.getByText("Vous économisez environ").locator("..");
    await expect(saved).toContainText("16 010 €");
    await prices.getByText("600 000 €").click();
    await expect(saved).toContainText("29 010 €");
    // The arrows move from one price to the next, as native radio buttons.
    await prices.getByRole("radio", { name: "600 000 €" }).press("ArrowLeft");
    await expect(prices.getByRole("radio", { name: "450 000 €" })).toBeChecked();
    await expect(saved).toContainText("21 510 €");
    await expect(saved).toHaveAttribute("aria-live", "polite");
    // The hypothesis is said.
    await expect(section.getByText(/hyp/).filter({ visible: true })).toBeVisible();
    await expect(section).toContainText(
      "Les frais d'agence varient selon les agences et les biens.",
    );
  });

  test("les formules et leurs prix viennent de la base, Accompagné mis en avant", async ({
    page,
  }) => {
    await page.goto("/");
    const section = page.getByRole("region", { name: "Choisissez votre niveau d'accompagnement" });
    await expect(section.getByRole("heading", { level: 3 })).toHaveText([
      "Autonomie",
      "Accompagné",
      "Sérénité",
    ]);
    const cards = section.getByRole("listitem");
    await expect(cards.nth(0)).toContainText("Gratuit");
    await expect(cards.nth(1)).toContainText("990 € TTC");
    await expect(cards.nth(2)).toContainText("1 500 € TTC");
    await expect(cards.nth(1)).toContainText("Notre recommandation");
  });
});
