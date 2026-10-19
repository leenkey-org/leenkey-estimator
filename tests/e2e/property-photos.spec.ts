import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

// L1-12: photos of a property, at step 2 of its creation, on the seed with
// the storage of the local stack (scripts/local-stack.sh) and the address
// fixtures (GEOCODER=fixtures). Each run adds a draft with photos to
// seller_a for good: project « seed-mutations », E2E_MUTATE=1 only.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec ajoute un bien",
);

async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("seller_a@test.leenkey.fr");
  await page.getByLabel("Mot de passe").fill(SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL((url) => url.pathname !== "/connexion");
  await page.goto(path);
  if (new URL(page.url()).pathname === "/conditions") {
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page
      .waitForURL((url) => url.pathname !== "/conditions", { timeout: 5_000 })
      .catch(() => {});
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

async function expectNoSeriousViolation(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

/** Pictures of the test, written once in its output folder. */
async function pictures(folder: string) {
  mkdirSync(folder, { recursive: true });
  const write = async (name: string, data: Buffer | string) => {
    const path = join(folder, name);
    writeFileSync(path, data);
    return path;
  };
  const picture = (width: number, height: number, colour: { r: number; g: number; b: number }) =>
    sharp({ create: { width, height, channels: 3, background: colour } });
  const blue = { r: 17, g: 86, b: 252 };
  const stone = { r: 236, g: 237, b: 232 };
  return {
    sejour: await write("sejour.jpg", await picture(1600, 1200, blue).jpeg().toBuffer()),
    cuisine: await write("cuisine.png", await picture(1200, 900, stone).png().toBuffer()),
    small: await write("petite.jpg", await picture(600, 400, blue).jpeg().toBuffer()),
    pdf: await write("notes.pdf", "%PDF-1.7 pas une photo"),
    fake: await write("fausse.jpg", "pas une photo du tout"),
    more: await Promise.all(
      Array.from({ length: 15 }, async (_, index) =>
        write(
          `piece-${index + 1}.jpg`,
          await picture(1000, 750, { r: 20 * index, g: 120, b: 200 })
            .jpeg()
            .toBuffer(),
        ),
      ),
    ),
  };
}

test("photos de l'étape 2 : envoi, refus propres, ordre, légende, suppression, 15 au plus", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const files = await pictures(testInfo.outputPath("photos"));

  // A new draft, through step 1.
  await signIn(page, "/vendeur/biens/nouveau");
  const field = page.getByRole("combobox", { name: "Adresse du bien" });
  await field.fill("3 rue de paris");
  await page.getByRole("option", { name: /3 Rue de Paris/ }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/vendeur\/biens\/[0-9a-f-]{36}\/caracteristiques$/);
  const id = new URL(page.url()).pathname.split("/")[3];

  const photos = page.getByRole("region", { name: "Photos" });
  await expect(photos.getByText("0 photo sur 15")).toBeAttached();
  const upload = page.locator('input[type="file"]');
  const status = photos.getByRole("status");

  // Two photos, sent one after the other; the first is the main one.
  await upload.setInputFiles([files.sejour, files.cuisine]);
  await expect(status).toHaveText("Photo ajoutée : 2 sur 15.");
  const tiles = photos.getByRole("button", { name: /^Photo \d+ sur \d+/ });
  await expect(tiles).toHaveCount(2);
  await expect(tiles.nth(0)).toHaveAccessibleName("Photo 1 sur 2, photo principale");
  await expect(tiles.nth(1)).toHaveAccessibleName("Photo 2 sur 2");
  await expect(photos.getByText("Principale", { exact: true })).toBeVisible();
  await expectNoSeriousViolation(page);

  // Its files: signed for the owner, never cached; nothing for a visitor.
  // next/image gives the largest file as src, the others in srcset (lib/images/loader.ts);
  // with an error handler (Photo), it writes the src again, absolute, after hydration.
  const written = await tiles.nth(0).locator("img").getAttribute("src");
  const src = new URL(written ?? "", page.url()).pathname;
  expect(src).toMatch(new RegExp(`^/img/${id}/[0-9a-f-]{36}-1600\\.webp$`));
  expect(await tiles.nth(0).locator("img").getAttribute("srcset")).toContain("-400.webp 400w");
  const own = await page.request.get(src, { maxRedirects: 0 });
  expect(own.status()).toBe(302);
  expect(own.headers()["cache-control"]).toBe("private, no-store");
  expect(own.headers().location).toContain("/storage/v1/object/sign/photos/");
  const image = await page.request.get(own.headers().location);
  expect(image.headers()["content-type"]).toBe("image/webp");
  const visitor = await browser.newContext();
  expect((await visitor.request.get(new URL(src, page.url()).href)).status()).toBe(404);
  await visitor.close();

  // Refused cleanly, one alert per file with its reason; the others stay.
  await upload.setInputFiles([files.pdf, files.small, files.fake]);
  const alerts = photos.getByRole("alert");
  for (const reason of [
    "« notes.pdf » : ce format n'est pas accepté",
    "« petite.jpg » est trop petite : 800 × 600 pixels au minimum.",
    "« fausse.jpg » n'a pas pu être lue.",
  ]) {
    await expect(alerts.filter({ hasText: reason })).toHaveCount(1);
  }
  await expect(alerts).toHaveCount(3);
  await expect(tiles).toHaveCount(2);

  // A caption, from the sheet of the photo.
  await tiles.nth(0).click();
  const sheet = page.getByRole("dialog", { name: "Photo 1 sur 2" });
  await sheet.getByLabel("Légende").fill("Séjour");
  await sheet.getByRole("button", { name: "Enregistrer la légende" }).click();
  // The sheet hides the page from screen readers: its own message.
  await expect(sheet.getByText("Légende enregistrée.")).toBeVisible();
  await expectNoSeriousViolation(page);
  await sheet.getByRole("button", { name: "Fermer" }).click();
  await expect(tiles.nth(0)).toHaveAccessibleName("Photo 1 sur 2, Séjour, photo principale");
  await expect(tiles.nth(0)).toBeFocused();

  // With the keyboard: the main photo moves after the other one, keeping the focus.
  await tiles.nth(0).press("ArrowRight");
  await expect(status).toHaveText("Photo déplacée en position 2 sur 2.");
  await expect(tiles.nth(1)).toHaveAccessibleName("Photo 2 sur 2, Séjour");
  await expect(tiles.nth(1)).toBeFocused();
  await expect(tiles.nth(0)).toHaveAccessibleName("Photo 1 sur 2, photo principale");
  // Saved: the order is the same after a reload.
  await page.reload();
  await expect(tiles.nth(1)).toHaveAccessibleName("Photo 2 sur 2, Séjour");

  // From the sheet: the main photo again, then deleted, confirmed.
  await tiles.nth(1).click();
  await page.getByRole("button", { name: "En faire la photo principale" }).click();
  const moved = page.getByRole("dialog", { name: "Photo 1 sur 2" });
  await expect(
    moved.getByText("Photo déplacée en position 1 sur 2 : c'est la photo principale."),
  ).toBeVisible();
  // The button used stays, says so and keeps the focus.
  const main = moved.getByRole("button", { name: "C'est la photo principale" });
  await expect(main).toBeFocused();
  await expect(main).toHaveAttribute("aria-disabled", "true");
  await expect(moved.getByRole("button", { name: "Déplacer avant" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByRole("button", { name: "Supprimer la photo" }).click();
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(status).toHaveText("Photo supprimée.");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(tiles).toHaveCount(1);
  await expect(tiles.nth(0)).toHaveAccessibleName("Photo 1 sur 1, photo principale");

  // 15 at most: the 15th fills the grid, the 16th is refused.
  await upload.setInputFiles(files.more);
  await expect(
    alerts.filter({ hasText: "15 photos au maximum : « piece-15.jpg » n'a pas été ajoutée." }),
  ).toHaveCount(1);
  await expect(status).toHaveText("Photo ajoutée : 15 sur 15.", { timeout: 60_000 });
  await expect(tiles).toHaveCount(15);
  await expect(photos.getByRole("button", { name: "15 photos au maximum" })).toBeDisabled();

  // Then on « Ma vente », the main photo in the thumbnail of the draft.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL("/vendeur");
  const row = page.locator(`a[href="/vendeur/biens/${id}"]`);
  // Absolute once hydrated (Photo, as above).
  await expect(row.locator("img")).toHaveAttribute(
    "src",
    new RegExp(`^(?:https?://[^/]+)?/img/${id}/[0-9a-f-]{36}-1600\\.webp$`),
  );

  // Its page (L1-14), tab Photos: the same 15, which change there too
  // (L1-14b), the main one first, each one shown to its owner.
  await row.click();
  await expect(page).toHaveURL(`/vendeur/biens/${id}`);
  await page
    .getByRole("navigation", { name: "Rubriques de votre bien" })
    .getByRole("link", { name: "Photos" })
    .click();
  await expect(page).toHaveURL(`/vendeur/biens/${id}/photos`);
  const tab = page.getByRole("main").getByRole("region", { name: "Photos" });
  await expect(tab.getByRole("heading", { level: 2 })).toHaveText("Photos");
  const sheetTiles = tab.getByRole("button", { name: /^Photo \d+ sur 15/ });
  await expect(sheetTiles).toHaveCount(15);
  await expect(sheetTiles.nth(0)).toHaveAccessibleName("Photo 1 sur 15, photo principale");
  const first = sheetTiles.nth(0).locator("img");
  await expect(first).toHaveAttribute("src", new RegExp(`/img/${id}/[0-9a-f-]{36}-\\d+\\.webp$`));
  await expect
    .poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await expect(tab.getByRole("button", { name: "15 photos au maximum" })).toBeDisabled();
  await expectNoSeriousViolation(page);
});
