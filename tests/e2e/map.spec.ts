import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fakeGoogleMaps } from "./google-maps";

// L1-16: the maps of Google Maps, with a stand-in of the API (google-maps.ts).
// The build under test has a key (the CI sets a fake one, the stand-in never
// checks it). A key refused by Google is simulated (__fakeMapsAuthFailure);
// a build without key shows the same notice instead of the gate.
//
// Modes of search.spec.ts: the « sans base » tests run on the CI build
// without Supabase; E2E_SEED=1 runs the others on a seeded database.

const seeded = process.env.E2E_SEED === "1";

const gateButton = (page: Page) => page.getByRole("button", { name: "Afficher la carte" });
const fakeMap = (page: Page) => page.locator("[data-fake-map]");
/** Price pills on the map (the overlay of core/maps/label-layer.ts). */
const pills = (page: Page) => fakeMap(page).getByRole("button", { name: /€/ });
const cards = (page: Page) => page.getByRole("list", { name: "Résultats" }).locator("a:visible");

/**
 * The page hydrated and its effects run: a map loaded by an effect would have
 * asked for its script by then (an absence checked right after the HTML of
 * the server proves nothing).
 */
async function settled(page: Page) {
  await page.waitForFunction(() => document.readyState === "complete");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 400))),
  );
}

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
    await settled(page);
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

  test("desktop : une clé refusée par Google, et la carte dit qu'elle n'est pas disponible", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    await fakeGoogleMaps(context);
    await page.addInitScript(() => {
      (window as Window & { __fakeMapsAuthFailure?: boolean }).__fakeMapsAuthFailure = true;
    });
    await page.goto("/acheter");
    await gateButton(page).click();
    await expect(
      page.getByRole("status").filter({ hasText: "La carte n'est pas disponible pour le moment." }),
    ).toBeVisible();
    await expect(fakeMap(page)).toHaveCount(0);
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

    // The card under the pointer lights its pill, the name of which starts with its text.
    const first = page.locator("[data-listing-id]").first();
    const id = await first.getAttribute("data-listing-id");
    await first.hover();
    const active = fakeMap(page).locator("button[data-active]");
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("data-label-id", id ?? "");
    const text = (await active.textContent()) ?? "";
    await expect(active).toHaveAccessibleName(new RegExp(`^${text.replace(/\s/g, "\\s")}, `));

    // A pill of the end of the list: its card comes into view, outlined, its link focused.
    await page.mouse.move(0, 0);
    await expect(active).toHaveCount(0);
    const last = page.locator("[data-listing-id]").last();
    const lastId = await last.getAttribute("data-listing-id");
    expect(lastId).not.toBe(id);
    // From the keyboard: a pill may be a dot under another one (label-layer.ts).
    await fakeMap(page).locator(`[data-label-id="${lastId}"]`).focus();
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

  test("téléphone : choix déjà fait, la page rechargée ne demande rien à Google avant « Carte »", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(!isMobile, "bouton des téléphones");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await page.getByRole("button", { name: "Carte", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Afficher la carte" }).click();
    await expect(page.locator("[data-fake-map]")).toHaveCount(1);
    await page.getByRole("button", { name: "Liste" }).click();
    const before = asked.length;
    await page.reload();
    await settled(page);
    // The panel of the desktop is hidden below 1024 px: no map, no request.
    expect(asked).toHaveLength(before);
    await page.getByRole("button", { name: "Carte", exact: true }).click();
    await expect(page.getByRole("dialog").locator("[data-fake-map]")).toBeVisible();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Afficher la carte" }),
    ).toHaveCount(0);
  });

  test("annonce : choix déjà fait, la carte ne se charge qu'en approchant de « Où se situe le bien »", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(!isMobile, "sur téléphone, « Où se situe le bien » est loin sous la photo");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    await page
      .getByRole("region", { name: "Où se situe le bien" })
      .getByRole("button", { name: "Afficher la carte" })
      .click();
    await expect(page.locator("[data-fake-map]")).toBeVisible();
    // Another listing of the same visit, opened at its top.
    await page.goto("/acheter");
    const other = await cards(page).nth(1).getAttribute("href");
    const before = asked.length;
    await page.goto(other ?? "");
    await settled(page);
    await expect(page.locator("[data-fake-map]")).toHaveCount(0);
    expect(asked).toHaveLength(before);
    await page.getByRole("heading", { name: "Où se situe le bien" }).scrollIntoViewIfNeeded();
    await expect(page.locator("[data-fake-map]")).toBeVisible();
  });

  test("annonce : secteur de 400 m, jamais l'adresse, et « Voir la rue »", async ({
    page,
    context,
  }) => {
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    const area = page.getByRole("region", { name: "Où se situe le bien" });
    await expect(area.getByRole("heading", { name: "Où se situe le bien" })).toBeVisible();
    await settled(page);
    expect(asked).toEqual([]);
    await area.getByRole("button", { name: "Afficher la carte" }).click();
    const map = area.locator("[data-fake-map]");
    await expect(map).toHaveAttribute("data-circle", "400");
    await expect(area.getByText(/^Secteur approximatif, /)).toBeVisible();

    await area.getByRole("button", { name: "Voir la rue" }).click();
    await expect(map).toHaveAttribute("data-street-view", "open");
    await expect(area.getByRole("button", { name: "Voir la rue" })).toHaveCount(0);
    // The street keeps the focus, « Revenir à la carte » gives it back to « Voir la rue ».
    await expect(area.locator("[tabindex='-1']")).toBeFocused();
    await area.getByRole("button", { name: "Revenir à la carte" }).click();
    await expect(map).toHaveAttribute("data-street-view", "closed");
    await expect(area.getByRole("button", { name: "Voir la rue" })).toBeFocused();
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
