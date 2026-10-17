import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-19: back office of the listings, on the seed (E2E_SEED=1 with
// SEED_PASSWORD). The decisions change the seed for good (a published
// listing does not go back to pending): run this file on a stack just made by
// `scripts/local-stack.sh up`. Seed listings used here only: LK-0015 and
// LK-0007 (pending), LK-0014 (published, the oldest, out of the first search
// results), LK-0006 (pending, read only).

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;

test.skip(!seeded || !SEED_PASSWORD, "comptes de seed requis (E2E_SEED=1 et SEED_PASSWORD)");
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

const feedback = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });

test.describe("bureau", () => {
  test.beforeEach(({ isMobile }) => {
    test.skip(isMobile, "décisions testées une fois, en desktop");
  });

  test("valider et publier une annonce en attente", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=a-valider");
    await expect(page.getByRole("heading", { level: 1, name: "Annonces" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^En attente de validation · \d+$/ }),
    ).toHaveAttribute("aria-current", "page");
    expect((await page.request.get(PUBLIC["LK-0015"])).status()).toBe(404);

    await expect(row(page, "LK-0015")).toHaveCount(1);
    await decisions(page, "LK-0015").getByRole("button", { name: "Valider et publier" }).click();
    await expect(feedback(page, "Annonce publiée.")).toBeVisible();
    // Local stack, no RESEND_API_KEY: the email is only written to the log.
    await expect(feedback(page, "Email non envoyé : environnement local.")).toBeVisible();
    // The listing leaves the pending list, and is online.
    await expect(row(page, "LK-0015")).toHaveCount(0);
    expect((await page.request.get(PUBLIC["LK-0015"])).status()).toBe(200);
  });

  test("refuser avec motif : le motif est obligatoire", async ({ page }) => {
    await signIn(page, "/admin/annonces?statut=a-valider");
    await decisions(page, "LK-0007").getByRole("button", { name: "Refuser avec motif" }).click();
    const dialog = page.getByRole("dialog", { name: "Refuser l'annonce" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Refuser l'annonce" }).click();
    await expect(dialog.getByText("Le motif doit faire au moins 3 caractères.")).toBeVisible();

    const template = dialog.getByRole("button", { name: /^La description est incomplète/ });
    await template.click();
    await expect(template).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByLabel("Motif envoyé au vendeur")).toHaveValue(
      /^La description est incomplète/,
    );
    await dialog.getByRole("button", { name: "Refuser l'annonce" }).click();
    await expect(dialog).toBeHidden();
    await expect(feedback(page, "Annonce refusée.")).toBeVisible();

    await page.goto("/admin/annonces?statut=a-corriger&q=LK-0007");
    await row(page, "LK-0007").getByRole("link", { name: "Aperçu de l'annonce LK-0007" }).click();
    await expect(page).toHaveURL(/\/admin\/annonces\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("main").getByText("À corriger", { exact: true })).toBeVisible();
    await expect(page.getByText("Motif du refus")).toBeVisible();
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
    await dialog
      .getByLabel("Motif envoyé au vendeur")
      .fill("Vérification d'un signalement (test E2E).");
    await dialog.getByRole("button", { name: "Suspendre l'annonce" }).click();
    await expect(feedback(page, "Annonce suspendue.")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Suspendue par Leenkey", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Vérification d'un signalement (test E2E).").first()).toBeVisible();
    expect((await page.request.get(PUBLIC["LK-0014"])).status()).toBe(404);

    await decisions(page, "LK-0014").getByRole("button", { name: "Remettre en ligne" }).click();
    await expect(feedback(page, "Annonce remise en ligne.")).toBeVisible();
    await expect(page.getByRole("main").getByText("En ligne", { exact: true })).toBeVisible();
    expect((await page.request.get(PUBLIC["LK-0014"])).status()).toBe(200);
    const history = page.getByRole("list").filter({ hasText: "Remise en ligne" });
    await expect(history).toContainText("Suspendue");
    await expect(history).toContainText("par Cédric");
  });

  test("recherche par ville, référence ou vendeur ; aucune violation d'accessibilité @a11y", async ({
    page,
  }) => {
    await signIn(page, "/admin/annonces?q=Villiers-sur-Orge");
    await expect(row(page, "LK-0006")).toHaveCount(1);
    await expect(page.getByRole("table", { name: "Annonces" }).locator("tbody")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Rechercher une annonce" }).fill("introuvable-xyz");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(
      page.getByText("Aucune annonce ne correspond à « introuvable-xyz »."),
    ).toBeVisible();

    await page.goto("/admin/annonces");
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
    ).toEqual([]);
  });
});

test("mobile : cartes d'annonce, filtres et motif annulable", async ({ page, isMobile }) => {
  test.skip(!isMobile, "cartes sous 1024 px");
  await signIn(page, "/admin/annonces?statut=a-valider");
  const cards = page.getByRole("list", { name: "Annonces" });
  await expect(cards).toBeVisible();
  const card = cards.getByRole("listitem").filter({ hasText: "LK-0006" });
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: "Refuser", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Refuser l'annonce" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).first().click();
  await expect(dialog).toBeHidden();
  await expect(card.getByText("En attente de validation")).toBeVisible();
});
