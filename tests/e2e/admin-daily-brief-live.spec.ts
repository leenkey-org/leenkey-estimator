import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-30b: « Résumé du jour » of the dashboard of the back office (SPEC-V2
// 17). It writes a brief and its log: project « seed-mutations », local
// stack only (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1 on the
// server). The brief may already have been written by another spec that
// opened the dashboard within the hour: the same text of the model of the
// tests either way.

const seeded = process.env.E2E_SEED === "1";
const SEED_PASSWORD = process.env.SEED_PASSWORD;
const mutate = process.env.E2E_MUTATE === "1";
const localStack = ["localhost", "127.0.0.1"].includes(
  new URL(process.env.BASE_URL ?? "http://localhost:3100").hostname,
);

test.skip(
  !seeded || !SEED_PASSWORD || !mutate || !localStack,
  "pile locale de seed requise (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1)",
);
test.describe.configure({ mode: "serial" });

/** The text of the model of the tests (leenkey/ai/mock.ts, MOCK_DAILY_BRIEF). */
const MOCK_BRIEF = "Résumé de l'assistant de test, d'après les chiffres du tableau de bord.";

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
      .catch(() => {});
    if (new URL(page.url()).pathname === "/conditions") await page.goto(path);
  }
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("résumé du jour : écrit à l'ouverture, gardé, régénéré, journalisé", async ({ page }) => {
  await signIn(page, "/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeVisible();
  // The figures of the dashboard never wait for the brief.
  await expect(page.getByRole("list", { name: "Chiffres du back office" })).toBeVisible();

  const brief = page.getByRole("region", { name: "Résumé du jour" });
  await expect(brief).toContainText(MOCK_BRIEF);
  await expect(brief).toContainText(/Écrit à \d+\s?h(\s?\d{2})? par l'assistant/);
  await expect(brief).toContainText("Les chiffres du tableau de bord font foi.");
  await expectNoSeriousViolation(page);

  // Kept: shown with the page, without asking the model again.
  await page.reload();
  await expect(brief).toContainText(MOCK_BRIEF);
  await expect(brief).not.toHaveAttribute("aria-busy", "true");

  // « Régénérer »: a new brief, unless the last is less than 5 minutes old;
  // asked again at once, it is: the last one, said so.
  const regenerate = brief.getByRole("button", { name: "Régénérer" });
  await regenerate.click();
  await expect(regenerate).toBeVisible();
  await expect(brief).toContainText(MOCK_BRIEF);
  await regenerate.click();
  await expect(brief).toContainText("vous pourrez le régénérer dans quelques minutes");
  await expect(brief).toContainText(MOCK_BRIEF);

  // On a phone, under the greeting, before the figures.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(brief).toBeVisible();
  const box = await brief.boundingBox();
  expect(box?.width ?? 0).toBeLessThanOrEqual(390);
  await expectNoSeriousViolation(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  // The log: the brief, in the context of the team, with the figures sent to the model.
  await page.goto("/admin/assistant?onglet=journal&contexte=equipe");
  const entry = page
    .getByRole("list", { name: "Conversations de l'assistant" })
    .getByRole("link")
    .filter({ hasText: "Résumé du jour" })
    .first();
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page.getByRole("heading", { level: 1, name: "Résumé du jour" })).toBeVisible();
  const messages = page.getByRole("list", { name: "Messages de la conversation" });
  await expect(messages).toContainText("Annonces à valider :");
  await expect(messages).toContainText("Réponse de l'assistant");
});
