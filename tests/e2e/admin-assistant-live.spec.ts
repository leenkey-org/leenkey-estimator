import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// L1-30d (second part): the assistant in the back office (SPEC-V2 17) and
// « Synthèse avant appel » of a case. It imports a file of the FAQ and writes
// in the log of the assistant: project « seed-mutations », local stack only
// (E2E_SEED=1, SEED_PASSWORD, E2E_MUTATE=1, AI_MOCK=1 on the server). Seed:
// the 73 cards of the FAQ, embedded by scripts/local-stack.sh; the case
// 5eed5000-…-0001 (LK-0001).

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

const CASE = "5eed5000-0000-4000-8000-000000000001";

async function signIn(page: Page, path: string, account: "admin" | "seller_a" = "admin") {
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
}

async function expectNoSeriousViolation(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);
}

test("base de connaissances : fiches, recherche test, import d'un fichier", async ({ page }) => {
  test.slow();
  await signIn(page, "/admin/assistant");
  await expect(page.getByRole("heading", { level: 1, name: "Assistant" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Rubriques de l'assistant" }).getByRole("link", {
      name: "Base de connaissances",
    }),
  ).toHaveAttribute("aria-current", "page");
  // The seed: 73 cards, all embedded by scripts/local-stack.sh (more after a first run).
  const summary = page.getByText(/^\d+\u00A0fiches, toutes cherchables par le sens\.$/);
  await expect(summary).toBeVisible();
  const before = Number((await summary.textContent())?.match(/^\d+/)?.[0]);
  expect(before).toBeGreaterThanOrEqual(73);
  await expectNoSeriousViolation(page);

  // The test search: the cards the assistant would read.
  const search = page.getByRole("region", { name: "Recherche test" });
  await search.getByLabel("Question").fill("Combien coûte la formule Accompagné ?");
  await search.getByRole("button", { name: "Chercher" }).click();
  const results = search.getByRole("list", { name: "Fiches trouvées" });
  await expect(results.getByRole("listitem")).toHaveCount(5, { timeout: 60_000 });
  await expect(results.getByRole("listitem").first()).toContainText(/Proximité 0,\d\d/);

  // An import: two cards of a new file (new at each run), searchable once embedded.
  const run = Date.now().toString(36);
  const file = [
    `## Question de test E2E ${run} sur les visites ?`,
    `<!-- audience: buyer | category: Tests E2E ${run} | step_code: -->`,
    "Réponse de test : les visites se réservent sur invitation.",
    "",
    `## Seconde question de test E2E ${run} ?`,
    `<!-- audience: seller | category: Tests E2E ${run} -->`,
    "Seconde réponse de test.",
  ].join("\n");
  const upload = page.getByRole("region", { name: "Importer un fichier" });
  await upload.getByLabel("Fichier .md").setInputFiles({
    name: `FAQ Tests E2E ${run}.md`,
    mimeType: "text/markdown",
    buffer: Buffer.from(file, "utf8"),
  });
  await upload.getByRole("button", { name: "Importer" }).click();
  await expect(
    upload.getByText(`faq-tests-e2e-${run}.md : 2 ajoutées, 0 modifiée`, { exact: false }),
  ).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText(new RegExp(`^${before + 2}\u00A0fiches`))).toBeVisible();
  await expect(page.getByRole("heading", { name: `Tests E2E ${run} · 2` })).toBeVisible();

  // A file without the line of metadata: refused, nothing imported.
  await upload.getByLabel("Fichier .md").setInputFiles({
    name: "faq-cassee.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("## Une question ?\nUne réponse.", "utf8"),
  });
  await upload.getByRole("button", { name: "Importer" }).click();
  await expect(upload.getByText(/La fiche « Une question \? » n'a pas sa ligne/)).toBeVisible();
});

test("synthèse avant appel d'un dossier, puis le journal et la consommation", async ({ page }) => {
  await signIn(page, `/admin/dossiers/${CASE}`);
  const ask = page.getByRole("button", { name: "Synthèse avant appel" });
  await ask.click();
  const summary = page.getByRole("region", { name: "Synthèse avant appel" });
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Situation : synthèse de l'assistant de test");
  await expect(summary).toContainText("n'est pas enregistrée dans le dossier");
  await expectNoSeriousViolation(page);
  await summary.getByRole("button", { name: "Fermer la synthèse" }).click();
  await expect(ask).toBeFocused();

  // The log: the summary is there, in the context of the team.
  await page.goto("/admin/assistant?onglet=journal&contexte=equipe");
  const log = page.getByRole("list", { name: "Conversations de l'assistant" });
  const entry = log.getByRole("link").filter({ hasText: "Synthèse avant appel" }).first();
  await expect(entry).toBeVisible();
  await expectNoSeriousViolation(page);
  await entry.click();
  await expect(page.getByRole("heading", { level: 1, name: "Synthèse avant appel" })).toBeVisible();
  const messages = page.getByRole("list", { name: "Messages de la conversation" });
  await expect(messages).toContainText("Données envoyées au modèle");
  await expect(messages).toContainText(`dossier ${CASE}`);
  await expect(messages).toContainText("Réponse de l'assistant");
  await expectNoSeriousViolation(page);

  // A search in the messages, then the consumption of this environment.
  await page.goto("/admin/assistant?onglet=journal&q=dossier");
  await expect(log.getByRole("link").first()).toBeVisible();
  await page.goto("/admin/assistant?onglet=journal&q=introuvable-xyz-123");
  await expect(page.getByText("Aucune conversation ne correspond.")).toBeVisible();

  await page.goto("/admin/assistant?onglet=consommation");
  await expect(page.getByText(/^Environnement local · Sur les 30 derniers jours$/)).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Consommation de l'assistant par contexte" }),
  ).toContainText("Équipe");
  await expectNoSeriousViolation(page);
});

test("un vendeur n'a ni l'assistant du back office ni la synthèse", async ({ page }) => {
  await signIn(page, "/vendeur", "seller_a");
  const response = await page.goto("/admin/assistant?onglet=journal");
  expect(response?.status()).toBe(404);
});
