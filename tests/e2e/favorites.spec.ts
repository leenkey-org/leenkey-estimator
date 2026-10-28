import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-18: favourites, on the seed (E2E_SEED=1 with SEED_PASSWORD). seller_a
// saves and removes listings of seller_b: no other test reads its favourites
// (navigation.spec.ts checks the favourites page of buyer_c). Fixed seed
// listings, one per project, so that the two projects can run at the same
// time and the order of the search results does not matter. The last test
// removes the offline favourite of buyer_c: npm run db:seed puts it back.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
/** The heart of a listing: over the photo on a phone, « Enregistrer » beside the title from 1024 px (L1-60). */
const HEART = /^(Ajouter aux favoris|Enregistrer)$/;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");

/** Published seed listings of seller_b (supabase/seed/05_demo_data.sql). */
const LISTINGS = {
  mobile: "/annonce/appartement-3-pieces-viry-chatillon-lk0009",
  desktop: "/annonce/appartement-3-pieces-chilly-mazarin-lk0011",
  failure: "/annonce/appartement-2-pieces-athis-mons-lk0012",
} as const;

/** Signs a seed account in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, path: string, account = "seller_a") {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill(`${account}@test.leenkey.fr`);
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
  const href = LISTINGS.mobile;
  await page.goto(href);
  const heart = page.getByRole("link", { name: HEART });
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
  const href = isMobile ? LISTINGS.mobile : LISTINGS.desktop;
  // Through a signed-in page first: the terms gate is passed before the
  // favourites page needs it (a listing is public, it does not ask).
  await signIn(page, "/acquereur/favoris");
  await page.goto(href);
  const heart = page.getByRole("button", { name: HEART });
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
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
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

test("un échec d'enregistrement laisse la page en place et remet le cœur", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "un seul passage suffit");
  await signIn(page, "/acquereur/favoris");
  await page.goto(LISTINGS.failure);
  const title = page.getByRole("heading", { level: 1 });
  const titleText = (await title.textContent()) ?? "";
  expect(titleText).not.toBe("");
  const heart = page.getByRole("button", { name: HEART });
  const before = (await heart.getAttribute("aria-pressed")) ?? "false";
  // The server action posts to the page: cut it, as a lost network would.
  await page.route(`**${LISTINGS.failure}`, (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await heart.click();
  await expect(
    page.getByText("Le changement n'a pas pu être enregistré. Réessayez."),
  ).toBeAttached();
  await expect(heart).toHaveAttribute("aria-pressed", before);
  // Still the listing, not an error screen.
  await expect(title).toHaveText(titleText);
});

test("les favoris qui ne sont plus en ligne sont comptés, puis retirés", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "un seul passage suffit (le seed change)");
  // The seed keeps the refused listing LK-0016 in the favourites of buyer_c.
  await signIn(page, "/acquereur/favoris", "buyer_c");
  const offline = page.getByText("1\u00A0bien de vos favoris n'est plus en ligne", {
    exact: false,
  });
  await expect(offline, "favori hors ligne absent : rejouer npm run db:seed").toBeVisible();
  const cards = page.getByRole("list", { name: "Biens sauvegardés" }).getByRole("listitem");
  await expect(cards).toHaveCount(3);
  const clear = page.getByRole("button", { name: "Les retirer de mes favoris" });
  // A lost network first: the message says so, the focus is back on the button.
  await page.route("**/acquereur/favoris", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await clear.click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Ces favoris n'ont pas pu être retirés. Réessayez." }),
  ).toBeVisible();
  await expect(clear).toBeFocused();
  await expect(offline).toBeVisible();
  await page.unroute("**/acquereur/favoris");
  await clear.click();
  const message = page.getByRole("status").filter({
    hasText: "Les biens qui ne sont plus en ligne sont retirés de vos favoris.",
  });
  // The message stays once the page has no offline favourite left, with the focus.
  await expect(message).toBeVisible();
  await expect(offline).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Les retirer de mes favoris" })).toHaveCount(0);
  await expect(message).toBeVisible();
  await expect(message).toBeFocused();
  await expect(cards).toHaveCount(3);
});
