import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";

// L1-19: back office of the listings, on the seed. The decisions change the
// seed for good (a published listing does not go back to pending, db:seed
// does not put the statuses back): this file runs only on a local stack just
// made by `scripts/local-stack.sh up`, with E2E_SEED=1, SEED_PASSWORD and
// E2E_MUTATE=1, never on the preprod. Project « seed-mutations » of
// playwright.config.ts, after the other specs. Seed listings used here only:
// LK-0015 and LK-0007 (pending), LK-0014 (published, the oldest, out of the
// first search results), LK-0006 (pending, read only).

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
test.describe.configure({ mode: "serial" });

const PUBLIC = {
  "LK-0015": "/annonce/appartement-2-pieces-villemoisson-sur-orge-lk0015",
  "LK-0014": "/annonce/maison-4-pieces-la-ville-du-bois-lk0014",
} as const;

/** Signs the admin in and lands on `path` (terms gate as in navigation.spec.ts). */
async function signIn(page: Page, path: string) {
  await page.goto(`/connexion?next=${encodeURIComponent(path)}`);
  await page.getByLabel("Email").fill("admin@test.leenkey.fr");
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

/** Row of a listing in the desktop table (data row and its actions). */
const row = (page: Page, reference: string) =>
  page.getByRole("table", { name: "Annonces" }).locator("tbody").filter({ hasText: reference });

const decisions = (page: Page, reference: string) =>
  page.getByRole("group", { name: `Décisions sur l'annonce ${reference}` });

/** The outcome of a decision, at the top of the page. */
const feedback = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });

// Local stack: no RESEND_API_KEY, or one with EMAIL_TEST_INBOX (.env.local).
const EMAIL_NOTE = /Email non envoyé : environnement local\.|Email envoyé à la boîte de test/;

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test.describe("bureau", () => {
  test("valider et publier une annonce en attente", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=a-valider");
    await expect(page.getByRole("heading", { level: 1, name: "Annonces" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^En attente de validation · \d+$/ }),
    ).toHaveAttribute("aria-current", "page");
    expect((await page.request.get(PUBLIC["LK-0015"])).status()).toBe(404);

    await expect(row(page, "LK-0015")).toHaveCount(1);
    await decisions(page, "LK-0015").getByRole("button", { name: "Valider et publier" }).click();
    const outcome = feedback(page, "Annonce publiée.");
    await expect(outcome).toBeVisible();
    await expect(outcome).toContainText(EMAIL_NOTE);
    // The row has left the pending list with its button: the outcome has the focus.
    await expect(outcome).toBeFocused();
    await expect(row(page, "LK-0015")).toHaveCount(0);
    expect((await page.request.get(PUBLIC["LK-0015"])).status()).toBe(200);
  });

  test("refuser avec motif : le motif est obligatoire", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=a-valider");
    const open = decisions(page, "LK-0007").getByRole("button", { name: "Refuser avec motif" });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Refuser l'annonce" });
    await expect(dialog).toBeVisible();
    await expectNoSeriousViolation(page);
    const field = dialog.getByLabel("Motif envoyé au vendeur");
    await dialog.getByRole("button", { name: "Refuser l'annonce" }).click();
    await expect(dialog.getByText("Le motif doit faire au moins 3 caractères.")).toBeVisible();
    await expect(field).toBeFocused();
    // Two emojis: four units for JavaScript, two characters for Postgres.
    await field.fill("🙂🙂");
    await dialog.getByRole("button", { name: "Refuser l'annonce" }).click();
    await expect(dialog.getByText("Le motif doit faire au moins 3 caractères.")).toBeVisible();

    // Closed without a decision: the focus goes back to the button.
    await dialog.getByRole("button", { name: "Fermer" }).click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();

    // Opened again: nothing left from before.
    await open.click();
    await expect(field).toHaveValue("");
    const template = dialog.getByRole("button", { name: /^La description est incomplète/ });
    await template.click();
    await expect(template).toHaveAttribute("aria-pressed", "true");
    await expect(field).toHaveValue(/^La description est incomplète/);
    await field.press("End");
    await field.pressSequentially("\nAjoutez aussi des photos.");
    await dialog.getByRole("button", { name: "Refuser l'annonce" }).click();
    await expect(dialog).toBeHidden();
    const outcome = feedback(page, "Annonce refusée.");
    await expect(outcome).toBeVisible();
    await expect(outcome).toBeFocused();

    await page.goto("/admin/annonces?statut=a-corriger&q=LK-0007");
    await row(page, "LK-0007").getByRole("link", { name: "Aperçu de l'annonce LK-0007" }).click();
    await expect(page).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("main").getByText("À corriger", { exact: true })).toBeVisible();
    await expect(page.getByText("Motif du refus")).toBeVisible();
    // The line break of the motive is kept.
    const motive = page.getByText(/^La description est incomplète/).first();
    await expect(motive).toHaveCSS("white-space", "pre-line");
    await expect(page.getByRole("list").filter({ hasText: "Refusée" })).toContainText(
      "Motif : La description est incomplète",
    );
  });

  test("suspendre une annonce en ligne, puis la remettre en ligne", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=en-ligne&q=LK-0014");
    await row(page, "LK-0014").getByRole("link", { name: "Aperçu de l'annonce LK-0014" }).click();
    await expect(page).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("main").getByText("En ligne", { exact: true })).toBeVisible();

    await decisions(page, "LK-0014").getByRole("button", { name: "Suspendre" }).click();
    const dialog = page.getByRole("dialog", { name: "Suspendre l'annonce" });
    const field = dialog.getByLabel("Motif envoyé au vendeur");
    await field.fill("Vérification d'un signalement (test E2E).");
    await dialog.getByRole("button", { name: "Suspendre l'annonce" }).click();
    await expect(feedback(page, "Annonce suspendue.")).toBeFocused();
    await expect(
      page.getByRole("main").getByText("Suspendue par Leenkey", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Vérification d'un signalement (test E2E).").first()).toBeVisible();
    expect((await page.request.get(PUBLIC["LK-0014"])).status()).toBe(404);

    await decisions(page, "LK-0014").getByRole("button", { name: "Remettre en ligne" }).click();
    await expect(feedback(page, "Annonce remise en ligne.")).toBeFocused();
    await expect(page.getByRole("main").getByText("En ligne", { exact: true })).toBeVisible();
    expect((await page.request.get(PUBLIC["LK-0014"])).status()).toBe(200);
    const history = page.getByRole("list").filter({ hasText: "Remise en ligne" });
    await expect(history).toContainText("Suspendue");
    await expect(history).toContainText("par Cédric");

    // A new suspension starts from an empty motive.
    await decisions(page, "LK-0014").getByRole("button", { name: "Suspendre" }).click();
    await expect(field).toHaveValue("");
    await expect(dialog.getByRole("button", { pressed: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      decisions(page, "LK-0014").getByRole("button", { name: "Suspendre" }),
    ).toBeFocused();
  });

  // Not tagged @a11y: npm run a11y would also run every test of the projects
  // this one depends on (playwright.config.ts).
  test("recherche par ville, référence ou vendeur ; aucune violation d'accessibilité", async ({
    page,
  }) => {
    await signIn(page, "/admin/annonces?q=Villiers-sur-Orge");
    await expect(row(page, "LK-0006")).toHaveCount(1);
    await expect(page.getByRole("table", { name: "Annonces" }).locator("tbody")).toHaveCount(1);
    const search = page.getByRole("searchbox", { name: "Rechercher une annonce" });
    await search.fill("introuvable-xyz");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(
      page.getByText("Aucune annonce ne correspond à « introuvable-xyz »."),
    ).toBeVisible();
    // Back to every listing: the field no longer shows the old search.
    await page.getByRole("link", { name: "Voir toutes les annonces" }).click();
    await expect(page).toHaveURL("/admin/annonces");
    await expect(search).toHaveValue("");

    await expectNoSeriousViolation(page);
  });
});

test.describe("téléphone", () => {
  const phone = devices["Pixel 7"];
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent: phone.userAgent,
    deviceScaleFactor: phone.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });

  test("cartes d'annonce, motif en plein écran annulable, fiche titrée", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=a-valider");
    const cards = page.getByRole("list", { name: "Annonces" });
    await expect(cards).toBeVisible();
    const card = cards.getByRole("listitem").filter({ hasText: "LK-0006" });
    await expect(card).toHaveCount(1);
    await expectNoSeriousViolation(page);

    const open = card.getByRole("button", { name: "Refuser", exact: true });
    await open.click();
    const dialog = page.getByRole("dialog", { name: "Refuser l'annonce" });
    await expect(dialog).toBeVisible();
    // A full screen with a back header (DESIGN.md 10.8).
    const box = await dialog.boundingBox();
    expect(box?.width).toBe(390);
    await dialog.getByRole("button", { name: "Retour" }).click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
    await open.click();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(card.getByText("En attente de validation")).toBeVisible();

    // The page of a listing gives its title, the mobile header gives the section.
    await card.getByRole("link", { name: "Aperçu de l'annonce LK-0006" }).click();
    await expect(page).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Annonces");
  });
});
