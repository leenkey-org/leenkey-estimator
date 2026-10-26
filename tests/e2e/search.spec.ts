import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-15 / L1-17: search /acheter and listing page /annonce/[slug].
//
// Two explicit modes, like design.spec.ts:
// - E2E_SEED=1: the app under test reads a database loaded by
//   `npm run db:seed` (local, preprod). The search and listing tests run; the
//   « sans base » tests are skipped.
// - otherwise (CI builds without any Supabase project): the « sans base »
//   tests check that the pages fail cleanly; the others are skipped.
// A run with a database but without E2E_SEED=1 fails, it never passes empty.
// `npm run a11y` runs the @a11y tests in both modes.

const seeded = process.env.E2E_SEED === "1";
const SEED_REQUIRED = "base de seed requise (E2E_SEED=1)";
const NO_DATABASE_ONLY = "états sans base de données, testés hors E2E_SEED";

const COUNT = /^(?:(\d[\d\s]*)\sbiens?|Aucun bien)/;

/** « 12 biens à Savigny-sur-Orge » (results header, role status). */
const resultsStatus = (page: Page) => page.getByRole("main").getByRole("status");

/** Links of the cards shown (compact up to 1023 px, wide beyond). */
const cards = (page: Page) => page.getByRole("list", { name: "Résultats" }).locator("a:visible");

const location = (page: Page) => page.getByRole("combobox", { name: "Ville ou code postal" });

/** Results and fonts in place: no Suspense fallback or transition left. */
async function settle(page: Page) {
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function resultCount(page: Page): Promise<number> {
  await settle(page);
  const text = (await resultsStatus(page).textContent()) ?? "";
  const match = COUNT.exec(text);
  if (!match) throw new Error(`Unexpected results header: ${text}`);
  return match[1] ? Number(match[1].replace(/\D/g, "")) : 0;
}

/** Price of each card shown, in euros, in the order of the page. */
async function cardPrices(page: Page): Promise<number[]> {
  await settle(page);
  return (await cards(page).allTextContents()).map((text) => {
    const price = /(\d[\d\s]*)€/.exec(text);
    if (!price) throw new Error(`No price in card: ${text}`);
    return Number(price[1].replace(/\D/g, ""));
  });
}

async function seriousViolations(page: Page) {
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }));
}

async function openFilters(page: Page, _isMobile: boolean) {
  // « Filtres », and the count of the active filters when there are some.
  const button = page.getByRole("button", { name: /^Filtres(, \d+\sfiltres? actifs?)?$/ });
  const dialog = page.getByRole("dialog", { name: "Filtres" });
  // A click before the page is hydrated opens nothing: clicked again until it does.
  await expect(async () => {
    if (!(await dialog.isVisible())) await button.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  return dialog;
}

/** Path of the first listing of the search, read from its card. */
async function firstListingPath(page: Page, search = "/acheter"): Promise<string> {
  await page.goto(search);
  await settle(page);
  const href = await cards(page).first().getAttribute("href");
  expect(href).toMatch(/^\/annonce\/[a-z0-9-]+$/);
  return href ?? "";
}

test("/acheter : aucune violation d'accessibilité sérieuse ou critique @a11y", async ({ page }) => {
  await page.goto("/acheter?ville=savigny-sur-orge&rayon=5");
  await settle(page);
  expect(await seriousViolations(page)).toEqual([]);
});

test("panneau des filtres : aucune violation, focus gardé, Échap ferme @a11y", async ({
  page,
  isMobile,
}) => {
  await page.goto("/acheter?ville=savigny-sur-orge&rayon=5");
  await settle(page);
  const dialog = await openFilters(page, isMobile);
  await expect(dialog.getByRole("radiogroup", { name: /^Rayon autour de/ })).toBeVisible();
  // No list of the system left in the panel: rows of rounded choices (DECISIONS 2026-10-26).
  await expect(dialog.getByRole("combobox")).toHaveCount(0);
  for (const name of ["Type de bien", "Pièces", "Chambres", /^Classe énergie/]) {
    await expect(dialog.getByRole("radiogroup", { name })).toBeVisible();
  }
  // The panel slides in: contrasts are measured once it is in place.
  await page.waitForTimeout(300);
  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("une adresse d'annonce mal formée répond 404", async ({ page, request }) => {
  const response = await page.goto("/annonce/Pas_Une_Annonce");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Cette page n'existe pas." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
  expect((await request.get("/api/og/Pas_Une_Annonce")).status()).toBe(404);
});

test("une ville hors de la zone passée dans l'adresse n'est jamais indexée", async ({ page }) => {
  await page.goto("/acheter?ville=arnaque-appelez-le-0612345678");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(new URL(canonical ?? "").pathname).toBe("/acheter");
  expect(new URL(canonical ?? "").search).toBe("");
  await expect(page).toHaveTitle(/^Biens à vendre/);
  await expect(page).not.toHaveTitle(/Arnaque/i);
});

test.describe("sans base de données", () => {
  test.skip(seeded, NO_DATABASE_ONLY);

  test("/acheter garde ses filtres et propose « Réessayer »", async ({ page }) => {
    const search = "/acheter?ville=savigny-sur-orge&rayon=5&budget_max=400000";
    const response = await page.goto(search);
    expect(response?.status()).toBe(200);
    // In <main>: the route announcer of Next.js is an alert too.
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Ça n'a pas fonctionné.");
    await expect(page.getByRole("link", { name: "Réessayer" })).toHaveAttribute("href", search);
    await expect(location(page)).toHaveValue(/^Savigny-sur-Orge · 5\skm$/);
  });

  test("une annonce répond 500 avec la page d'erreur du site", async ({ page, request }) => {
    const path = "/annonce/appartement-3-pieces-savigny-sur-orge-lk0001";
    const response = await page.goto(path);
    expect(response?.status()).toBe(500);
    await expect(page.getByRole("heading", { name: "Ça n'a pas fonctionné." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute(
      "href",
      "/",
    );
    await expect(page.getByRole("link", { name: "Nous écrire" })).toHaveAttribute(
      "href",
      "/contact",
    );
    // « Réessayer » asks the server again (app/error.tsx), and shows the error
    // again as long as the database is unavailable.
    const asked = page.waitForRequest(
      (sent) => new URL(sent.url()).pathname === path && sent.headers()["rsc"] === "1",
    );
    await page.getByRole("button", { name: "Réessayer" }).click();
    await asked;
    await expect(page.getByRole("heading", { name: "Ça n'a pas fonctionné." })).toBeVisible();
    const image = await request.get("/api/og/appartement-3-pieces-savigny-sur-orge-lk0001");
    expect(image.status()).toBe(503);
  });
});

test.describe("recherche /acheter (base de seed)", () => {
  test.skip(!seeded, SEED_REQUIRED);

  test("liste les biens publiés, 20 par page, chaque carte mène à son annonce", async ({
    page,
  }) => {
    const response = await page.goto("/acheter");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Biens à vendre · Leenkey");
    const total = await resultCount(page);
    expect(total).toBeGreaterThan(0);
    await expect(cards(page)).toHaveCount(Math.min(total, 20));
    for (const href of await cards(page).evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )) {
      expect(href).toMatch(/^\/annonce\/[a-z0-9-]+$/);
    }
  });

  test("lit les filtres de l'adresse (SPEC 8.4), les montre et les respecte", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/acheter?ville=savigny-sur-orge&rayon=5&budget_max=400000&pieces_min=3");
    // Title and canonical address of the commune, whatever the other filters.
    await expect(page).toHaveTitle("Biens à vendre à Savigny-sur-Orge · Leenkey");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical ?? "").search).toBe("?ville=savigny-sur-orge");
    await expect(location(page)).toHaveValue(/^Savigny-sur-Orge · 5\skm$/);
    expect(await resultCount(page)).toBeGreaterThan(0);
    await expect(resultsStatus(page)).toContainText("autour de Savigny-sur-Orge");
    for (const price of await cardPrices(page)) expect(price).toBeLessThanOrEqual(400_000);

    if (isMobile) {
      const chips = page.getByRole("group", { name: "Filtres rapides" });
      await expect(chips.getByRole("button", { name: /^≤\s400\sk€$/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(chips.getByRole("button", { name: /^3\spièces \+$/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    } else {
      const bar = page.getByRole("search");
      await expect(bar.getByRole("button", { name: /^Budget max/ })).toContainText(
        /Jusqu'à\s400\s000\s€/,
      );
      await expect(bar.getByRole("button", { name: /^Pièces/ })).toContainText(/3\spièces et \+/);
    }
  });

  test("suggère les communes de la zone et cherche dans celle choisie", async ({ page }) => {
    await page.goto("/acheter");
    const field = location(page);
    await field.click();
    await field.fill("savi");
    const option = page.getByRole("option", { name: /^Savigny-sur-Orge/ });
    await expect(option).toBeVisible();
    await option.click();
    await expect(page).toHaveURL(/\/acheter\?ville=savigny-sur-orge$/);
    await expect(resultsStatus(page)).toContainText("à Savigny-sur-Orge");
    await expect(field).toHaveValue("Savigny-sur-Orge");

    // Keyboard: arrow down to the first suggestion, Enter.
    await field.click();
    await field.fill("épinay");
    await field.press("ArrowDown");
    await expect(field).toHaveAttribute("aria-activedescendant", /.+/);
    await field.press("Enter");
    await expect(page).toHaveURL(/\/acheter\?ville=epinay-sur-orge$/);
    await expect(field).toHaveValue("Épinay-sur-Orge");
  });

  test("trie par prix croissant", async ({ page }) => {
    await page.goto("/acheter");
    await settle(page);
    await page.getByRole("button", { name: /^Trier par/ }).click();
    await page.getByRole("menuitemradio", { name: "Prix croissant" }).click();
    await expect(page).toHaveURL(/\/acheter\?tri=prix_asc$/);
    const prices = await cardPrices(page);
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test("« Voir N biens » annonce le nombre de biens que montrent les filtres", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/acheter");
    const total = await resultCount(page);
    const dialog = await openFilters(page, isMobile);
    const submit = dialog.getByRole("button", {
      name: /^(Voir \d+\sbiens?|Voir 1 bien|Aucun bien)$/,
    });
    await expect(submit).toHaveText(total === 1 ? "Voir 1 bien" : `Voir ${total}\u00A0biens`);

    // Counted on the server (server action) for the draft, 300 ms after the change.
    const counted = page.waitForResponse(
      (response) => response.request().headers()["next-action"] !== undefined,
    );
    await dialog.getByLabel("Budget maximum").fill("300000");
    await counted;
    await expect(submit).not.toHaveAttribute("aria-busy", "true");
    const label = (await submit.textContent()) ?? "";
    const announced = /Voir (\d+)/.exec(label)?.[1];
    expect(announced, label).toBeDefined();
    await submit.click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/acheter\?budget_max=300000$/);
    expect(await resultCount(page)).toBe(Number(announced));
    for (const price of await cardPrices(page)) expect(price).toBeLessThanOrEqual(300_000);
  });

  test("desktop : la barre de filtres applique le type de bien", async ({ page, isMobile }) => {
    test.skip(isMobile, "barre de filtres à partir de 1024 px ; en mobile, le panneau");
    await page.goto("/acheter");
    await settle(page);
    // A rounded menu of the bar (DECISIONS 2026-10-26), from the keyboard:
    // its options are radio items, Escape gives the focus back.
    const type = page.getByRole("search").getByRole("button", { name: /^Type de bien/ });
    await type.click();
    const menu = page.getByRole("menu", { name: "Type de bien" });
    await expect(menu.getByRole("menuitemradio", { name: "Tous les biens" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(type).toBeFocused();
    await type.press("Enter");
    await menu.getByRole("menuitemradio", { name: "Appartement" }).click();
    await expect(page).toHaveURL(/\/acheter\?type=appartement$/);
    await expect(type).toContainText("Appartement");
    await settle(page);
    const texts = await cards(page).allTextContents();
    expect(texts.length).toBeGreaterThan(0);
    for (const text of texts) expect(text).toContain("Appartement");
  });

  test("aucun résultat : état vide, puis « Effacer les filtres »", async ({ page }) => {
    await page.goto("/acheter?budget_max=1");
    await expect(page.getByRole("heading", { name: "Aucun bien ne correspond." })).toBeVisible();
    await expect(page.getByText("Élargissez le rayon ou le budget.")).toBeVisible();
    await page.getByRole("link", { name: "Effacer les filtres" }).click();
    await expect(page).toHaveURL(/\/acheter$/);
    expect(await resultCount(page)).toBeGreaterThan(0);
  });

  test("« Voir plus » ajoute les biens suivants", async ({ page }) => {
    await page.goto("/acheter");
    const total = await resultCount(page);
    test.skip(total <= 20, `${total} biens publiés : une seule page de résultats`);
    await page.getByRole("button", { name: "Voir plus" }).click();
    await expect(page).toHaveURL(/\/acheter\?page=2$/);
    await expect(cards(page)).toHaveCount(Math.min(total, 40));
  });
});

test.describe("page annonce (base de seed)", () => {
  test.skip(!seeded, SEED_REQUIRED);

  test("montre le bien et ses actions, qui mènent à l'inscription acquéreur puis au premier message", async ({
    page,
  }) => {
    const path = await firstListingPath(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ce que vous savez avant de visiter" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Le bien" })).toBeVisible();

    // The sign-up, then the first message to the seller (L1-21).
    const signUp = (visit: boolean) =>
      new RegExp(
        `^/inscription\\?role=buyer&next=${encodeURIComponent("/messages/nouveau?annonce=")}[0-9a-f-]{36}${visit ? encodeURIComponent("&visite=1") : ""}$`,
      );
    await expect(page.getByRole("link", { name: "Contacter le vendeur" })).toHaveAttribute(
      "href",
      signUp(false),
    );
    await expect(page.getByRole("link", { name: "Demander une visite" })).toHaveAttribute(
      "href",
      signUp(true),
    );
    // Offer (L2) and favourite (L1-18) come later; never « Prix ferme ».
    await expect(page.getByText(/faire une offre/i)).toHaveCount(0);
    await expect(page.getByText(/prix ferme/i)).toHaveCount(0);
  });

  test("a son titre SEO, son adresse canonique, son image et ses données structurées", async ({
    page,
  }) => {
    const path = await firstListingPath(page);
    await page.goto(path);
    await expect(page).toHaveTitle(/^.+ à .+ · .+€ · Leenkey$/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical ?? "").pathname).toBe(path);
    const image = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(new URL(image ?? "").pathname).toBe(path.replace("/annonce/", "/api/og/"));

    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json ?? "{}");
    expect(data).toMatchObject({
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      offers: { "@type": "Offer", priceCurrency: "EUR" },
    });
    expect(new URL(data.url).pathname).toBe(path);
    expect(typeof data.offers.price).toBe("number");
    expect(json).not.toContain("streetAddress");
  });

  test("l'image de partage est un PNG de 1200 × 630", async ({ page, request }) => {
    const path = await firstListingPath(page);
    const response = await request.get(path.replace("/annonce/", "/api/og/"));
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const png = await response.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });

  test("une annonce inconnue répond 404", async ({ page }) => {
    const response = await page.goto("/annonce/appartement-introuvable-lk0000");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cette page n'existe pas." }),
    ).toBeVisible();
  });

  test("une visite est comptée une fois par jour et par visiteur", async ({ page, context }) => {
    const path = await firstListingPath(page);
    await page.goto(path);
    const viewCookie = async () =>
      (await context.cookies()).find((cookie) => cookie.name === "lk_vues")?.value;
    await expect.poll(viewCookie).toMatch(/^\d{4}-\d{2}-\d{2}_[0-9a-f-]{36}$/);
    const first = await viewCookie();
    await page.reload();
    await settle(page);
    // The listing is already counted today: the cookie keeps one entry.
    await page.waitForTimeout(500);
    expect(await viewCookie()).toBe(first);
  });

  test("mobile : « Retour aux annonces » ramène à la recherche telle qu'elle était", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "flèche de retour sur la photo en mobile ; fil d'Ariane en desktop");
    const search = "/acheter?ville=savigny-sur-orge&rayon=5";
    await page.goto(search);
    await settle(page);
    await cards(page).first().click();
    await expect(page).toHaveURL(/\/annonce\//);
    await page.getByRole("link", { name: "Retour aux annonces" }).click();
    await expect(page).toHaveURL(new RegExp(`${search.replace(/[?]/g, "\\?")}$`));
  });

  test("aucune violation d'accessibilité sérieuse ou critique @a11y", async ({ page }) => {
    const path = await firstListingPath(page);
    await page.goto(path);
    await settle(page);
    expect(await seriousViolations(page)).toEqual([]);
  });
});
