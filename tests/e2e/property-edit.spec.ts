import AxeBuilder from "@axe-core/playwright";
import { expect, test, type FileChooser, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";

// L1-14b: a listing online changed from the page of its property, which
// stays online (SPEC-V2 8.3): its characteristics, its price, title and
// description, its photos; never its address. Changes the seed for good:
// only on a local stack just made by `scripts/local-stack.sh up`, with
// E2E_SEED=1, SEED_PASSWORD and E2E_MUTATE=1, never on the preprod (project
// « seed-mutations »). Seed listing used here only: LK-0002 of seller_a.
// Suspended and sold listings, read only: property-status.spec.ts. The
// history of these changes (L1-35): last test.

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
// One listing, changed in turn.
test.describe.configure({ mode: "serial" });

const sheet = "/vendeur/biens/5eed1000-0000-4000-8000-000000000002";
const saved = "Vos modifications sont enregistrées et visibles sur votre annonce.";

async function signIn(page: Page, path: string, account: "seller_a" | "admin" = "seller_a") {
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

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Nothing waits below the screen (DESIGN.md 9): axe reads the whole page.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => violation.id);
  expect(serious).toEqual([]);
}

/** The value of a row of a table of facts (« Chambres » → « 4 »). */
const fact = (table: Locator, label: string) =>
  table.locator("div", { has: table.page().getByText(label, { exact: true }) }).locator("dd");

const publicHref = async (page: Page) => {
  const href = await page
    .getByRole("main")
    .getByRole("group", { name: "Actions sur votre annonce" })
    .getByRole("link", { name: "Voir l'annonce en ligne" })
    .getAttribute("href");
  expect(href).toMatch(/^\/annonce\/.+lk0002$/);
  return href ?? "";
};

test("ses caractéristiques changent, l'annonce reste en ligne ; son adresse ne change plus", async ({
  page,
}) => {
  await signIn(page, sheet);
  const main = page.getByRole("main");
  // The address no longer changes once sent: Leenkey corrects it.
  await expect(main.getByRole("link", { name: "Modifier l'adresse" })).toHaveCount(0);
  await expect(main.getByRole("link", { name: "contact.leenkey@gmail.com" })).toHaveAttribute(
    "href",
    "mailto:contact.leenkey@gmail.com",
  );
  await page.goto(`${sheet}/adresse`);
  await expect(page).toHaveURL(sheet);

  await main.getByRole("link", { name: "Modifier les caractéristiques" }).click();
  await expect(page).toHaveURL(`${sheet}/modifier/caracteristiques`);
  await expect(page).toHaveTitle("Caractéristiques · Modifier votre bien · Leenkey");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Modifier votre bien");
  await expect(page.getByText(/^Votre annonce reste en ligne/)).toBeVisible();
  // The photos change in their tab, not here.
  await expect(page.getByRole("button", { name: "Ajouter des photos" })).toHaveCount(0);
  // Its DPE stays (L1-65): an exemption or land goes through the team.
  await expect(page.getByLabel("Mon bien n'est pas soumis au DPE")).toHaveCount(0);
  await expect(page.getByLabel("Type de bien").locator("option[value=terrain]")).toHaveCount(0);
  await expectNoSeriousViolation(page);

  // Always complete: without its surface, nothing is saved.
  const surface = page.getByLabel("Surface habitable");
  await surface.fill("");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(surface).toBeFocused();
  await expect(surface).toHaveAccessibleDescription(/À renseigner\./);
  await expect(page).toHaveURL(`${sheet}/modifier/caracteristiques`);
  await surface.fill("114");
  await page.getByLabel("Chambres").fill("4");
  await page.getByRole("button", { name: "Enregistrer" }).click();

  // Back to its page, which says it; still online.
  await expect(page).toHaveURL(sheet);
  await expect(page.locator(":focus")).toHaveText(saved);
  await expect(main.getByText("En ligne", { exact: true })).toBeVisible();
  const characteristics = main.getByRole("region", { name: "Caractéristiques" });
  await expect(fact(characteristics, "Chambres")).toHaveText("4");
  await expect(fact(characteristics, "Surface habitable")).toHaveText(/^114\sm²$/);
  // A reload does not say it again.
  await page.reload();
  await expect(main.getByText(saved)).toHaveCount(0);

  // « Annuler »: nothing changes.
  await main.getByRole("link", { name: "Modifier les caractéristiques" }).click();
  await page.getByLabel("Chambres").fill("2");
  await page.getByRole("link", { name: "Annuler" }).click();
  await expect(page).toHaveURL(sheet);
  await expect(fact(characteristics, "Chambres")).toHaveText("4");

  // The buyers see it at once.
  await page.goto(await publicHref(page));
  await expect(page.getByRole("main")).toContainText(/114\sm²/);
});

test("son prix, son titre et sa description changent, visibles aussitôt", async ({ page }) => {
  await signIn(page, `${sheet}/annonce`);
  const main = page.getByRole("main");
  const href = await publicHref(page);
  await main.getByRole("link", { name: "Modifier l'annonce" }).click();
  await expect(page).toHaveURL(`${sheet}/modifier/annonce`);
  await expect(page).toHaveTitle("Prix et description · Modifier votre bien · Leenkey");
  const price = page.getByLabel("Prix de vente");
  await expect(price).toHaveValue(/^429\s000$/);
  await expectNoSeriousViolation(page);

  // The description stays required once sent.
  const description = page.getByLabel("Description");
  await description.fill("");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(description).toBeFocused();
  await expect(
    page.getByText("Le prix et la description restent nécessaires à votre annonce."),
  ).toBeVisible();

  await price.fill("419 000");
  await page.getByLabel("Titre de l'annonce").fill("Maison familiale avec grand jardin");
  await description.fill(
    "Maison de 1985 sur deux niveaux, au calme, avec un grand jardin et un garage.",
  );
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(`${sheet}/annonce`);
  await expect(page.locator(":focus")).toHaveText(saved);
  const listing = main.getByRole("region", { name: "Annonce" });
  await expect(listing).toContainText("419 000 €");
  await expect(listing).toContainText("Maison familiale avec grand jardin");
  await expect(main.getByText("En ligne", { exact: true })).toBeVisible();
  // The form is not left behind in the history.
  await page.goBack();
  await expect(page).toHaveURL(`${sheet}/annonce`);

  // The same address, the new price and title at once.
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Maison familiale avec grand jardin",
  );
  await expect(page.getByRole("main")).toContainText(/419\s000\s€/);
});

test("une photo ajoutée depuis l'onglet Photos est en ligne aussitôt", async ({
  page,
  browser,
}) => {
  // Sent from memory: Chromium loses a file whose path has an accent (that
  // of the folder of this test, here).
  const file = {
    name: "jardin.jpg",
    mimeType: "image/jpeg",
    buffer: await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "#3c8c50" },
    })
      .jpeg()
      .toBuffer(),
  };
  await signIn(page, `${sheet}/photos`);
  const tab = page.getByRole("main").getByRole("region", { name: "Photos" });
  await expect(tab.getByText(/^Votre annonce reste en ligne/)).toBeVisible();
  const tiles = tab.getByRole("button", { name: /^Photo \d+ sur \d+/ });
  const before = await tiles.count();
  // Through the button, as a seller: it opens the files once the page is
  // ready (hydrated), a file chosen before would be lost.
  let chooser: FileChooser | undefined;
  await expect(async () => {
    const opened = page.waitForEvent("filechooser", { timeout: 1_000 });
    await tab.getByRole("button", { name: "Ajouter des photos" }).click();
    chooser = await opened;
  }).toPass({ timeout: 15_000 });
  await chooser?.setFiles(file);
  // Converted on the server, while the other specs of the project send theirs.
  await expect(tab.getByRole("status")).toHaveText(`Photo ajoutée : ${before + 1} sur 15.`, {
    timeout: 30_000,
  });
  await expect(tiles).toHaveCount(before + 1);
  await expect(tiles.nth(0)).toHaveAccessibleName(/photo principale$/);

  // On its public page, for a visitor: the photo, its file served.
  const href = await publicHref(page);
  const visitor = await browser.newContext();
  const view = await visitor.newPage();
  await view.goto(href);
  const image = view.getByRole("main").locator('img[src*="/img/"]').first();
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await visitor.close();
});

test("l'historique des modifications : chez le vendeur, puis dans le back office (L1-35)", async ({
  page,
  browser,
}) => {
  await signIn(page, `${sheet}/annonce`);
  const history = page
    .getByRole("main")
    .getByRole("region", { name: "Historique des modifications" });
  await expect(
    history.getByText(/^Chaque modification faite depuis la mise en ligne/),
  ).toBeVisible();
  const lines = history.getByRole("listitem");
  // The most recent first: the photo of the test before, then the changes of the listing.
  await expect(lines.first()).toContainText("Photo ajoutée");
  await expect(history).toContainText(/Prix · 429\s000\s€ → 419\s000\s€ \(−2\s%\)/);
  await expect(history).toContainText("Titre · «");
  await expect(history).toContainText("Maison familiale avec grand jardin");
  const texts = history.getByText("Voir l'ancienne et la nouvelle description");
  await texts.click();
  // Before: the text of the seed; after: the one written by the test.
  await expect(
    history.getByText(
      "Maison de 1985 sur deux niveaux, au calme, avec un grand jardin et un garage.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoSeriousViolation(page);

  // The team: told in the bell, the changes on the page of the listing.
  const context = await browser.newContext();
  const admin = await context.newPage();
  await signIn(admin, "/admin/annonces?statut=en-ligne&q=LK-0002", "admin");
  await admin.getByRole("link", { name: "Aperçu de l'annonce LK-0002" }).click();
  await expect(admin).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
  const changes = admin
    .getByRole("main")
    .getByRole("region", { name: "Modifications depuis la mise en ligne" });
  await expect(changes).toContainText(/Prix · 429\s000\s€ → 419\s000\s€/);
  await expect(changes).toContainText("Photo ajoutée");
  await expect(changes).toContainText("Description modifiée");
  await expectNoSeriousViolation(admin);
  await context.close();
});
