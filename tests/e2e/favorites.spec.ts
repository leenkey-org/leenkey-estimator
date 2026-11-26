import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-18: favourites, on the seed (E2E_SEED=1 with SEED_PASSWORD). seller_a
// saves and removes listings of seller_b: no other test reads its favourites
// (navigation.spec.ts checks the favourites page of buyer_c). Fixed seed
// listings, one per project, so that the two projects can run at the same
// time and the order of the search results does not matter. The last test
// removes the offline favourite of buyer_c: npm run db:seed puts it back.
// Named lists (DECISIONS.md 2026-11-26): seller_a again, on the listing of
// its project (LK-0009, LK-0011: no spec takes them offline) and with list
// names of its project; the test removes what it made, before and after.
// The tests of this file run one after the other in each project (not
// fullyParallel): two of them use the same favourite of seller_a.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
/** The heart of a listing: over the photo on a phone, « Enregistrer » beside the title from 1024 px (L1-60). */
const HEART = /^(Ajouter aux favoris|Enregistrer)$/;

test.describe.configure({ mode: "default" });
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

test("listes de favoris : créer, ranger, filtrer, renommer, supprimer", async ({
  page,
  isMobile,
}) => {
  const href = isMobile ? LISTINGS.mobile : LISTINGS.desktop;
  // Names of the project: the two projects work on the lists of seller_a at the same time.
  const NAME = isMobile ? "Liste E2E mobile" : "Liste E2E desktop";
  const RENAMED = `${NAME} renommée`;
  const pills = page.getByRole("navigation", { name: "Listes de favoris" });
  const pill = (name: string) => pills.getByRole("link", { name: new RegExp(`^${name} · \\d+$`) });
  const status = (text: string) => page.getByRole("status").filter({ hasText: text });
  const dialog = page.getByRole("dialog");
  const card = page
    .getByRole("list", { name: "Biens sauvegardés" })
    .getByRole("listitem")
    .filter({ has: page.locator(`a[href="${href}"]`) });
  const removeList = async (name: string) => {
    await pill(name).click();
    await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Supprimer la liste" }).click();
    await expect(dialog).toContainText("Les biens de cette liste restent dans vos favoris");
    await dialog.getByRole("button", { name: "Supprimer la liste" }).click();
    await expect(page).toHaveURL("/acquereur/favoris");
    await expect(pill(name)).toHaveCount(0);
  };

  await signIn(page, "/acquereur/favoris");
  // Left by an interrupted run: start without the lists of this test.
  for (const name of [RENAMED, NAME]) {
    if ((await pill(name).count()) > 0) await removeList(name);
  }
  await page.goto(href);
  const heart = page.getByRole("button", { name: HEART });
  if ((await heart.getAttribute("aria-pressed")) !== "true") {
    await heart.click();
    await expect(page.getByText("Ajouté à vos favoris.")).toBeAttached();
  }
  await page.goto("/acquereur/favoris");
  await expect(card).toHaveCount(1);

  // A name is required; the list then shows among the filters, empty.
  await page.getByRole("button", { name: "Nouvelle liste" }).click();
  // The dialog opens on its field; a refusal brings the focus back to it.
  await expect(dialog.getByLabel("Nom de la liste")).toBeFocused();
  await dialog.getByRole("button", { name: "Créer la liste" }).click();
  await expect(dialog.getByText("Donnez un nom à la liste.")).toBeVisible();
  await expect(dialog.getByLabel("Nom de la liste")).toBeFocused();
  // Not the name of a filter of the page.
  await dialog.getByLabel("Nom de la liste").fill(" sans  LISTE ");
  await dialog.getByRole("button", { name: "Créer la liste" }).click();
  await expect(
    dialog.getByText("« Tous » et « Sans liste » sont déjà les noms de deux filtres."),
  ).toBeVisible();
  await dialog.getByLabel("Nom de la liste").fill(NAME);
  await dialog.getByRole("button", { name: "Créer la liste" }).click();
  await expect(status(`La liste « ${NAME} » est créée.`)).toBeVisible();
  await expect(pill(NAME)).toHaveText(`${NAME} · 0`);
  await expect(page.getByRole("button", { name: "Nouvelle liste" })).toBeFocused();
  // Not the same name twice, whatever its case.
  await page.getByRole("button", { name: "Nouvelle liste" }).click();
  await dialog.getByLabel("Nom de la liste").fill(NAME.toUpperCase());
  await dialog.getByRole("button", { name: "Créer la liste" }).click();
  await expect(dialog.getByText("Vous avez déjà une liste de ce nom.")).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).click();

  // Filed from its card; the filters follow.
  const menu = card.getByRole("combobox", { name: /^Ranger dans une liste : / });
  await expect(menu).toHaveValue("");
  await menu.selectOption({ label: NAME });
  await expect(status(`Rangé dans « ${NAME} ».`)).toBeVisible();
  await expect(pill(NAME)).toHaveText(`${NAME} · 1`);
  await pill("Sans liste").click();
  await expect(page).toHaveURL(/\?liste=aucune$/);
  await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
  await pill(NAME).click();
  await expect(page).toHaveURL(/\?liste=[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 2, name: NAME, exact: true })).toBeVisible();
  await expect(pill(NAME)).toHaveAttribute("aria-current", "page");
  await expect(card).toHaveCount(1);
  await expect(
    page.getByRole("list", { name: "Biens sauvegardés" }).getByRole("listitem"),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Renommer" }).click();
  await expect(dialog.getByLabel("Nom de la liste")).toHaveValue(NAME);
  await dialog.getByLabel("Nom de la liste").fill(RENAMED);
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(status(`La liste s'appelle maintenant « ${RENAMED} ».`)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: RENAMED, exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
  // The phone width holds the filters, the title and its actions.
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0);

  // Deleted: back to every favourite, the message with the focus, the favourite kept.
  await removeList(RENAMED);
  const gone = status(`La liste « ${RENAMED} » est supprimée. Ses biens restent dans vos favoris.`);
  await expect(gone).toBeVisible();
  await expect(gone).toBeFocused();
  await expect(card).toHaveCount(1);

  // As found: the favourite of this test removed.
  const cardHeart = card.getByRole("button", { name: /^Ajouter aux favoris/ });
  await cardHeart.click();
  await expect(cardHeart).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Retiré de vos favoris.")).toBeAttached();
  await page.reload();
  await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
});
