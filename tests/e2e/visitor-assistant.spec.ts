import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The assistant of the public site (DECISIONS.md 2026-11-07), on the seed
// with the deterministic model (AI_MOCK=1 on the server and in the run: never
// the real model): « Une question ? » on the home page, a question asked
// without an account, its answer streamed, the steps to go further, the
// conversation kept from page to page; not on the other pages. Only
// conversations of visitors are written (and their counts of the day).

const seeded = process.env.E2E_SEED === "1";
const mocked = process.env.AI_MOCK === "1";

test.skip(!seeded || !mocked, "base et modèle déterministe requis (E2E_SEED=1, AI_MOCK=1)");

/** Opens the panel: a click before the page is hydrated opens nothing, clicked again until it does. */
async function openPanel(page: Page) {
  const panel = page.getByRole("dialog", { name: "Assistant Leenkey" });
  await expect(async () => {
    await page.getByRole("button", { name: "Une question ?" }).click();
    await expect(panel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  return panel;
}

test("une question sans compte, sa réponse, les étapes pour avancer", async ({ page }) => {
  await page.goto("/");
  const panel = await openPanel(page);
  await expect(panel.getByText("je vous aide à choisir la formule adaptée")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Nouvelle conversation" })).toBeDisabled();

  await panel.getByRole("button", { name: "Quelle formule me convient ?" }).click();
  const thread = panel.getByRole("log", { name: "Conversation avec l'assistant Leenkey" });
  await expect(thread.getByText("Quelle formule me convient ?")).toBeVisible();
  await expect(
    thread.getByText("Réponse de test de l'assistant du site à : Quelle formule me convient ?"),
  ).toBeVisible();

  // A question typed, then the steps to go further.
  await panel.getByRole("textbox", { name: "Votre question" }).fill("Comment souscrire ?");
  await panel.getByRole("button", { name: "Envoyer" }).click();
  await expect(
    thread.getByText("Réponse de test de l'assistant du site à : Comment souscrire ?"),
  ).toBeVisible();
  const next = panel.getByRole("navigation", { name: "Pour avancer" });
  await expect(next.getByRole("link", { name: "Valoriser mon bien" })).toHaveAttribute(
    "href",
    "/estimer",
  );
  await expect(next.getByRole("link", { name: "Voir les formules" })).toHaveAttribute(
    "href",
    "/tarifs",
  );
  await expect(next.getByRole("link", { name: "Créer mon compte" })).toHaveAttribute(
    "href",
    "/inscription?role=seller",
  );
  await expect(panel.getByText("sans avis juridique")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(
    results.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
  ).toEqual([]);

  // Kept from page to page in the tab: on /tarifs, the same conversation.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.goto("/tarifs");
  const again = await openPanel(page);
  await expect(again.getByText("Comment souscrire ?", { exact: true })).toBeVisible();
  await again.getByRole("button", { name: "Nouvelle conversation" }).click();
  await expect(again.getByText("Comment souscrire ?", { exact: true })).toHaveCount(0);
  await expect(again.getByRole("button", { name: "Est-ce vraiment gratuit ?" })).toBeVisible();
});

test("le visiteur est reconnu par un cookie posé à sa première question", async ({
  page,
  context,
}) => {
  await page.goto("/faq");
  expect((await context.cookies()).some((cookie) => cookie.name === "lk_visitor")).toBe(false);
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "Est-ce vraiment gratuit ?" }).click();
  await expect(panel.getByText("Réponse de test de l'assistant du site")).toBeVisible();
  const cookie = (await context.cookies()).find((candidate) => candidate.name === "lk_visitor");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.value).toMatch(/^[0-9a-f]{64}$/);
});

test("seulement sur les pages qui le proposent", async ({ page }) => {
  for (const path of ["/concept", "/vendre"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Une question ?" }), path).toBeVisible();
  }
  for (const path of ["/qui-sommes-nous", "/contact", "/acheter", "/cgu"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Une question ?" }), path).toHaveCount(0);
  }
});

test("une question vide ou trop longue n'est pas envoyée", async ({ request }) => {
  const empty = await request.post("/api/ai/visitor", { data: { message: "   " } });
  expect(empty.status()).toBe(400);
  const long = await request.post("/api/ai/visitor", { data: { message: "a".repeat(501) } });
  expect(long.status()).toBe(400);
  const other = await request.post("/api/ai/visitor", {
    data: { message: "Bonjour", context: "admin" },
  });
  expect(other.status()).toBe(400);
});
