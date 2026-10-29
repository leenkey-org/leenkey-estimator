import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fakeGoogleMaps, MAPS_SCRIPT } from "./google-maps";

// L1-16: the maps of Google Maps, with a stand-in of the API (google-maps.ts).
// The build under test has a key (the CI sets a fake one, the stand-in never
// checks it). A key refused by Google is simulated (__fakeMapsAuthFailure).
// Since L1-63 the maps load without a click: beside the list from 1 024 px,
// with « Carte » on a phone, near « Où se situe le bien » on a listing; the
// browsers of the tests never reach Google (playwright.config.ts).
//
// Modes of search.spec.ts: the « sans base » tests run on the CI build
// without Supabase; E2E_SEED=1 runs the others on a seeded database.

const seeded = process.env.E2E_SEED === "1";

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

  test("desktop : la carte se charge avec la page, sans clic, une fois, en français", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await expect(fakeMap(page)).toBeVisible();
    await settled(page);
    // The script of Google, once (its libraries come with it).
    const scripts = asked.filter((url) => MAPS_SCRIPT.test(url));
    expect(scripts).toHaveLength(1);
    const script = new URL(scripts[0] ?? "");
    expect(script.searchParams.get("language")).toBe("fr");
    expect(script.searchParams.get("region")).toBe("FR");
    expect(script.searchParams.get("key")).toBeTruthy();
  });

  test("desktop : Google injoignable, et la carte dit qu'elle n'est pas disponible", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    // No stand-in: the browsers of the tests never reach Google Maps. The
    // script is asked for, fails, and the map says so.
    const failed = page.waitForEvent("requestfailed", (request) => MAPS_SCRIPT.test(request.url()));
    await page.goto("/acheter");
    await failed;
    await expect(
      page.getByRole("status").filter({ hasText: "La carte n'est pas disponible pour le moment." }),
    ).toBeVisible();
    await expect(fakeMap(page)).toHaveCount(0);
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

  test("desktop : une pastille de prix par bien, la carte survolée l'allume, la pastille choisie montre son bien sur la carte", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "la carte est à côté de la liste à partir de 1 024 px");
    await fakeGoogleMaps(context);
    await page.goto("/acheter");
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

    // A pill of the end of the list, from the keyboard (it may be a dot under
    // another one, label-layer.ts): its card over the map (L1-62), the focus
    // on its link, the pill in the gradient (white text) and in the room the
    // card leaves on the part of the map seen (the card at the top on the
    // desktop); its card outlined in the list, which does not scroll.
    await page.mouse.move(0, 0);
    await expect(active).toHaveCount(0);
    const last = page.locator("[data-listing-id]").last();
    const lastId = await last.getAttribute("data-listing-id");
    expect(lastId).not.toBe(id);
    const pill = fakeMap(page).locator(`[data-label-id="${lastId}"]`);
    const scrolled = await page.evaluate(() => window.scrollY);
    await pill.focus();
    await page.keyboard.press("Enter");
    const preview = page.getByRole("region", { name: "Bien choisi sur la carte" });
    const link = preview.getByRole("link");
    await expect(link).toHaveAttribute(
      "href",
      (await last.locator("a").first().getAttribute("href")) ?? "",
    );
    await expect(link).toBeFocused();
    await expect(pill).toHaveAttribute("data-selected", "");
    await expect(pill).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(last).toHaveAttribute("data-selected", "true");
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    const [pillBox, cardBox, mapBox] = await Promise.all([
      pill.boundingBox(),
      preview.boundingBox(),
      fakeMap(page).boundingBox(),
    ]);
    expect(pillBox && cardBox && mapBox).toBeTruthy();
    const seen = await page.evaluate(() => window.innerHeight);
    if (pillBox && cardBox && mapBox) {
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(seen);
      expect(pillBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
      expect(pillBox.y + pillBox.height).toBeLessThanOrEqual(
        Math.min(mapBox.y + mapBox.height, seen),
      );
      expect(pillBox.x).toBeGreaterThanOrEqual(mapBox.x);
      expect(pillBox.x + pillBox.width).toBeLessThanOrEqual(mapBox.x + mapBox.width);
    }
    // The card open: no serious violation.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const scan = await new AxeBuilder({ page }).include("[data-search-map]").analyze();
    expect(
      scan.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => violation.id),
    ).toEqual([]);

    // Another pill: its own card, from its first photo.
    const other = fakeMap(page).locator(`[data-label-id="${id}"]`);
    await other.focus();
    await page.keyboard.press("Enter");
    await expect(link).toHaveAttribute(
      "href",
      (await first.locator("a").first().getAttribute("href")) ?? "",
    );
    await expect(pill).not.toHaveAttribute("data-selected", "");

    // Escape closes it, the focus back on its pill, now « seen » (Airbnb):
    // grey at rest, in the gradient again when hovered.
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(other).toBeFocused();
    await expect(other).toHaveAttribute("data-visited", "");
    await expect(pill).toHaveAttribute("data-visited", "");
    await expect(pill).toHaveCSS("color", "rgb(71, 85, 105)");
    // Focused, the pill is above the others: hovered, in the gradient.
    await other.hover();
    await expect(other).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(0, 0);
    // « Fermer l'aperçu » too, and a press on the map itself.
    await page.keyboard.press("Enter");
    await preview.getByRole("button", { name: "Fermer l'aperçu" }).click();
    await expect(preview).toHaveCount(0);
    await expect(other).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(preview).toBeVisible();
    await fakeMap(page).dispatchEvent("click");
    await expect(preview).toHaveCount(0);

    // Our zoom buttons, at the top right.
    const zoom = Number(await fakeMap(page).getAttribute("data-zoom"));
    await page.getByRole("button", { name: "Zoom avant" }).click();
    await expect(fakeMap(page)).toHaveAttribute("data-zoom", String(zoom + 1));
    await page.getByRole("button", { name: "Zoom arrière" }).click();
    await expect(fakeMap(page)).toHaveAttribute("data-zoom", String(zoom));
  });

  test("téléphone : rien n'est demandé à Google avant « Carte », qui ouvre la carte en plein écran ; une pastille montre son bien, « Liste » revient", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(!isMobile, "bouton des téléphones");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    await settled(page);
    // The panel of the desktop is hidden below 1024 px: no map, no request.
    expect(asked).toEqual([]);
    await page.getByRole("button", { name: "Carte", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Carte des biens" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-fake-map]")).toBeVisible();
    // One map only: the panel of the desktop, hidden, loads none.
    await expect(page.locator("[data-fake-map]")).toHaveCount(1);
    await expect(
      dialog.locator("[data-fake-map]").getByRole("button", { name: /€/ }).first(),
    ).toBeVisible();

    const pill = dialog.locator("[data-fake-map]").getByRole("button", { name: /€/ }).first();
    await pill.focus();
    await page.keyboard.press("Enter");
    const preview = dialog.getByRole("region", { name: "Bien choisi sur la carte" });
    await expect(preview.getByRole("link")).toHaveAttribute("href", /^\/annonce\/[a-z0-9-]+$/);
    await expect(preview.getByRole("link")).toBeFocused();
    // Escape closes the card, not the map; the focus back on its pill.
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(pill).toBeFocused();
    // The card above « Liste ».
    await page.keyboard.press("Enter");
    const [cardBox, listBox] = await Promise.all([
      preview.boundingBox(),
      dialog.getByRole("button", { name: "Liste" }).boundingBox(),
    ]);
    if (cardBox && listBox) expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(listBox.y);
    // Escape with the focus on the pill: the card closes, not the map.
    await pill.focus();
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Enter");
    await preview.getByRole("button", { name: "Fermer l'aperçu" }).click();
    await expect(preview).toHaveCount(0);
    await expect(pill).toBeFocused();

    await dialog.getByRole("button", { name: "Liste" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Carte", exact: true })).toBeFocused();
    // Opened again: the same script, never asked a second time.
    await page.getByRole("button", { name: "Carte", exact: true }).click();
    await expect(dialog.locator("[data-fake-map]")).toBeVisible();
    expect(asked.filter((url) => MAPS_SCRIPT.test(url))).toHaveLength(1);
  });

  test("annonce : la carte ne se charge qu'en approchant de « Où se situe le bien », sans clic", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(!isMobile, "sur téléphone, « Où se situe le bien » est loin sous la photo");
    const asked = await fakeGoogleMaps(context);
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    await settled(page);
    await expect(page.locator("[data-fake-map]")).toHaveCount(0);
    expect(asked).toEqual([]);
    await page.getByRole("heading", { name: "Où se situe le bien" }).scrollIntoViewIfNeeded();
    await expect(page.locator("[data-fake-map]")).toBeVisible();
    expect(asked.filter((url) => MAPS_SCRIPT.test(url))).toHaveLength(1);
  });

  test("annonce : secteur de 400 m, jamais l'adresse, et « Voir la rue »", async ({
    page,
    context,
  }) => {
    await fakeGoogleMaps(context);
    await page.goto("/acheter");
    const href = await cards(page).first().getAttribute("href");
    await page.goto(href ?? "");
    const area = page.getByRole("region", { name: "Où se situe le bien" });
    await area.getByRole("heading", { name: "Où se situe le bien" }).scrollIntoViewIfNeeded();
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
    await page.getByRole("heading", { name: "Où se situe le bien" }).scrollIntoViewIfNeeded();
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
