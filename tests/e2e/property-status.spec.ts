import { expect, test, type Page } from "@playwright/test";

// L1-14: the actions of the status from the page of a property, which change
// the seed for good (a listing sold does not go back): this file runs only on
// a local stack just made by `scripts/local-stack.sh up`, with E2E_SEED=1,
// SEED_PASSWORD and E2E_MUTATE=1, never on the preprod (project
// « seed-mutations »). Seed listings used here only: LK-0003 (paused, then
// back online) and LK-0005 (sold) of seller_a, LK-0013 of seller_b
// (suspended by the admin, then read only for the seller), and a draft made
// here, then deleted.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1) : la spec modifie le seed",
);

const sheet = (n: number) =>
  `/vendeur/biens/5eed1000-0000-4000-8000-${String(n).padStart(12, "0")}`;

async function signIn(page: Page, account: "seller_a" | "seller_b" | "admin", path: string) {
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
      .catch(() => {});
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
  await expect(page).toHaveURL(path);
}

const actions = (page: Page) =>
  page.getByRole("main").getByRole("group", { name: "Actions sur votre annonce" });

test("mettre en pause puis remettre en ligne", async ({ page }) => {
  await signIn(page, "seller_a", sheet(3));
  const publicHref = await actions(page)
    .getByRole("link", { name: "Voir l'annonce en ligne" })
    .getAttribute("href");
  expect(publicHref).toMatch(/^\/annonce\//);

  await actions(page).getByRole("button", { name: "Mettre en pause" }).click();
  const paused = page.getByRole("main").getByText("Votre annonce est en pause.", { exact: true });
  await expect(paused).toBeVisible();
  await expect(page.getByText("En pause", { exact: true })).toBeVisible();
  await expect(page.getByText("Elle n'apparaît plus dans les recherches")).toBeVisible();
  expect((await page.request.get(publicHref ?? "")).status()).toBe(404);

  await actions(page).getByRole("button", { name: "Remettre en ligne" }).click();
  await expect(page.getByText("Votre annonce est de nouveau en ligne.")).toBeVisible();
  await expect(page.getByText("En ligne", { exact: true })).toBeVisible();
  expect((await page.request.get(publicHref ?? "")).status()).toBe(200);
});

test("marquer comme vendu : confirmation, prix final facultatif et vérifié", async ({ page }) => {
  await signIn(page, "seller_a", sheet(5));
  const opener = actions(page).getByRole("button", { name: "Marquer comme vendu" });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Marquer votre bien comme vendu ?" });
  await expect(dialog).toContainText("Vous ne pourrez pas la remettre en ligne.");
  // Closed without a decision: nothing changes, the focus comes back.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();

  await opener.click();
  const price = dialog.getByLabel("Prix de vente final");
  await price.fill("deux cent mille");
  await dialog.getByRole("button", { name: "Marquer comme vendu" }).click();
  await expect(price).toHaveAccessibleDescription(/Indiquez un prix en euros/);
  await price.fill("231 000");
  await dialog.getByRole("button", { name: "Marquer comme vendu" }).click();
  await expect(dialog).toBeHidden();
  // The outcome takes the focus (its region, read by screen readers).
  await expect(page.locator(":focus")).toHaveText("Votre bien est marqué comme vendu.");
  await expect(page.getByText("Vendu", { exact: true })).toBeVisible();
  // Amounts keep their no-break spaces: \s matches them.
  await expect(page.getByText(/^Vendu le .+, au prix de 231\s000\s€\.$/)).toBeVisible();
  await expect(actions(page)).toHaveCount(0);
  // Sold: nothing changes any more (L1-14b).
  await expect(page.getByRole("main").getByRole("link", { name: /^Modifier/ })).toHaveCount(0);
  await page.goto(`${sheet(5)}/modifier/caracteristiques`);
  await expect(page).toHaveURL(sheet(5));
});

test("une annonce suspendue par Leenkey : en lecture seule, avec son motif", async ({
  browser,
}) => {
  // The admin suspends LK-0013 from the back office (L1-19).
  const admin = await browser.newPage();
  await signIn(admin, "admin", "/admin/annonces?statut=en-ligne&q=LK-0013");
  await admin.getByRole("link", { name: "Aperçu de l'annonce LK-0013" }).click();
  // Its page, not the list, which has the same decisions.
  await expect(admin).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
  await admin
    .getByRole("group", { name: "Décisions sur l'annonce LK-0013" })
    .getByRole("button", { name: "Suspendre" })
    .click();
  const dialog = admin.getByRole("dialog", { name: "Suspendre l'annonce" });
  await dialog.getByLabel("Motif envoyé au vendeur").fill("Photos à remplacer");
  await dialog.getByRole("button", { name: "Suspendre l'annonce" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    admin.getByRole("main").getByText("Suspendue par Leenkey", { exact: true }),
  ).toBeVisible();
  await admin.close();

  const page = await browser.newPage();
  await signIn(page, "seller_b", sheet(13));
  const main = page.getByRole("main");
  await expect(main.getByText("Suspendue par Leenkey", { exact: true })).toBeVisible();
  await expect(main.getByText("Motif : Photos à remplacer")).toBeVisible();
  await expect(main.getByRole("link", { name: "contact.leenkey@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:contact.leenkey@gmail.com",
  );
  await expect(actions(page)).toHaveCount(0);
  await expect(main.getByRole("link", { name: /^Modifier/ })).toHaveCount(0);
  // The steps of the creation do not change it either, nor its pages of
  // change (L1-14b), nor its photos.
  await page.goto(`${sheet(13)}/caracteristiques`);
  await expect(page).toHaveURL(sheet(13));
  await page.goto(`${sheet(13)}/modifier/annonce`);
  await expect(page).toHaveURL(sheet(13));
  // Its three photos of the seed (L1-46b) shown, the first the cover; none
  // added, moved nor removed.
  await page.goto(`${sheet(13)}/photos`);
  await expect(main.getByText("3 photos", { exact: true })).toBeVisible();
  await expect(main.getByText("Photo principale", { exact: true })).toHaveCount(1);
  const first = main.getByRole("region", { name: "Photos" }).getByRole("listitem").first();
  await expect(first).toContainText("Photo principale");
  await expect(first).toContainText("Double séjour");
  await expect(main.getByRole("button", { name: "Ajouter des photos" })).toHaveCount(0);
  await page.close();
});

test("supprimer un brouillon, après confirmation", async ({ page }) => {
  await signIn(page, "seller_a", "/vendeur/biens/nouveau");
  await page.getByRole("button", { name: "Continuer" }).click();
  const field = page.getByRole("combobox", { name: "Adresse du bien" });
  await field.fill("12 rue de la gare");
  await page
    .getByRole("option", { name: /12 Rue de la Gare/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/vendeur\/biens\/[0-9a-f-]{36}\/caracteristiques$/);
  const id = new URL(page.url()).pathname.split("/")[3];

  await page.goto(`/vendeur/biens/${id}`);
  await expect(page.getByText("Votre annonce n'est pas encore envoyée")).toBeVisible();
  await expect(page.getByRole("link", { name: "Reprendre la création" })).toHaveAttribute(
    "href",
    `/vendeur/biens/${id}/caracteristiques`,
  );
  await actions(page).getByRole("button", { name: "Supprimer le brouillon" }).click();
  const dialog = page.getByRole("dialog", { name: "Supprimer ce brouillon ?" });
  await dialog.getByRole("button", { name: "Supprimer le brouillon" }).click();
  await expect(page).toHaveURL("/vendeur");
  await expect(page.locator(`a[href="/vendeur/biens/${id}"]`)).toHaveCount(0);
  expect((await page.goto(`/vendeur/biens/${id}`))?.status()).toBe(404);
});
