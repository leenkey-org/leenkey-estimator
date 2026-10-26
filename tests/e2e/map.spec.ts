import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fakeGoogleMaps } from "./google-maps";

// L1-16: the maps of Google Maps, with a stand-in of the API (google-maps.ts).
// The build under test has a key (the CI sets a fake one): without it the
// maps say they are not available, which the unit tests cover.
//
// Modes of search.spec.ts: the « sans base » tests run on the CI build
// without Supabase; E2E_SEED=1 runs the others on a seeded database.

const seeded = process.env.E2E_SEED === "1";

const gateButton = (page: Page) => page.getByRole("button", { name: "Afficher la carte" });
const fakeMap = (page: Page) => page.locator("[data-fake-map]");
/** Price pills on the map (the overlay of core/maps/label-layer.ts). */
const pills = (page: Page) => fakeMap(page).getByRole("button", { name: /€/ });
const cards = (page: Page) => page.getByRole("list", { name: "Résultats" }).locator("a:visible");

test.beforeEach(async ({ page }) => {
  // Each test opens a new tab: the choice of the visit (sessionStorage) is not kept.
  await page.addInitScript(() => window.sessionStorage.removeItem("lk:maps:allowed"));
});

test.describe("carte de la recherche, sans base de données", () => {
  test.skip(seeded, "états sans base de données, testés hors E2E_SEED");

  test("desktop : rien n'est demandé à Google avant « Afficher la carte », puis la carte reste pour la visite", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await expect(page.getByText("Voir les biens sur la carte")).toBeVisible();
    await expect(page.getByText(/fournie par Google Maps/)).toBeVisible();
    expect(asked).toEqual([]);

    await gateButton(page).click();
    await expect(fakeMap(page)).toBeVisible();
    expect(asked).toHaveLength(1);
    const script = new URL(asked[0] ?? "");
    expect(script.searchParams.get("language")).toBe("fr");
    expect(script.searchParams.get("region")).toBe("FR");
    expect(script.searchParams.get("key")).toBeTruthy();

    // The same visit: the map without asking again.
    await page.reload();
    await expect(fakeMap(page)).toBeVisible();
    await expect(gateButton(page)).toHaveCount(0);
  });

  test("téléphone : pas de bouton « Carte » sans résultat", async ({ page, isMobile }) => {
    test.skip(!isMobile, "bouton des téléphones");
    await page.goto("/acheter");
    await expect(page.getByRole("button", { name: "Carte", exact: true })).toHaveCount(0);
  });
});

test.describe("carte de la recherche (base de seed)", () => {
  test.skip(!seeded, "base de seed requise (E2E_SEED=1)");

  test("desktop : une pastille de prix par bien, la carte survolée la met en bleu, la pastille choisie montre sa carte", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await gateButton(page).click();
    await expect(fakeMap(page)).toBeVisible();
    const count = await cards(page).count();
    expect(count).toBeGreaterThan(1);
    await expect(pills(page)).toHaveCount(count);
    await expect(pills(page).first()).toHaveText(/^\d[\d,\s\u202f]*\s?[kM]€$/);
    // Every pill is drawn inside the map, framed on the results.
    const frame = await fakeMap(page).boundingBox();
    for (const box of await Promise.all(
      (await pills(page).all()).map((pill) => pill.boundingBox()),
    )) {
      expect(box && frame).toBeTruthy();
      if (!box || !frame) continue;
      expect(box.x).toBeGreaterThanOrEqual(frame.x);
      expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
    }

    // The card under the pointer lights its pill, the name of which repeats the card.
    const first = page.locator("[data-listing-id]").first();
    const id = await first.getAttribute("data-listing-id");
    await first.hover();
    const active = fakeMap(page).locator("button[data-active]");
    await expect(active).toHaveCount(1);
    const price = (await first.locator("a:visible p").first().textContent()) ?? "";
    await expect(active).toHaveAccessibleName(new RegExp(`^${price.replace(/\s/g, "\\s")}, `));

    // A pill of the end of the list: its card comes into view, outlined, its link focused.
    await page.mouse.move(0, 0);
    const last = page.locator("[data-listing-id]").last();
    const lastId = await last.getAttribute("data-listing-id");
    expect(lastId).not.toBe(id);
    const lastPrice = (await last.locator("a:visible p").first().textContent()) ?? "";
    // From the keyboard: pills of the same area of 200 m sit on one another
    // until their grouping (L1-16b).
    await fakeMap(page)
      .getByRole("button", { name: new RegExp(`^${lastPrice.replace(/\s/g, "\\s")}, `) })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    await expect(last).toHaveAttribute("data-flash", "true");
    await expect(last).toBeInViewport();
    await expect(last.locator("a:visible")).toBeFocused();
    await expect(last).not.toHaveAttribute("data-flash", { timeout: 3000 });
  });

  test("téléphone : « Carte » ouvre la carte en plein écran, une pastille montre son bien, « Liste » revient", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(!isMobile, "bouton des téléphones");
    await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await page.getByRole("button", { name: "Carte", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Carte des biens" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Afficher la carte" }).click();
    await expect(dialog.locator("[data-fake-map]")).toBeVisible();
    // One map only: the panel of the desktop, hidden, loads none.
    await expect(page.locator("[data-fake-map]")).toHaveCount(1);
    await expect(
      dialog.locator("[data-fake-map]").getByRole("button", { name: /€/ }).first(),
    ).toBeVisible();

    await dialog.locator("[data-fake-map]").getByRole("button", { name: /€/ }).first().focus();
    await page.keyboard.press("Enter");
    const preview = dialog.getByRole("region", { name: "Bien choisi sur la carte" });
    await expect(preview.getByRole("link")).toHaveAttribute("href", /^\/annonce\/[a-z0-9-]+$/);
    await preview.getByRole("button", { name: "Fermer l'aperçu" }).click();
    await expect(preview).toHaveCount(0);

    await dialog.getByRole("button", { name: "Liste" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Carte", exact: true })).toBeFocused();
  });

  test("annonce : secteur de 400 m, jamais l'adresse, et « Voir la rue »", async ({
    page,
    context,
  }) => {
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    const area = page.getByRole("region", { name: "Localisation" });
    await expect(area.getByRole("heading", { name: "Localisation" })).toBeVisible();
    expect(asked).toEqual([]);
    await area.getByRole("button", { name: "Afficher la carte" }).click();
    const map = area.locator("[data-fake-map]");
    await expect(map).toHaveAttribute("data-circle", "400");
    await expect(area.getByText(/^Secteur approximatif, /)).toBeVisible();

    await area.getByRole("button", { name: "Voir la rue" }).click();
    await expect(map).toHaveAttribute("data-street-view", "open");
    await expect(area.getByRole("button", { name: "Voir la rue" })).toHaveCount(0);
  });

  test("annonce : sans vue de la rue dans le secteur, la carte le dit", async ({
    page,
    context,
  }) => {
    await fakeGoogleMaps(context);
    await page.addInitScript(() => {
      (window as Window & { __fakeMapsNoStreetView?: boolean }).__fakeMapsNoStreetView = true;
    });
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    await page.getByRole("button", { name: "Afficher la carte" }).click();
    await page.getByRole("button", { name: "Voir la rue" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Pas de vue de la rue" }),
    ).toBeVisible();
  });

  test("carte affichée : aucune violation d'accessibilité sérieuse ou critique @a11y", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await gateButton(page).click();
    await expect(pills(page).first()).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => violation.id),
    ).toEqual([]);
  });
});
