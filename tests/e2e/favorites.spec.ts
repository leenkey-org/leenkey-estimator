import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-18: favourites, on the seed (E2E_SEED=1 with SEED_PASSWORD). seller_a
// saves and removes listings: no other test reads its favourites (the empty
// favourites page of buyer_c is checked by navigation.spec.ts). The two
// projects use different listings, so that they can run at the same time.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

/** Address of a listing of the search, from its results. */
async function listingHref(page: Page, index: number): Promise<string> {
  await page.goto("/acheter");
  const href = await page
    .getByRole("list", { name: "Résultats" })
    .locator("a:visible")
    .nth(index)
    .getAttribute("href");
  expect(href).toMatch(/^\/annonce\//);
  return href ?? "/";
}

/** Signs seller_a in and lands on `path` (terms gate as in navigation.spec.ts). */
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
      .catch(() => {
        // Accepted by a parallel test in between: the page itself opens now.
      });
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

test("sans session, le cœur mène à l'inscription acquéreur", async ({ page }) => {
  const href = await listingHref(page, 0);
  await page.goto(href);
  const heart = page.getByRole("link", { name: "Ajouter aux favoris" });
  await expect(heart).toBeVisible();
  await expect(heart).toHaveAttribute(
    "href",
    `/inscription?role=buyer&next=${encodeURIComponent(href)}`,
  );
});

test("ajouter une annonce aux favoris, la retrouver, puis la retirer", async ({
  page,
  isMobile,
}) => {
  const href = await listingHref(page, isMobile ? 0 : 1);
  // Through a signed-in page first: the terms gate is passed before the
  // favourites page needs it (a listing is public, it does not ask).
  await signIn(page, "/acquereur/favoris");
  await page.goto(href);
  const heart = page.getByRole("button", { name: "Ajouter aux favoris" });
  await expect(heart).toBeVisible();
  // Left saved by an interrupted run: start from an unsaved listing.
  if ((await heart.getAttribute("aria-pressed")) === "true") {
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Retiré de vos favoris.")).toBeAttached();
  }
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Ajouté à vos favoris.")).toBeAttached();
  // Saved on the server: still there after a reload.
  await page.reload();
  await expect(heart).toHaveAttribute("aria-pressed", "true");

  await page.goto("/acquereur/favoris");
  const card = page
    .getByRole("list", { name: "Biens sauvegardés" })
    .getByRole("listitem")
    .filter({ has: page.locator(`a[href="${href}"]`) });
  await expect(card).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);

  const cardHeart = card.getByRole("button", { name: "Ajouter aux favoris" });
  await expect(cardHeart).toHaveAttribute("aria-pressed", "true");
  await cardHeart.click();
  await expect(cardHeart).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Retiré de vos favoris.")).toBeAttached();
  // The card stays until the next visit: the tap can be undone.
  await expect(card).toHaveCount(1);
  await page.reload();
  await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
});
